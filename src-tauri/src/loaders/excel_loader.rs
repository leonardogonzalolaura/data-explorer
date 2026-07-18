use crate::models::{ColumnInfo, Dataset};
use crate::services::loader_service::Loader;
use calamine::{open_workbook, Reader, Xlsx};
use std::path::Path;

pub struct ExcelLoader;

impl Loader for ExcelLoader {
    fn can_handle(&self, path: &str) -> bool {
        let p = Path::new(path);
        p.extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| {
                e.eq_ignore_ascii_case("xlsx")
                    || e.eq_ignore_ascii_case("xls")
                    || e.eq_ignore_ascii_case("xlsm")
            })
    }

    fn load(&self, path: &str) -> Result<Dataset, String> {
        let filename = Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(path)
            .to_string();

        let mut workbook: Xlsx<_> =
            open_workbook(path).map_err(|e| format!("Error abriendo Excel: {}", e))?;

        let sheet_name = workbook
            .sheet_names()
            .first()
            .cloned()
            .ok_or("El archivo Excel no tiene hojas".to_string())?;

        let range = workbook
            .worksheet_range(&sheet_name)
            .map_err(|e| format!("Error leyendo hoja '{}': {}", sheet_name, e))?;

        let mut iter = range.rows();
        let headers: Vec<String> = iter
            .next()
            .map(|row| {
                row.iter()
                    .map(|cell| {
                        cell.to_string()
                            .trim_matches('"')
                            .trim()
                            .replace(['\n', '\r'], " ")
                    })
                    .collect()
            })
            .unwrap_or_default();

        if headers.is_empty() {
            return Ok(Dataset {
                id: uuid::Uuid::new_v4().to_string(),
                filename,
                columns: vec![],
                rows: vec![],
                total_rows: 0,
            });
        }

        let columns: Vec<ColumnInfo> = headers
            .iter()
            .map(|h| ColumnInfo {
                name: h.clone(),
                dtype: "string".to_string(),
            })
            .collect();

        let rows: Vec<Vec<serde_json::Value>> = iter
            .map(|row| {
                headers
                    .iter()
                    .enumerate()
                    .map(|(i, _)| {
                        row.get(i)
                            .map(|cell| {
                                let s = cell.to_string().trim_matches('"').to_string();
                                if s.is_empty() {
                                    serde_json::Value::Null
                                } else if let Ok(n) = s.parse::<f64>() {
                                    serde_json::Number::from_f64(n)
                                        .map_or(serde_json::Value::String(s), |v| v.into())
                                } else {
                                    serde_json::Value::String(s)
                                }
                            })
                            .unwrap_or(serde_json::Value::Null)
                    })
                    .collect()
            })
            .collect();

        let total_rows = rows.len();

        Ok(Dataset {
            id: uuid::Uuid::new_v4().to_string(),
            filename,
            columns,
            rows,
            total_rows,
        })
    }
}
