use serde::Serialize;
use tauri::State;
use rusqlite::params;
use crate::db::DbState;

#[derive(Debug, Serialize)]
pub struct CalculatedField {
    pub id: i64,
    pub name: String,
    pub formula_sql: String,
}

#[tauri::command]
pub fn save_formula(
    dataset_id: i64,
    name: String,
    formula_sql: String,
    state: State<DbState>,
) -> Result<CalculatedField, String> {
    let conn = state.0.lock().map_err(|_| "DB lock error")?;

    conn.execute(
        "INSERT INTO calculated_fields (dataset_id, name, formula_sql) VALUES (?1, ?2, ?3)",
        params![dataset_id, name, formula_sql],
    )
    .map_err(|e| format!("Failed to save formula: {}", e))?;

    let id = conn.last_insert_rowid();

    Ok(CalculatedField {
        id,
        name,
        formula_sql,
    })
}

#[tauri::command]
pub fn list_formulas(
    dataset_id: i64,
    state: State<DbState>,
) -> Result<Vec<CalculatedField>, String> {
    let conn = state.0.lock().map_err(|_| "DB lock error")?;

    let mut stmt = conn
        .prepare("SELECT id, name, formula_sql FROM calculated_fields WHERE dataset_id = ?1")
        .map_err(|e| format!("Query failed: {}", e))?;

    let formulas = stmt
        .query_map(params![dataset_id], |row| {
            Ok(CalculatedField {
                id: row.get(0)?,
                name: row.get(1)?,
                formula_sql: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to parse formulas: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect formulas: {}", e))?;

    Ok(formulas)
}

#[tauri::command]
pub fn delete_formula(
    formula_id: i64,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "DB lock error")?;

    conn.execute("DELETE FROM calculated_fields WHERE id = ?1", params![formula_id])
        .map_err(|e| format!("Failed to delete formula: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn test_formula(
    dataset_id: i64,
    formula_sql: String,
    state: State<DbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|_| "DB lock error")?;

    // Get dataset table name
    let table_name: String = conn
        .query_row(
            "SELECT table_name FROM datasets WHERE id = ?1",
            params![dataset_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Dataset not found: {}", e))?;

    // Build the query with formula as a calculated column
    let sql = format!(
        "SELECT *, ({}) AS calculated_result FROM {} LIMIT 100",
        formula_sql, table_name
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Query preparation failed: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            let mut obj = serde_json::Map::new();
            for (i, col) in row.as_ref().column_names().iter().enumerate() {
                let value: Option<String> = row.get(i).ok();
                obj.insert(col.to_string(), serde_json::json!(value.unwrap_or_else(|| "NULL".to_string())));
            }
            serde_json::to_value(obj).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
        })
        .map_err(|e| format!("Query execution failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Result collection failed: {}", e))?;

    Ok(results)
}
