use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub datasets_count: i64,
    pub reports_run: i64,
    pub total_rows: i64,
    pub most_used_columns: Vec<ColumnUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnUsage {
    pub column_name: String,
    pub usage_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityDay {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryEntry {
    pub id: i64,
    pub report_config: String,
    pub row_count: i64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Favorite {
    pub id: i64,
    pub item_type: String,
    pub item_id: i64,
    pub name: String,
    pub created_at: String,
}

/// Track an analytics event
#[tauri::command]
pub fn track_event(state: State<DbState>, event_type: String, metadata: Option<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO analytics_events (event_type, metadata) VALUES (?1, ?2)",
        params![event_type, metadata],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get overall usage statistics
#[tauri::command]
pub fn get_usage_stats(state: State<DbState>) -> Result<UsageStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Count datasets
    let datasets_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM datasets", [], |row| row.get(0))
        .unwrap_or(0);

    // Count reports run (from query_history)
    let reports_run: i64 = conn
        .query_row("SELECT COUNT(*) FROM query_history", [], |row| row.get(0))
        .unwrap_or(0);

    // Sum total rows across all datasets
    let total_rows: i64 = conn
        .query_row("SELECT SUM(row_count) FROM datasets", [], |row| {
            row.get::<_, Option<i64>>(0).map(|v| v.unwrap_or(0))
        })
        .unwrap_or(0);

    // Get most used columns from report_config in query_history
    // This is a simplified version - we'll parse the JSON configs
    let mut column_counts: HashMap<String, i64> = HashMap::new();

    let mut stmt = conn
        .prepare("SELECT report_config FROM query_history")
        .map_err(|e| e.to_string())?;

    let config_rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    for config_result in config_rows {
        if let Ok(config) = config_result {
            // Parse the config JSON and count column usage
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&config) {
                if let Some(columns) = value.get("columns").and_then(|v| v.as_array()) {
                    for col in columns {
                        if let Some(name) = col.get("name").and_then(|v| v.as_str()) {
                            *column_counts.entry(name.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }

    let mut most_used_columns: Vec<ColumnUsage> = column_counts
        .into_iter()
        .map(|(name, count)| ColumnUsage {
            column_name: name,
            usage_count: count,
        })
        .collect();

    most_used_columns.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));
    most_used_columns.truncate(5); // Top 5

    Ok(UsageStats {
        datasets_count,
        reports_run,
        total_rows,
        most_used_columns,
    })
}

/// Get activity heatmap data for the last N days
#[tauri::command]
pub fn get_activity_heatmap(state: State<DbState>, days: i32) -> Result<Vec<ActivityDay>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT date(timestamp) as day, COUNT(*) as count
             FROM analytics_events
             WHERE timestamp >= date('now', '-' || ?1 || ' days')
             GROUP BY day
             ORDER BY day",
        )
        .map_err(|e| e.to_string())?;

    let activity = stmt
        .query_map(params![days], |row| {
            Ok(ActivityDay {
                date: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(activity)
}

/// Get query history
#[tauri::command]
pub fn get_query_history(state: State<DbState>, limit: i64) -> Result<Vec<QueryEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, report_config, row_count, timestamp
             FROM query_history
             ORDER BY timestamp DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let queries = stmt
        .query_map(params![limit], |row| {
            Ok(QueryEntry {
                id: row.get(0)?,
                report_config: row.get(1)?,
                row_count: row.get(2)?,
                timestamp: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(queries)
}

/// Save a query to history
#[tauri::command]
pub fn save_query(
    state: State<DbState>,
    report_config: String,
    row_count: i64,
    duration_ms: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO query_history (report_config, row_count, duration_ms) VALUES (?1, ?2, ?3)",
        params![report_config, row_count, duration_ms],
    )
    .map_err(|e| e.to_string())?;

    // Also track the event
    conn.execute(
        "INSERT INTO analytics_events (event_type, metadata) VALUES ('report_run', ?1)",
        params![format!("{{\"rows\": {row_count}, \"duration_ms\": {duration_ms}}}"),],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Add a favorite
#[tauri::command]
pub fn add_favorite(
    state: State<DbState>,
    item_type: String,
    item_id: i64,
    name: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO favorites (item_type, item_id, name) VALUES (?1, ?2, ?3)",
        params![item_type, item_id, name],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove a favorite
#[tauri::command]
pub fn remove_favorite(state: State<DbState>, favorite_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM favorites WHERE id = ?1", params![favorite_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get all favorites
#[tauri::command]
pub fn get_favorites(state: State<DbState>) -> Result<Vec<Favorite>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, item_type, item_id, name, created_at FROM favorites ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let favorites = stmt
        .query_map([], |row| {
            Ok(Favorite {
                id: row.get(0)?,
                item_type: row.get(1)?,
                item_id: row.get(2)?,
                name: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(favorites)
}
