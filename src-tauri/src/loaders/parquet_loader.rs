use crate::models::Dataset;
use crate::services::loader_service::Loader;
use crate::loaders::polars_utils::dataset_from_df;
use polars::prelude::*;
use std::path::Path;

pub struct ParquetLoader;

impl Loader for ParquetLoader {
    fn can_handle(&self, path: &str) -> bool {
        let p = Path::new(path);
        p.extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("parquet"))
    }

    fn load(&self, path: &str) -> Result<Dataset, String> {
        let file = std::fs::File::open(path)
            .map_err(|e| format!("Error abriendo Parquet: {}", e))?;
        let df = ParquetReader::new(file)
            .use_statistics(true)
            .finish()
            .map_err(|e| format!("Error leyendo Parquet: {}", e))?;

        dataset_from_df(df, path)
    }
}
