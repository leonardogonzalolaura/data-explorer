mod commands;
mod loaders;
mod models;
mod repositories;
mod services;

use commands::file_commands;
use loaders::csv_loader::CsvLoader;
use loaders::excel_loader::ExcelLoader;
use loaders::json_loader::JsonLoader;
use loaders::parquet_loader::ParquetLoader;
use services::loader_service::LoaderService;
use services::sql_engine::SqlEngine;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut loader_service = LoaderService::new();
    loader_service.register(Box::new(JsonLoader));
    loader_service.register(Box::new(CsvLoader));
    loader_service.register(Box::new(ParquetLoader));
    loader_service.register(Box::new(ExcelLoader));
    let loader_service = Arc::new(loader_service);
    let sql_engine = Mutex::new(SqlEngine::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(loader_service)
        .manage(sql_engine)
        .invoke_handler(tauri::generate_handler![
            commands::info::get_app_info,
            file_commands::load_file,
            commands::sql_commands::execute_sql,
            commands::sql_commands::list_tables,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
