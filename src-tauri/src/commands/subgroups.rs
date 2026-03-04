use crate::db::DbState;
use calamine::{open_workbook, Data, Reader, Xlsx};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Subgroup {
    pub cod: String,
    pub denumire: String,
    pub grupa: String,
    pub subgrupa: String,
}

/// Input for creating/updating a subgroup
#[derive(Debug, Serialize, Deserialize)]
pub struct SubgroupInput {
    pub cod: String,
    pub denumire: String,
    pub grupa: String,
    pub subgrupa: String,
}

#[tauri::command]
pub fn insert_subgroups(data: Vec<Subgroup>, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Begin transaction for bulk insert
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // Clear existing data
    tx.execute("DELETE FROM subgroups", [])
        .map_err(|e| e.to_string())?;

    // Insert new data
    for item in data {
        tx.execute(
            "INSERT INTO subgroups (cod, denumire, grupa, subgrupa) VALUES (?1, ?2, ?3, ?4)",
            params![&item.cod, &item.denumire, &item.grupa, &item.subgrupa],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_subgroups(
    page: i64,
    page_size: i64,
    search: Option<String>,
    db: State<'_, DbState>,
) -> Result<SubgroupsResult, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    let (rows, total) = if let Some(query) = search {
        if query.trim().is_empty() {
            // Empty search - return all
            let total: i64 = conn
                .query_row("SELECT COUNT(*) FROM subgroups", [], |r| r.get(0))
                .map_err(|e| e.to_string())?;

            let offset = page * page_size;
            let mut stmt = conn
                .prepare("SELECT cod, denumire, grupa, subgrupa FROM subgroups LIMIT ?1 OFFSET ?2")
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map(params![page_size, offset], |row| {
                    Ok(Subgroup {
                        cod: row.get(0)?,
                        denumire: row.get(1)?,
                        grupa: row.get(2)?,
                        subgrupa: row.get(3)?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            (rows, total)
        } else {
            // Search with query
            let search_pattern = format!("%{}%", query);

            let total: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM subgroups WHERE cod LIKE ?1 OR denumire LIKE ?1 OR grupa LIKE ?1 OR subgrupa LIKE ?1",
                    params![search_pattern],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;

            let offset = page * page_size;
            let mut stmt = conn
                .prepare(
                    "SELECT cod, denumire, grupa, subgrupa FROM subgroups
                     WHERE cod LIKE ?1 OR denumire LIKE ?1 OR grupa LIKE ?1 OR subgrupa LIKE ?1
                     LIMIT ?2 OFFSET ?3"
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map(params![search_pattern, page_size, offset], |row| {
                    Ok(Subgroup {
                        cod: row.get(0)?,
                        denumire: row.get(1)?,
                        grupa: row.get(2)?,
                        subgrupa: row.get(3)?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            (rows, total)
        }
    } else {
        // No search - return all
        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM subgroups", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;

        let offset = page * page_size;
        let mut stmt = conn
            .prepare("SELECT cod, denumire, grupa, subgrupa FROM subgroups LIMIT ?1 OFFSET ?2")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![page_size, offset], |row| {
                Ok(Subgroup {
                    cod: row.get(0)?,
                    denumire: row.get(1)?,
                    grupa: row.get(2)?,
                    subgrupa: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        (rows, total)
    };

    Ok(SubgroupsResult { rows, total, page, page_size })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubgroupsResult {
    pub rows: Vec<Subgroup>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[tauri::command]
pub fn search_subgroups(
    query: String,
    db: State<'_, DbState>,
) -> Result<Vec<Subgroup>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    let search_pattern = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "SELECT cod, denumire, grupa, subgrupa FROM subgroups
             WHERE cod LIKE ?1 OR denumire LIKE ?1 OR grupa LIKE ?1 OR subgrupa LIKE ?1
             ORDER BY denumire LIMIT 100"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![search_pattern], |row| {
            Ok(Subgroup {
                cod: row.get(0)?,
                denumire: row.get(1)?,
                grupa: row.get(2)?,
                subgrupa: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn get_subgroups_by_grupa(grupa: String, db: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT subgrupa FROM subgroups WHERE grupa = ?1 ORDER BY subgrupa"
        )
        .map_err(|e| e.to_string())?;

    let subgrupe = stmt
        .query_map(params![grupa], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(subgrupe)
}

#[tauri::command]
pub fn get_grupe(db: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    let mut stmt = conn
        .prepare("SELECT DISTINCT grupa FROM subgroups ORDER BY grupa")
        .map_err(|e| e.to_string())?;

    let grupe = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(grupe)
}

/// Seeds the subgroups table with initial data
#[tauri::command]
pub fn seed_subgroups(db: State<'_, DbState>) -> Result<usize, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // Clear existing data
    tx.execute("DELETE FROM subgroups", [])
        .map_err(|e| e.to_string())?;

    let data = include_str!("../../subgroups_data.txt");

    let mut count = 0;
    for line in data.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 4 {
            tx.execute(
                "INSERT INTO subgroups (cod, denumire, grupa, subgrupa) VALUES (?1, ?2, ?3, ?4)",
                params![parts[0], parts[1], parts[2], parts[3]],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

/// Create a new subgroup
#[tauri::command]
pub fn create_subgroup(input: SubgroupInput, db: State<'_, DbState>) -> Result<Subgroup, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Check if cod already exists
    let existing: Result<i64, _> = conn.query_row(
        "SELECT COUNT(*) FROM subgroups WHERE cod = ?1",
        params![&input.cod],
        |r| r.get(0),
    );

    if let Ok(count) = existing {
        if count > 0 {
            return Err(format!("Subgroup with cod '{}' already exists", input.cod));
        }
    }

    // Insert the new subgroup
    conn.execute(
        "INSERT INTO subgroups (cod, denumire, grupa, subgrupa) VALUES (?1, ?2, ?3, ?4)",
        params![&input.cod, &input.denumire, &input.grupa, &input.subgrupa],
    )
    .map_err(|e| e.to_string())?;

    Ok(Subgroup {
        cod: input.cod,
        denumire: input.denumire,
        grupa: input.grupa,
        subgrupa: input.subgrupa,
    })
}

/// Update an existing subgroup by cod
#[tauri::command]
pub fn update_subgroup(cod: String, input: SubgroupInput, db: State<'_, DbState>) -> Result<Subgroup, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Check if subgroup exists
    let existing: Result<i64, _> = conn.query_row(
        "SELECT COUNT(*) FROM subgroups WHERE cod = ?1",
        params![&cod],
        |r| r.get(0),
    );

    if let Ok(count) = existing {
        if count == 0 {
            return Err(format!("Subgroup with cod '{}' not found", cod));
        }
    }

    // If cod is being changed, check if new cod already exists
    if input.cod != cod {
        let new_cod_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM subgroups WHERE cod = ?1",
            params![&input.cod],
            |r| r.get(0),
        );

        if let Ok(count) = new_cod_exists {
            if count > 0 {
                return Err(format!("Subgroup with cod '{}' already exists", input.cod));
            }
        }
    }

    // Update the subgroup
    conn.execute(
        "UPDATE subgroups SET cod = ?1, denumire = ?2, grupa = ?3, subgrupa = ?4 WHERE cod = ?5",
        params![&input.cod, &input.denumire, &input.grupa, &input.subgrupa, &cod],
    )
    .map_err(|e| e.to_string())?;

    Ok(Subgroup {
        cod: input.cod,
        denumire: input.denumire,
        grupa: input.grupa,
        subgrupa: input.subgrupa,
    })
}

/// Delete a subgroup by cod
#[tauri::command]
pub fn delete_subgroup(cod: String, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;

    // Check if subgroup exists
    let existing: Result<i64, _> = conn.query_row(
        "SELECT COUNT(*) FROM subgroups WHERE cod = ?1",
        params![&cod],
        |r| r.get(0),
    );

    if let Ok(count) = existing {
        if count == 0 {
            return Err(format!("Subgroup with cod '{}' not found", cod));
        }
    }

    // Delete the subgroup
    conn.execute("DELETE FROM subgroups WHERE cod = ?1", params![&cod])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Import subgroups from an Excel file
#[tauri::command]
pub fn import_subgroups_from_excel(path: String, db: State<'_, DbState>) -> Result<usize, String> {
    // Validate file path
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Open the workbook
    let mut workbook: Xlsx<_> = open_workbook(&path)
        .map_err(|e| format!("Failed to open workbook: {}", e))?;

    // Get the first worksheet
    let sheet_name = workbook.sheet_names().first()
        .ok_or("Workbook has no sheets")?
        .clone();
    let range = workbook.worksheet_range(&sheet_name)
        .map_err(|e| format!("Failed to read sheet '{}': {}", sheet_name, e))?;

    // Find column indices (case-insensitive)
    let mut col_indices: Option<(usize, usize, usize, usize)> = None;

    for row in range.rows() {
        let mut found_cod = None;
        let mut found_denumire = None;
        let mut found_grupa = None;
        let mut found_subgrupa = None;

        for (idx, cell) in row.iter().enumerate() {
            if let Data::String(value) = cell {
                let value_lower = value.to_lowercase();
                if value_lower == "cod" && found_cod.is_none() {
                    found_cod = Some(idx);
                } else if value_lower == "denumire" && found_denumire.is_none() {
                    found_denumire = Some(idx);
                } else if value_lower == "grupa" && found_grupa.is_none() {
                    found_grupa = Some(idx);
                } else if value_lower == "subgrupa" && found_subgrupa.is_none() {
                    found_subgrupa = Some(idx);
                }
            }
        }

        if let (Some(cod_idx), Some(denumire_idx), Some(grupa_idx), Some(subgrupa_idx)) =
            (found_cod, found_denumire, found_grupa, found_subgrupa)
        {
            col_indices = Some((cod_idx, denumire_idx, grupa_idx, subgrupa_idx));
            break;
        }
    }

    let (cod_idx, denumire_idx, grupa_idx, subgrupa_idx) = col_indices
        .ok_or("Required columns not found: 'cod', 'denumire', 'grupa', 'subgrupa'")?;

    // Parse data rows (skip header)
    let mut parsed_data = Vec::new();
    let mut header_found = false;

    for row in range.rows() {
        if !header_found {
            // Check if this is the header row by checking for column names
            let is_header = row.iter().any(|cell| {
                if let Data::String(value) = cell {
                    matches!(value.to_lowercase().as_str(), "cod" | "denumire" | "grupa" | "subgrupa")
                } else {
                    false
                }
            });
            if is_header {
                header_found = true;
                continue;
            }
        }

        // Skip empty rows
        let is_empty = row.iter().all(|cell| matches!(cell, Data::Empty));
        if is_empty {
            continue;
        }

        // Extract values
        let cod = get_cell_value(row, cod_idx)?;
        let denumire = get_cell_value(row, denumire_idx)?;
        let grupa = get_cell_value(row, grupa_idx)?;
        let subgrupa = get_cell_value(row, subgrupa_idx)?;

        parsed_data.push(Subgroup {
            cod,
            denumire,
            grupa,
            subgrupa,
        });
    }

    if parsed_data.is_empty() {
        return Err("No data rows found in file".to_string());
    }

    let count = parsed_data.len();

    // Save to database
    insert_subgroups(parsed_data, db)?;

    Ok(count)
}

/// Helper function to get cell value as String
fn get_cell_value(row: &[Data], index: usize) -> Result<String, String> {
    let cell = row.get(index)
        .ok_or(format!("Column index {} out of bounds", index))?;

    match cell {
        Data::Empty => Ok(String::new()),
        Data::String(s) => Ok(s.clone()),
        Data::Float(f) => Ok(f.to_string()),
        Data::Int(i) => Ok(i.to_string()),
        Data::Bool(b) => Ok(b.to_string()),
        Data::DateTime(dt) => Ok(dt.to_string()),
        Data::DateTimeIso(s) | Data::DurationIso(s) => Ok(s.clone()),
        Data::Error(e) => Err(format!("Cell error: {:?}", e)),
    }
}
