use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub dtype: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dataset {
    pub id: String,
    pub filename: String,
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Credentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub endpoint: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Profile {
    pub name: String,
    pub credentials: S3Credentials,
}
