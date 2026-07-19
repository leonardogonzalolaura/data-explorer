use crate::models::Dataset;
use crate::services::loader_service::LoaderService;
use crate::services::sql_engine::SqlEngine;
use std::sync::{Arc, Mutex};
use tauri::State;

#[tauri::command]
pub fn load_json_text(
    json_text: String,
    name: Option<String>,
    engine: State<'_, Mutex<SqlEngine>>,
) -> Result<Dataset, String> {
    let label = name.clone().unwrap_or_else(|| "JSON pegado".to_string());
    let dataset = crate::loaders::json_loader::parse_json_str(&json_text, &label, "")?;

    if let Ok(mut engine) = engine.lock() {
        let table_name = name
            .map(|n| n.chars().filter(|c| c.is_alphanumeric() || *c == '_').collect::<String>())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "json_pegado".to_string());
        match crate::loaders::polars_utils::dataset_to_polars_df(&dataset) {
            Ok(df) => engine.register(&table_name, df, "pegado"),
            Err(e) => eprintln!("[SQL] No se pudo crear DataFrame desde JSON pegado: {}", e),
        }
    }

    Ok(dataset)
}

#[tauri::command]
pub fn load_file(
    path: String,
    loader_service: State<'_, Arc<LoaderService>>,
    engine: State<'_, Mutex<SqlEngine>>,
) -> Result<Dataset, String> {
    let dataset = loader_service.load(&path)?;

    if let Ok(mut engine) = engine.lock() {
        let p = std::path::Path::new(&path);
        let source = p.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("file")
            .to_lowercase();
        let is_json = source == "json";

        if is_json {
            match crate::loaders::polars_utils::dataset_to_polars_df(&dataset) {
                Ok(df) => {
                    let name = std::path::Path::new(&dataset.filename)
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("data");
                    engine.register(name, df, &source);
                }
                Err(e) => eprintln!("[SQL] No se pudo crear DataFrame desde JSON: {}", e),
            }
        } else {
            match try_load_df(&path) {
                Ok(df) => {
                    let name = std::path::Path::new(&dataset.filename)
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("data");
                    engine.register(name, df, &source);
                }
                Err(e) => {
                    eprintln!("[SQL] No se pudo cargar DataFrame para SQL engine: {}", e);
                }
            }
        }
    }

    Ok(dataset)
}

fn try_load_df(path: &str) -> Result<polars::prelude::DataFrame, String> {
    use polars::prelude::*;
    let p = std::path::Path::new(path);
    match p.extension().and_then(|e| e.to_str()) {
        Some(e) if e.eq_ignore_ascii_case("parquet") => {
            let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
            ParquetReader::new(file)
                .use_statistics(true)
                .finish()
                .map_err(|e| e.to_string())
        }
        Some(e) if e.eq_ignore_ascii_case("csv") || e.eq_ignore_ascii_case("tsv") => {
            let sep = if e.eq_ignore_ascii_case("tsv") {
                b'\t'
            } else {
                b','
            };
            let mut opts = CsvReadOptions::default().with_has_header(true);
            opts.parse_options = Arc::new(CsvParseOptions {
                separator: sep,
                ..Default::default()
            });
            opts.try_into_reader_with_file_path(Some(path.into()))
                .map_err(|e| e.to_string())?
                .finish()
                .map_err(|e| e.to_string())
        }
        Some(e) if e.eq_ignore_ascii_case("json") => {
            let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
            JsonReader::new(file).finish().map_err(|e| e.to_string())
        }
        _ => Err("Formato no soportado para SQL".to_string()),
    }
}
