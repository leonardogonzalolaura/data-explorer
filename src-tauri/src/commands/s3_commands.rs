use crate::models::{Dataset, S3Credentials, S3Profile};
use crate::services::loader_service::LoaderService;
use crate::services::sql_engine::SqlEngine;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    pub is_dir: bool,
    pub last_modified: String,
}

fn parse_s3_uri(uri: &str) -> Result<(String, String), String> {
    let uri = uri.trim();
    let rest = uri
        .strip_prefix("s3://")
        .ok_or_else(|| "URI debe comenzar con s3://".to_string())?;
    let (bucket, key) = rest
        .split_once('/')
        .ok_or_else(|| "URI debe tener formato s3://bucket/key".to_string())?;
    if bucket.is_empty() || key.is_empty() {
        return Err("URI debe tener formato s3://bucket/key".to_string());
    }
    Ok((bucket.to_string(), key.to_string()))
}

async fn build_s3_client(
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
    endpoint: &Option<String>,
) -> aws_sdk_s3::Client {
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::meta::region::RegionProviderChain::first_try(
            aws_sdk_s3::config::Region::new(region.to_string()),
        ))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            access_key_id,
            secret_access_key,
            None,
            None,
            "data-explorer",
        ))
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::Config::from(&config);
    if let Some(ep) = endpoint {
        if !ep.is_empty() {
            s3_config = s3_config
                .to_builder()
                .endpoint_url(ep)
                .force_path_style(true)
                .build();
        }
    }
    aws_sdk_s3::Client::from_conf(s3_config)
}

#[tauri::command]
pub async fn list_s3_objects(
    bucket: String,
    prefix: String,
    access_key_id: String,
    secret_access_key: String,
    region: String,
    endpoint: Option<String>,
) -> Result<Vec<S3Object>, String> {
    let client = build_s3_client(&access_key_id, &secret_access_key, &region, &endpoint).await;

    let resp = client
        .list_objects_v2()
        .bucket(&bucket)
        .prefix(&prefix)
        .delimiter("/")
        .max_keys(500)
        .send()
        .await
        .map_err(|e| format!("Error listando S3: {}", e))?;

    let mut objects: Vec<S3Object> = vec![];

    for cp in resp.common_prefixes() {
        let key = cp.prefix().unwrap_or("").to_string();
        if !key.is_empty() {
            objects.push(S3Object {
                key,
                size: 0,
                is_dir: true,
                last_modified: String::new(),
            });
        }
    }

    for obj in resp.contents() {
        let key = obj.key().unwrap_or("").to_string();
        if key.is_empty() || key == prefix {
            continue;
        }
        let size = obj.size().unwrap_or(0);
        let last_modified = obj
            .last_modified()
            .map(|d| d.to_string())
            .unwrap_or_default();
        objects.push(S3Object {
            key,
            size,
            is_dir: false,
            last_modified,
        });
    }

    objects.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.key.cmp(&b.key)
        }
    });

    Ok(objects)
}

