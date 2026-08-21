mod db;
mod error;
mod highlights;
mod ideas;
mod markdown;
mod notes;
mod patch;
mod papers;

use tauri::Manager;

use db::AppState;

/// Folder name inside ~/Documents. Chosen to be obvious in Finder and safe to
/// copy to another machine wholesale.
const DATA_FOLDER: &str = "Paperfolio_Data";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ~/Documents/Paperfolio_Data — visible, backed up by Time Machine,
            // and portable by dragging the folder to another Mac. Falls back to
            // the private app data directory if there is no Documents folder.
            let data_dir = match app.path().document_dir() {
                Ok(documents) => documents.join(DATA_FOLDER),
                Err(_) => app.path().app_data_dir()?,
            };

            // Bring across a library left behind by an earlier build.
            if let Ok(legacy) = app.path().app_data_dir() {
                if legacy != data_dir {
                    match db::migrate_from(&legacy, &data_dir) {
                        Ok(true) => println!("Migrated library into {}", data_dir.display()),
                        Ok(false) => {}
                        Err(err) => eprintln!("Could not migrate old library: {err}"),
                    }
                }
            }

            let state = AppState::new(&data_dir)?;

            // The webview loads PDFs through the asset protocol, which only
            // serves paths inside an allowed scope.
            app.asset_protocol_scope().allow_directory(&state.uploads_dir, false)?;

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            papers::list_papers,
            papers::get_paper,
            papers::create_paper,
            papers::update_paper,
            papers::set_paper_pdf,
            papers::delete_paper,
            papers::pdf_path,
            highlights::list_highlights,
            highlights::create_highlight,
            highlights::update_highlight,
            highlights::delete_highlight,
            notes::list_notes,
            notes::create_note,
            notes::update_note,
            notes::delete_note,
            ideas::list_ideas,
            ideas::create_idea,
            ideas::delete_idea,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Paperfolio");
}
