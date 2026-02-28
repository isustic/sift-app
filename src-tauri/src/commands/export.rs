use rust_xlsxwriter::{Format, FormatBorder, Workbook};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn export_report(
    rows: Vec<serde_json::Value>,
    columns: Vec<String>,
    app: AppHandle,
) -> Result<String, String> {
    // Open native save dialog
    let path = app
        .dialog()
        .file()
        .add_filter("Excel Spreadsheet", &["xlsx"])
        .blocking_save_file()
        .ok_or("Export cancelled")?;

    let path_str = path.to_string();

    // Build Excel workbook
    let mut workbook = Workbook::new();
    let sheet = workbook.add_worksheet();

    // Bold header format
    let header_fmt = Format::new()
        .set_bold()
        .set_border(FormatBorder::Thin)
        .set_background_color(0x4472C4)
        .set_font_color(0xFFFFFF);

    let data_fmt = Format::new().set_border(FormatBorder::Thin);

    // Write headers
    for (col_idx, col_name) in columns.iter().enumerate() {
        sheet
            .write_with_format(0, col_idx as u16, col_name.as_str(), &header_fmt)
            .map_err(|e| format!("Header write error: {e}"))?;
    }

    // Write data rows
    for (row_idx, row) in rows.iter().enumerate() {
        for (col_idx, col_name) in columns.iter().enumerate() {
            let val = row.get(col_name).unwrap_or(&serde_json::Value::Null);
            match val {
                serde_json::Value::Number(n) => {
                    if let Some(f) = n.as_f64() {
                        sheet
                            .write_with_format(row_idx as u32 + 1, col_idx as u16, f, &data_fmt)
                            .map_err(|e| format!("Write error: {e}"))?;
                    }
                }
                serde_json::Value::String(s) => {
                    sheet
                        .write_with_format(row_idx as u32 + 1, col_idx as u16, s.as_str(), &data_fmt)
                        .map_err(|e| format!("Write error: {e}"))?;
                }
                serde_json::Value::Null => {}
                other => {
                    sheet
                        .write_with_format(row_idx as u32 + 1, col_idx as u16, other.to_string().as_str(), &data_fmt)
                        .map_err(|e| format!("Write error: {e}"))?;
                }
            }
        }
    }

    // Auto-fit columns
    sheet.autofit();

    workbook
        .save(&path_str)
        .map_err(|e| format!("Save error: {e}"))?;

    Ok(path_str)
}
