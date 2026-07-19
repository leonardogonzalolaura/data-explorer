use crate::models::Dataset;
use crate::services::sql_engine::{SqlEngine, TableInfo};
use std::sync::Mutex;

#[tauri::command]
pub fn execute_sql(
    sql: String,
    engine: tauri::State<'_, Mutex<SqlEngine>>,
) -> Result<Dataset, String> {
    let mut engine = engine.lock().map_err(|e| format!("Error de concurrencia: {}", e))?;
    engine.execute(&sql)
}

#[tauri::command]
pub fn list_tables(
    engine: tauri::State<'_, Mutex<SqlEngine>>,
) -> Vec<TableInfo> {
    match engine.lock() {
        Ok(engine) => engine.list_tables(),
        Err(_) => vec![],
    }
}
