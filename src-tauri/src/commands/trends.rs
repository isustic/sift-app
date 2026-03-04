use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use crate::db::schema::sanitize_col_name;

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendsConfig {
    pub date_column: String,
    pub value_column: String,
    pub period: String, // "daily", "weekly", "monthly", "quarterly", "yearly"
    pub aggregation: String, // "sum", "avg", "count"
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

    // Get dataset table name
    let table_name: String = conn
        .query_row(
            "SELECT table_name FROM datasets WHERE id = ?",
            [dataset_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Dataset not found: {}", e))?;

    // Build the strftime format based on period
    let strftime_format = match config.period.as_str() {
        "daily" => "%Y-%m-%d",
        "weekly" => "%Y-W%W",
        "monthly" => "%Y-%m",
        "quarterly" => "%Y-Q",
        "yearly" => "%Y",
        _ => "%Y-%m",
    };

    // Build aggregation SQL
    let agg_sql = match config.aggregation.as_str() {
        "avg" => "AVG",
        "count" => "COUNT",
        _ => "SUM",
    };

    let safe_date_col = sanitize_col_name(&config.date_column);
    let safe_value_col = sanitize_col_name(&config.value_column);

    let sql = format!(
        "SELECT strftime('{}', {}) AS period, {}({}) AS value \
         FROM {} \
         WHERE {} IS NOT NULL \
         GROUP BY period \
         ORDER BY period ASC",
        strftime_format, safe_date_col, agg_sql, safe_value_col, table_name, safe_value_col
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Query preparation failed: {}", e))?;

    let rows: Vec<(String, f64)> = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?)))
        .map_err(|e| format!("Query execution failed: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row parsing failed: {}", e))?;

    let periods: Vec<String> = rows.iter().map(|(p, _)| p.clone()).collect();
    let values: Vec<f64> = rows.iter().map(|(_, v)| *v).clone().collect();

    // Calculate metrics
    let total: f64 = values.iter().sum();
    let count = values.len() as f64;
    let avg = if count > 0.0 { total / count } else { 0.0 };
    let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    // Calculate growth (compare last to first, or last to previous)
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
