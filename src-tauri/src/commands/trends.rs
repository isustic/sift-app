use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use crate::db::schema::sanitize_col_name;

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendsConfig {
    pub date_column: String,
    pub value_column: String,
    pub period: String,
    pub aggregation: String,
}

#[derive(Debug, Serialize)]
pub struct TrendsResult {
    pub periods: Vec<String>,
    pub values: Vec<f64>,
    pub metrics: TrendMetrics,
}

#[derive(Debug, Serialize)]
pub struct TrendMetrics {
    pub total: f64,
    pub avg: f64,
    pub min: f64,
    pub max: f64,
    pub growth: f64,
}

#[tauri::command]
pub fn run_trends_query(
    dataset_id: i64,
    config: TrendsConfig,
    state: State<DbState>,
) -> Result<TrendsResult, String> {
    let conn = state.0.lock().unwrap();

    let table_name: String = conn
        .query_row("SELECT table_name FROM datasets WHERE id = ?", [dataset_id], |row| row.get(0))
        .map_err(|e| format!("Dataset not found: {}", e))?;

    let agg_sql = match config.aggregation.as_str() {
        "avg" => "AVG",
        "count" => "COUNT",
        _ => "SUM",
    };

    let safe_date_col = sanitize_col_name(&config.date_column);
    let safe_value_col = sanitize_col_name(&config.value_column);

    // Build SQL based on period - convert Excel dates and extract month/year
    // Excel offset 25568 converts to proper dates
    let sql = match config.period.as_str() {
        "daily" => format!(
            "SELECT date(({} - 25568) * 86400, 'unixepoch') AS period, {}({}) AS value \
             FROM {} WHERE {} IS NOT NULL AND {} IS NOT NULL \
             GROUP BY period ORDER BY period ASC",
            safe_date_col, agg_sql, safe_value_col, table_name, safe_date_col, safe_value_col
        ),
        "monthly" => format!(
            "SELECT strftime('%Y-%m', date(({} - 25568) * 86400, 'unixepoch')) AS period, {}({}) AS value \
             FROM {} WHERE {} IS NOT NULL AND {} IS NOT NULL \
             GROUP BY period ORDER BY period ASC",
            safe_date_col, agg_sql, safe_value_col, table_name, safe_date_col, safe_value_col
        ),
        "yearly" => format!(
            "SELECT strftime('%Y', date(({} - 25568) * 86400, 'unixepoch')) AS period, {}({}) AS value \
             FROM {} WHERE {} IS NOT NULL AND {} IS NOT NULL \
             GROUP BY period ORDER BY period ASC",
            safe_date_col, agg_sql, safe_value_col, table_name, safe_date_col, safe_value_col
        ),
        _ => format!(
            "SELECT strftime('%Y-%m', date(({} - 25568) * 86400, 'unixepoch')) AS period, {}({}) AS value \
             FROM {} WHERE {} IS NOT NULL AND {} IS NOT NULL \
             GROUP BY period ORDER BY period ASC",
            safe_date_col, agg_sql, safe_value_col, table_name, safe_date_col, safe_value_col
        ),
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("SQL error: {}", e))?;

    let mut periods = Vec::new();
    let mut values = Vec::new();

    let mut rows = stmt.query([]).map_err(|e| format!("Query error: {}", e))?;
    while let Some(row) = rows.next().map_err(|e| format!("Row error: {}", e))? {
        let period: String = row.get(0).map_err(|e| format!("Period error: {}", e))?;
        let value: f64 = row.get(1).unwrap_or(0.0);
        periods.push(period);
        values.push(value);
    }

    let total: f64 = values.iter().sum();
    let count = values.len() as f64;
    let avg = if count > 0.0 { total / count } else { 0.0 };
    let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    let growth = if values.len() >= 2 {
        let first = values[0];
        let last = values[values.len() - 1];
        if first != 0.0 {
            ((last - first) / first.abs()) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };

    Ok(TrendsResult {
        periods,
        values,
        metrics: TrendMetrics {
            total,
            avg,
            min: if min.is_finite() { min } else { 0.0 },
            max: if max.is_finite() { max } else { 0.0 },
            growth,
        },
    })
}
