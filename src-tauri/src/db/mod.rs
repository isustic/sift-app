pub mod schema;
pub mod analysis;

use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db(app_data_dir: &std::path::Path) -> Result<Connection> {
    std::fs::create_dir_all(app_data_dir).ok();
    let db_path = app_data_dir.join("app.db");
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;")?;

    // Migration: Add display_name column if it doesn't exist
    let _ = conn.execute("ALTER TABLE columns ADD COLUMN display_name TEXT", []);

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS datasets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            file_origin TEXT    NOT NULL,
            table_name  TEXT    NOT NULL UNIQUE,
            row_count   INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS columns (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id    INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
            name          TEXT    NOT NULL,
            col_type      TEXT    NOT NULL DEFAULT 'TEXT',
            display_order INTEGER NOT NULL DEFAULT 0,
            display_name  TEXT
        );

        CREATE TABLE IF NOT EXISTS report_templates (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            dataset_id  INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
            config_json TEXT    NOT NULL,
            created_at  TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analytics_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type  TEXT    NOT NULL,
            metadata    TEXT,
            timestamp   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS query_history (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            report_config   TEXT    NOT NULL,
            row_count       INTEGER,
            duration_ms     INTEGER,
            timestamp       TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            item_type   TEXT    NOT NULL,
            item_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(item_type, item_id)
        );

        CREATE TABLE IF NOT EXISTS subgroups (
            cod         TEXT    NOT NULL,
            denumire    TEXT    NOT NULL,
            grupa       TEXT    NOT NULL,
            subgrupa    TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ty_reports (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            name                TEXT    NOT NULL,
            original_file_name  TEXT    NOT NULL,
            file_path           TEXT    NOT NULL,
            table_name          TEXT    NOT NULL,
            row_count           INTEGER NOT NULL DEFAULT 0,
            created_at          TEXT    NOT NULL,
            updated_at          TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ty_report_columns (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id     INTEGER NOT NULL REFERENCES ty_reports(id) ON DELETE CASCADE,
            name          TEXT    NOT NULL,
            display_name  TEXT,
            col_type      TEXT    NOT NULL DEFAULT 'TEXT',
            display_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS client_combinations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_name  TEXT    NOT NULL,
            agent_key   TEXT    NOT NULL,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS client_combination_members (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            combination_id  INTEGER NOT NULL REFERENCES client_combinations(id) ON DELETE CASCADE,
            agent_key       TEXT    NOT NULL,
            client_name     TEXT    NOT NULL,
            client_key      TEXT    NOT NULL,
            display_order   INTEGER NOT NULL DEFAULT 0,
            UNIQUE(agent_key, client_key)
        );
    ")?;

    // Run analysis workspace migrations
    crate::db::analysis::run_analysis_migrations(&conn)?;

    Ok(conn)
}
