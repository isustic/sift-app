use rusqlite::{Connection, Result};

/// Create calculated_fields table for storing custom formula fields
pub fn create_calculated_fields_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS calculated_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            formula_sql TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}

/// Create blend_configs table for storing saved blend configurations
pub fn create_blend_configs_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS blend_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            config_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

/// Add template_type column to report_templates if not exists
/// Distinguishes between 'report', 'pivot', 'trends', and 'formula' templates
pub fn migrate_report_templates(conn: &Connection) -> Result<()> {
    // Check if column exists
    let has_column: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('report_templates') WHERE name = 'template_type'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0) == 1;

    if !has_column {
        conn.execute(
            "ALTER TABLE report_templates ADD COLUMN template_type TEXT DEFAULT 'report'",
            [],
        )?;
    }
    Ok(())
}

/// Run all analysis-related migrations
pub fn run_analysis_migrations(conn: &Connection) -> Result<()> {
    create_calculated_fields_table(conn)?;
    create_blend_configs_table(conn)?;
    migrate_report_templates(conn)?;
    Ok(())
}