#[tauri::command]
pub async fn load_s3_file(
    uri: String,
    access_key_id: String,
    secret_access_key: String,
    region: String,
    endpoint: Option<String>,
    loader_service: tauri::State<'_, Arc<LoaderService>>,
    engine: tauri::State<'_, Mutex<SqlEngine>>,
) -> Result<Dataset, String> {
    let (bucket, key) = parse_s3_uri(&uri)?;
    let client = build_s3_client(&access_key_id, &secret_access_key, &region, &endpoint).await;

    let resp = client
        .get_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Error descargando de S3: {}", e))?;

    let data = resp
        .body
        .collect()
        .await
        .map_err(|e| format!("Error leyendo respuesta S3: {}", e))?
        .into_bytes();

    let ext = std::path::Path::new(&key)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("json");

    let mut tmp = tempfile::Builder::new()
        .suffix(&format!(".{}", ext))
        .tempfile()
        .map_err(|e| format!("Error creando archivo temporal: {}", e))?;

    use std::io::Write;
    tmp.write_all(&data)
        .map_err(|e| format!("Error escribiendo archivo temporal: {}", e))?;

    let tmp_path = tmp.path().to_string_lossy().to_string();

    let mut dataset = loader_service.load(&tmp_path)?;

    let s3_path = std::path::Path::new(&key);
    let file_name = s3_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("s3_file");
    let short_id = &uuid::Uuid::new_v4().to_string()[..8];
    dataset.filename = format!("{}_{}", short_id, file_name);
    dataset.path = uri.clone();

    if let Ok(mut engine) = engine.lock() {
        let name = std::path::Path::new(&dataset.filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("data");
        let source = ext.to_lowercase();
        let is_json = source == "json";
        if is_json {
            match crate::loaders::polars_utils::dataset_to_polars_df(&dataset) {
                Ok(df) => engine.register(name, df, &source),
                Err(e) => eprintln!("[SQL] Error cargando DataFrame desde S3 JSON: {}", e),
            }
        } else {
            match try_load_df_from_path(&tmp_path, &source) {
                Ok(df) => engine.register(name, df, &source),
                Err(e) => eprintln!("[SQL] Error cargando DataFrame desde S3: {}", e),
            }
        }
    }

    Ok(dataset)
}

fn try_load_df_from_path(path: &str, ext: &str) -> Result<polars::prelude::DataFrame, String> {
    use polars::prelude::*;
    match ext {
        "parquet" => {
            let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
            ParquetReader::new(file)
                .use_statistics(true)
                .finish()
                .map_err(|e| e.to_string())
        }
        "csv" | "tsv" => {
            let sep = if ext == "tsv" { b'\t' } else { b',' };
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
        _ => Err(format!("Formato .{} no soportado para SQL engine desde S3", ext)),
    }
}

// ── Profile CRUD ──

#[tauri::command]
pub fn list_s3_profiles(app: AppHandle) -> Vec<S3Profile> {
    let store = match app.store("s3_profiles.json") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let mut profiles = vec![];
    for key in store.keys() {
        if let Some(val) = store.get(&key) {
            if let Ok(profile) = serde_json::from_value::<S3Profile>(val.clone()) {
                profiles.push(profile);
            }
        }
    }
    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    profiles
}

#[tauri::command]
pub fn save_s3_profile(name: String, credentials: S3Credentials, app: AppHandle) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("El nombre del perfil no puede estar vacío".to_string());
    }
    let store = app
        .store("s3_profiles.json")
        .map_err(|e| format!("Error abriendo store: {}", e))?;
    let profile = S3Profile {
        name: name.trim().to_string(),
        credentials,
    };
    let value =
        serde_json::to_value(&profile).map_err(|e| format!("Error serializando perfil: {}", e))?;
    store.set(profile.name.clone(), value);
    store.save().map_err(|e| format!("Error guardando perfil: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_s3_profile(name: String, app: AppHandle) -> Result<(), String> {
    let store = app
        .store("s3_profiles.json")
        .map_err(|e| format!("Error abriendo store: {}", e))?;
    store.delete(&name);
    store.save().map_err(|e| format!("Error guardando cambios: {}", e))?;
    Ok(())
}

// ── Bucket registry ──

const BUCKET_STORE: &str = "s3_buckets.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BucketEntry {
    profile_name: String,
    bucket: String,
}

#[tauri::command]
pub fn list_s3_buckets(profile_name: String, app: AppHandle) -> Vec<String> {
    let store = match app.store(BUCKET_STORE) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let mut buckets = vec![];
    for key in store.keys() {
        if let Some(val) = store.get(&key) {
            if let Ok(entry) = serde_json::from_value::<BucketEntry>(val.clone()) {
                if entry.profile_name == profile_name {
                    buckets.push(entry.bucket);
                }
            }
        }
    }
    buckets.sort();
    buckets
}

#[tauri::command]
pub fn save_s3_bucket(profile_name: String, bucket: String, app: AppHandle) -> Result<(), String> {
    if bucket.trim().is_empty() {
        return Err("El nombre del bucket no puede estar vacío".to_string());
    }
    let store = app
        .store(BUCKET_STORE)
        .map_err(|e| format!("Error abriendo store: {}", e))?;
    let entry = BucketEntry {
        profile_name,
        bucket: bucket.trim().to_string(),
    };
    let key = format!("{}/{}", entry.profile_name, entry.bucket);
    let value =
        serde_json::to_value(&entry).map_err(|e| format!("Error serializando bucket: {}", e))?;
    store.set(key, value);
    store.save().map_err(|e| format!("Error guardando bucket: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_s3_bucket(profile_name: String, bucket: String, app: AppHandle) -> Result<(), String> {
    let store = app
        .store(BUCKET_STORE)
        .map_err(|e| format!("Error abriendo store: {}", e))?;
    let key = format!("{}/{}", profile_name, bucket);
    store.delete(&key);
    store.save().map_err(|e| format!("Error guardando cambios: {}", e))?;
    Ok(())
}
