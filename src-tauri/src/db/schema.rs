use rusqlite::{Connection, Result};

#[derive(Debug, Clone)]
pub struct ColDef {
    pub name: String,
    pub col_type: String, // TEXT | REAL | INTEGER | DATE
}

/// Sanitize a column name to be safe for dynamic SQL (whitelist approach).
/// Only allows alphanumeric characters and underscores.
pub fn sanitize_col_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

/// Creates a flat dataset table with proper typed columns.
pub fn create_dataset_table(conn: &Connection, table_name: &str, cols: &[ColDef]) -> Result<()> {
    let safe_table = sanitize_col_name(table_name);
    let col_defs: Vec<String> = cols
        .iter()
        .map(|c| format!("\"{}\" {}", sanitize_col_name(&c.name), c.col_type))
        .collect();

    let sql = format!(
        "CREATE TABLE IF NOT EXISTS \"{}\" (_row_id INTEGER PRIMARY KEY AUTOINCREMENT, {});",
        safe_table,
        col_defs.join(", ")
    );
    conn.execute_batch(&sql)?;
    Ok(())
}

/// Adds any columns that are in `new_cols` but not yet in the table.
pub fn add_missing_columns(
    conn: &Connection,
    table_name: &str,
    existing: &[String],
    new_cols: &[ColDef],
) -> Result<()> {
    let safe_table = sanitize_col_name(table_name);
    for col in new_cols {
        let safe_name = sanitize_col_name(&col.name);
        if !existing.iter().any(|e| e == &safe_name) {
            let sql = format!(
                "ALTER TABLE \"{}\" ADD COLUMN \"{}\" {};",
                safe_table, safe_name, col.col_type
            );
            conn.execute_batch(&sql)?;
        }
    }
    Ok(())
}

/// Infer a SQLite column type from a string sample value.
pub fn infer_type(sample: &str) -> &'static str {
    if sample.parse::<i64>().is_ok() {
        return "INTEGER";
    }
    if sample.parse::<f64>().is_ok() {
        return "REAL";
    }
    // Basic date detection: YYYY-MM-DD or DD/MM/YYYY
    if sample.len() == 10
        && (sample.chars().nth(4) == Some('-') || sample.chars().nth(2) == Some('/'))
    {
        return "TEXT"; // Store dates as TEXT; use strftime for bucketing
    }
    "TEXT"
}
