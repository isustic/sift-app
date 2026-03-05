use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Check for updates, download if available, and return the version
/// Returns the available version string if an update is found and downloaded
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    match app.updater() {
        Ok(updater) => {
            // Check for available update
            match updater.check().await {
                Ok(Some(update)) => {
                    // Download and install the update
                    // Callbacks: on_chunk (progress), on_download_finish
                    if let Err(e) = update.download_and_install(
                        |_chunk_length, _content_length| {
                            // Progress callback - could emit event to frontend here
                        },
                        || {
                            // Download complete callback
                        },
                    ).await {
                        return Err(format!("Download failed: {}", e));
                    }
                    // Return the version number
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
