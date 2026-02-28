use crate::db::{
    schema::{create_dataset_table, infer_type, sanitize_col_name, ColDef},
    DbState,
};
use calamine::{open_workbook, Data, Reader, Xlsx};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct DatasetInfo {
    pub id: i64,
    pub name: String,
    pub file_origin: String,
    pub table_name: String,
    pub row_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngestProgress {
    pub pct: u8,
    pub rows_done: usize,
}

fn to_table_name(name: &str, id_hint: &str) -> String {
    let base: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_lowercase().next().unwrap() } else { '_' })
        .collect();
    format!("ds_{}_{}", base, id_hint)
}

fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) | Data::DateTimeIso(s) | Data::DurationIso(s) => s.clone(),
        Data::Float(f) => f.to_string(),
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::Error(e) => format!("{e:?}"),
        Data::DateTime(f) => f.to_string(),
    }
}

#[tauri::command]
pub async fn ingest_file(
    path: String,
    dataset_name: String,
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<DatasetInfo, String> {
    let path_for_thread = path.clone();

    // Parse spreadsheet on a blocking thread
    let (headers, data_rows): (Vec<String>, Vec<Vec<String>>) =
        tokio::task::spawn_blocking(move || -> Result<(Vec<String>, Vec<Vec<String>>), String> {
            let mut workbook: Xlsx<_> = open_workbook(&path_for_thread)
                .map_err(|e| format!("Failed to open file: {e}"))?;
            let sheet_name = workbook
                .sheet_names()
                .first()
                .cloned()
                .ok_or("No sheets found")?;
            let range = workbook
                .worksheet_range(&sheet_name)
                .map_err(|e| format!("Failed to read sheet: {e}"))?;

            let mut rows = range.rows();
            let headers_raw: Vec<String> = rows
                .next()
                .ok_or("Sheet is empty")?
                .iter()
                .map(|c| cell_to_string(c).trim().to_string())
                .collect();

            // Preserve column positions: generate placeholder names for empty headers
            let headers: Vec<String> = headers_raw
                .iter()
                .enumerate()
                .map(|(i, h)| {
                    if h.is_empty() {
                        format!("column_{}", i + 1) // "column_1", "column_2", etc.
                    } else {
                        h.clone()
                    }
                })
                .collect();

            // Find max columns across all rows to handle sparse data
            let max_cols = headers.len();
            let data_rows: Vec<Vec<String>> = rows
                .map(|row| {
                    let cells: Vec<String> = row.iter().map(|c| {
                        let s = cell_to_string(c);
                        // Debug: log non-empty cells that become empty
                        if !matches!(c, Data::Empty) && s.is_empty() {
                            eprintln!("DEBUG: Non-empty cell {:?} became empty string", c);
                        }
                        s
                    }).collect();
                    // Pad with empty strings if row is shorter, truncate if longer
                    let mut result = cells;
                    while result.len() < max_cols {
                        result.push(String::new());
                    }
                    if result.len() > max_cols {
                        result.truncate(max_cols);
                    }
                    result
                })
                .collect();

            // Debug: log first few rows with their headers
            eprintln!("DEBUG: Headers ({:?}): {:?}", headers.len(), headers);
            for (i, row) in data_rows.iter().take(3).enumerate() {
                eprintln!("DEBUG: Row {}: {:?} (len={})", i, row, row.len());
            }

            Ok((headers, data_rows))
        })
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

    let total_rows = data_rows.len();

    // Infer column types from first 50 rows
    let col_defs: Vec<ColDef> = headers
        .iter()
        .enumerate()
        .map(|(i, name)| {
            let sample: String = data_rows
                .iter()
                .take(50)
                .find_map(|r: &Vec<String>| {
                    r.get(i).filter(|v: &&String| !v.is_empty()).cloned()
                })
                .unwrap_or_default();
            ColDef {
                name: name.clone(),
                col_type: infer_type(&sample).to_string(),
            }
        })
        .collect();

    let timestamp = Utc::now().to_rfc3339();
    let table_name_hint = &timestamp[..10].replace('-', "");
    let table_name = to_table_name(&dataset_name, table_name_hint);

    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Insert dataset metadata
    conn.execute(
        "INSERT INTO datasets (name, file_origin, table_name, row_count, created_at) VALUES (?1, ?2, ?3, 0, ?4)",
        params![dataset_name, path, table_name, timestamp],
    )
    .map_err(|e| format!("DB insert error: {e}"))?;
    let dataset_id = conn.last_insert_rowid();

    // Create the flat relational table
    create_dataset_table(&conn, &table_name, &col_defs)
        .map_err(|e| format!("Schema error: {e}"))?;

    // Insert column metadata - store sanitized name as key, original as display_name
    for (i, col) in col_defs.iter().enumerate() {
        let sanitized_name = sanitize_col_name(&col.name);
        conn.execute(
            "INSERT INTO columns (dataset_id, name, col_type, display_order, display_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![dataset_id, sanitized_name, col.col_type, i as i64, col.name],
        )
        .map_err(|e| format!("Column meta error: {e}"))?;
    }

    // Batch insert rows
    let batch_size = 1000;
    let col_names_sql: Vec<String> = col_defs
        .iter()
        .map(|c| format!("\"{}\"", sanitize_col_name(&c.name)))
        .collect();
    let placeholders: Vec<String> = (1..=col_names_sql.len()).map(|i| format!("?{i}")).collect();
    let insert_sql = format!(
        "INSERT INTO \"{}\" ({}) VALUES ({})",
        sanitize_col_name(&table_name),
        col_names_sql.join(", "),
        placeholders.join(", ")
    );

    eprintln!("DEBUG: Insert SQL: {}", insert_sql);
    eprintln!("DEBUG: Column count: {}", col_names_sql.len());

    let mut rows_done: usize = 0;
    for chunk in data_rows.chunks(batch_size) {
        let tx = conn
            .unchecked_transaction()
            .map_err(|e| format!("Transaction error: {e}"))?;
        {
            let mut stmt = tx
                .prepare(&insert_sql)
                .map_err(|e| format!("Prepare error: {e}"))?;
            for (row_idx, row) in chunk.iter().enumerate() {
                let values: Vec<&str> = row.iter().map(|v: &String| v.as_str()).collect();
                if rows_done + row_idx < 3 {
                    eprintln!("DEBUG: Inserting row {}: {:?} (len={})", rows_done + row_idx, values, values.len());
                }
                stmt.execute(rusqlite::params_from_iter(values.iter()))
                    .map_err(|e| format!("Insert error: {e}"))?;
            }
        }
        tx.commit().map_err(|e| format!("Commit error: {e}"))?;

        rows_done += chunk.len();
        let pct = ((rows_done as f64 / total_rows.max(1) as f64) * 100.0) as u8;
        app.emit("ingest_progress", IngestProgress { pct, rows_done }).ok();
    }

    // Update row count
    conn.execute(
        "UPDATE datasets SET row_count = ?1 WHERE id = ?2",
        params![total_rows as i64, dataset_id],
    )
    .map_err(|e| format!("Update row count error: {e}"))?;

    // DEBUG: Verify first row was stored correctly
    let verify_sql = format!("SELECT * FROM \"{}\" LIMIT 1", sanitize_col_name(&table_name));
    let mut verify_stmt = conn.prepare(&verify_sql).map_err(|e| format!("Verify error: {e}"))?;
    verify_stmt.query_row([], |row| {
        let col_count = row.as_ref().column_count();
        eprintln!("DEBUG: Verified row from DB has {} columns", col_count);
        for i in 0..col_count.min(5) {
            let val: rusqlite::types::Value = row.get(i)?;
            eprintln!("DEBUG: Column {} = {:?}", i, val);
        }
        Ok(())
    }).ok();

    // Track analytics event for dataset import
    let _ = conn.execute(
        "INSERT INTO analytics_events (event_type, metadata) VALUES ('dataset_import', ?1)",
        params![format!("{{\"dataset_id\": {}, \"row_count\": {}}}", dataset_id, total_rows)],
    );

    Ok(DatasetInfo {
        id: dataset_id,
        name: dataset_name,
        file_origin: path,
        table_name,
        row_count: total_rows as i64,
        created_at: timestamp,
    })
}
