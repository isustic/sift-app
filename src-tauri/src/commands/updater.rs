use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Check for updates on startup
/// Returns the available version string if an update is found
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    match app.updater() {
        Ok(updater) => {
            // Check for available update
            match updater.check().await {
                Ok(Some(update)) => {
                    // Return the version number (don't auto-download)
                    Ok(Some(update.version.clone()))
                }
                Ok(None) => Ok(None), // No update available
                Err(e) => Err(format!("Update check failed: {}", e)),
            }
        }
        Err(e) => Err(format!("Updater not initialized: {}", e)),
    }
}

/// Restart the app to apply downloaded update
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}
