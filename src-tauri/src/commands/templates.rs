use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub id: i64,
    pub name: String,
    pub dataset_id: Option<i64>,
    pub config_json: String,
    pub created_at: String,
}

#[tauri::command]
pub fn save_template(
    name: String,
    dataset_id: Option<i64>,
    config_json: String,
    db: State<'_, DbState>,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO report_templates (name, dataset_id, config_json, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![name, dataset_id, config_json, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_templates(
    dataset_id: Option<i64>,
    db: State<'_, DbState>,
) -> Result<Vec<Template>, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    // Return generic templates (dataset_id IS NULL) + dataset-specific ones
    let mut stmt = conn
        .prepare(
            "SELECT id, name, dataset_id, config_json, created_at FROM report_templates
             WHERE dataset_id IS NULL OR dataset_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let templates = stmt
        .query_map(params![dataset_id], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                dataset_id: row.get(2)?,
                config_json: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(templates)
}

#[tauri::command]
pub fn load_template(id: i64, db: State<'_, DbState>) -> Result<Template, String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    conn.query_row(
        "SELECT id, name, dataset_id, config_json, created_at FROM report_templates WHERE id = ?1",
        params![id],
        |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                dataset_id: row.get(2)?,
                config_json: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("Template not found: {e}"))
}

#[tauri::command]
pub fn delete_template(id: i64, db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|_| "DB lock error")?;
    conn.execute("DELETE FROM report_templates WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
