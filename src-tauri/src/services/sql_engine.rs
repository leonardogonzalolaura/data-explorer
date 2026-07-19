use crate::models::Dataset;
use polars::prelude::*;
use polars::sql::SQLContext;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub source: String,
}

pub struct SqlEngine {
    ctx: SQLContext,
    tables: HashMap<String, (String, String)>,
}

impl SqlEngine {
    pub fn new() -> Self {
        Self {
            ctx: SQLContext::new(),
            tables: HashMap::new(),
        }
    }

    pub fn register(&mut self, name: &str, df: DataFrame, source: &str) {
        let table_name = name
            .to_lowercase()
            .replace(['.', '-', ' '], "_");
        let lf: LazyFrame = df.lazy();
        self.ctx.register(&table_name, lf);
        self.tables.insert(table_name, (name.to_string(), source.to_string()));
    }

    pub fn execute(&mut self, sql: &str) -> Result<Dataset, String> {
        let lf = self
            .ctx
            .execute(sql)
            .map_err(|e| format!("Error SQL: {}", e))?;

        let df = lf.collect().map_err(|e| format!("Error ejecutando SQL: {}", e))?;

    let columns: Vec<crate::models::ColumnInfo> = df
        .get_column_names()
        .iter()
        .map(|name| {
            let dtype = df
                .column(name)
                .map(|s| crate::loaders::polars_utils::format_dtype(s.dtype()))
                .unwrap_or_default();
            crate::models::ColumnInfo {
                name: name.to_string(),
                dtype,
            }
        })
        .collect();

        let total_rows = df.height();
        let display_rows = total_rows.min(10_000);
        let rows = crate::loaders::polars_utils::df_to_rows(&df, display_rows);

        Ok(Dataset {
            id: uuid::Uuid::new_v4().to_string(),
            filename: "SQL Result".to_string(),
            columns,
            rows,
            total_rows,
        })
    }

    pub fn list_tables(&self) -> Vec<TableInfo> {
        let mut names: Vec<TableInfo> = self
            .tables
            .iter()
            .map(|(k, v)| TableInfo {
                name: k.clone(),
                source: v.1.clone(),
            })
            .collect();
        names.sort_by(|a, b| a.name.cmp(&b.name));
        names
    }
}
