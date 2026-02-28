mod commands;
mod db;

use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Missing app data dir");
            let conn = init_db(&app_data_dir).expect("Failed to init database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ingest::ingest_file,
            commands::data::list_datasets,
            commands::data::get_columns,
            commands::data::get_rows,
            commands::data::search_rows,
            commands::data::delete_dataset,
            commands::data::rename_dataset,
            commands::report::run_report,
            commands::export::export_report,
            commands::templates::save_template,
            commands::templates::list_templates,
            commands::templates::load_template,
            commands::templates::delete_template,
            commands::analytics::track_event,
            commands::analytics::get_usage_stats,
            commands::analytics::get_activity_heatmap,
            commands::analytics::get_query_history,
            commands::analytics::save_query,
            commands::analytics::add_favorite,
            commands::analytics::remove_favorite,
            commands::analytics::get_favorites,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
