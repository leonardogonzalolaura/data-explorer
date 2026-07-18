use crate::models::{ColumnInfo, Dataset};
use crate::services::loader_service::Loader;
use serde_json::Value;
use std::path::Path;
use std::collections::BTreeMap;

pub struct JsonLoader;

impl Loader for JsonLoader {
    fn can_handle(&self, path: &str) -> bool {
        let p = Path::new(path);
        p.extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("json"))
    }

    fn load(&self, path: &str) -> Result<Dataset, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Error leyendo JSON: {}", e))?;

        let json: Value = serde_json::from_str(&content)
            .map_err(|e| format!("Error parseando JSON: {}", e))?;

        let items = extract_array(&json)?;
        if items.is_empty() {
            return Ok(Dataset {
                id: uuid::Uuid::new_v4().to_string(),
                filename: filename_from_path(path),
                columns: vec![],
                rows: vec![],
                total_rows: 0,
            });
        }

        let all_keys = collect_keys(&items);
        let columns: Vec<ColumnInfo> = all_keys.iter().map(|k| {
            let dtype = infer_type(&items, k);
            ColumnInfo { name: k.clone(), dtype }
        }).collect();

        let display_count = items.len().min(10_000);
        let rows: Vec<Vec<Value>> = items.iter().take(display_count).map(|item| {
            let flat = flatten_object(item);
            columns.iter().map(|col| {
                flat.get(col.name.as_str()).cloned().unwrap_or(Value::Null)
            }).collect()
        }).collect();

        let filename = filename_from_path(path);

        Ok(Dataset {
            id: uuid::Uuid::new_v4().to_string(),
            filename,
            columns,
            total_rows: rows.len(),
            rows,
        })
    }
}

fn filename_from_path(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path)
        .to_string()
}

fn extract_array(json: &Value) -> Result<Vec<Value>, String> {
    match json {
        Value::Array(arr) => Ok(arr.clone()),
        Value::Object(map) => {
            // Buscar la primera propiedad que sea un array
            for val in map.values() {
                if let Value::Array(arr) = val {
                    return Ok(arr.clone());
                }
            }
            Err("El JSON no contiene un array en la raíz ni en ninguna propiedad".to_string())
        }
        _ => Err("El JSON debe ser un array o un objeto con una propiedad array".to_string()),
    }
}

fn collect_keys(items: &[Value]) -> Vec<String> {
    let mut keys = BTreeMap::new();
    for item in items {
        let flat = flatten_object(item);
        for k in flat.keys() {
            keys.insert(k.clone(), true);
        }
    }
    keys.into_keys().collect()
}

fn flatten_object(value: &Value) -> BTreeMap<String, Value> {
    let mut result = BTreeMap::new();
    flatten_inner(value, "", &mut result);
    result
}

fn flatten_inner(value: &Value, prefix: &str, result: &mut BTreeMap<String, Value>) {
    match value {
        Value::Object(map) => {
            for (k, v) in map {
                let new_key = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{}.{}", prefix, k)
                };
                match v {
                    Value::Object(_) => flatten_inner(v, &new_key, result),
                    Value::Array(arr) => {
                        // Arrays anidados → serializar como JSON string
                        result.insert(new_key, Value::String(serde_json::to_string(arr).unwrap_or_default()));
                    }
                    _ => { result.insert(new_key, v.clone()); }
                }
            }
        }
        _ => { result.insert(prefix.to_string(), value.clone()); }
    }
}

fn infer_type(items: &[Value], key: &str) -> String {
    let mut has_number = false;
    let mut has_bool = false;
    let mut has_string = false;
    let mut has_object = false;

    for item in items {
        let flat = flatten_object(item);
        match flat.get(key) {
            Some(Value::Number(_)) => has_number = true,
            Some(Value::Bool(_)) => has_bool = true,
            Some(Value::String(_)) => has_string = true,
            Some(Value::Object(_)) | Some(Value::Array(_)) => has_object = true,
            _ => {}
        }
    }

    if has_object { "json".to_string() }
    else if has_bool && !has_number && !has_string { "bool".to_string() }
    else if has_number && !has_string { "f64".to_string() }
    else if has_string { "string".to_string() }
    else if has_bool { "bool".to_string() }
    else { "string".to_string() }
}
