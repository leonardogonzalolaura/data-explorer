use crate::models::Dataset;
use crate::services::loader_service::Loader;
use crate::loaders::polars_utils::dataset_from_df;
use polars::prelude::*;
use std::path::Path;

pub struct CsvLoader;

impl Loader for CsvLoader {
    fn can_handle(&self, path: &str) -> bool {
        let p = Path::new(path);
        p.extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("csv") || e.eq_ignore_ascii_case("tsv"))
    }

    fn load(&self, path: &str) -> Result<Dataset, String> {
        let sep = if path.ends_with(".tsv") { b'\t' } else { b',' };

        let mut opts = CsvReadOptions::default()
            .with_infer_schema_length(Some(1000))
            .with_has_header(true);
        opts.parse_options = Arc::new(CsvParseOptions {
            separator: sep,
            ..CsvParseOptions::default()
        });

        let df = opts
            .try_into_reader_with_file_path(Some(path.into()))
            .map_err(|e| format!("Error configurando CSV: {}", e))?
            .finish()
            .map_err(|e| format!("Error leyendo CSV: {}", e))?;

        dataset_from_df(df, path)
    }
}
