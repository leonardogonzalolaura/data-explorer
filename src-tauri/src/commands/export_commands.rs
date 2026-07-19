use crate::models::Dataset;
use crate::loaders::polars_utils;
use polars::prelude::*;
use std::fs::File;

#[tauri::command]
pub fn export_dataset(dataset: Dataset, format: String, path: String) -> Result<(), String> {
    let mut df = polars_utils::dataset_to_polars_df(&dataset)?;

    match format.as_str() {
        "csv" => {
            let file = File::create(&path).map_err(|e| format!("Error creando archivo: {}", e))?;
            let mut writer = CsvWriter::new(file);
            writer.finish(&mut df).map_err(|e| format!("Error escribiendo CSV: {}", e))?;
        }
        "parquet" => {
            let file = File::create(&path).map_err(|e| format!("Error creando archivo: {}", e))?;
            let writer = ParquetWriter::new(file);
            writer.finish(&mut df).map_err(|e| format!("Error escribiendo Parquet: {}", e))?;
        }
        "json" => {
            let file = File::create(&path).map_err(|e| format!("Error creando archivo: {}", e))?;
            let mut writer = JsonWriter::new(file);
            writer.finish(&mut df).map_err(|e| format!("Error escribiendo JSON: {}", e))?;
        }
        _ => return Err(format!("Formato no soportado: {}", format)),
    }

    Ok(())
}
