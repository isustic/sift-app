mod commands;
mod db;

use commands::subgroups::seed_subgroups;
use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_updater::Builder as UpdaterBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(UpdaterBuilder::new().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Missing app data dir");
            let conn = init_db(&app_data_dir).expect("Failed to init database");

            // Manage state first (must be done before accessing state)
            app.manage(DbState(Mutex::new(conn)));

            // Seed subgroups on first startup if table is empty
            let db_state = app.state::<DbState>();
            let conn = db_state.0.lock().unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM subgroups", [], |r| r.get(0))
                .unwrap_or(0);
            drop(conn); // Release lock before calling seed_subgroups

            if count == 0 {
                log::info!("Seeding subgroups table...");
                match seed_subgroups(db_state) {
                    Ok(n) => log::info!("Seeded {} subgroups", n),
                    Err(e) => log::error!("Failed to seed subgroups: {}", e),
                }
            }

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
            commands::epp::get_unique_agents,
            commands::epp::get_agents_for_dataset,
            commands::epp::generate_epp_report,
            commands::subgroups::insert_subgroups,
            commands::subgroups::get_subgroups,
            commands::subgroups::search_subgroups,
            commands::subgroups::get_subgroups_by_grupa,
            commands::subgroups::get_grupe,
            commands::subgroups::seed_subgroups,
            commands::subgroups::create_subgroup,
            commands::subgroups::update_subgroup,
            commands::subgroups::delete_subgroup,
            commands::subgroups::import_subgroups_from_excel,
            commands::pivot::run_pivot_query,
            commands::trends::run_trends_query,
            commands::formula::save_formula,
            commands::formula::list_formulas,
            commands::formula::delete_formula,
            commands::formula::test_formula,
            commands::blend::run_blend_query,
            commands::updater::check_for_updates,
            commands::updater::restart_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
