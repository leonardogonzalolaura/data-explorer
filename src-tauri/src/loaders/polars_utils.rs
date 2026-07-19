use crate::models::{ColumnInfo, Dataset};
use polars::prelude::*;
use std::path::Path;

pub fn dataset_from_df(df: DataFrame, path: &str) -> Result<Dataset, String> {
    let filename = Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path)
        .to_string();

    let columns: Vec<ColumnInfo> = df
        .get_column_names()
        .iter()
        .map(|name| {
            let dtype = df
                .column(name)
                .map(|s| format_dtype(s.dtype()))
                .unwrap_or_default();
            ColumnInfo {
                name: name.to_string(),
                dtype,
            }
        })
        .collect();

    let total_rows = df.height();
    let display_rows = total_rows.min(10_000);

    let rows: Vec<Vec<serde_json::Value>> = (0..display_rows)
        .map(|row_idx| {
            columns
                .iter()
                .map(|col| {
                    df.column(&col.name)
                        .ok()
                        .and_then(|s| s.get(row_idx).ok())
                        .map(polars_value_to_json)
                        .unwrap_or(serde_json::Value::Null)
                })
                .collect()
        })
        .collect();

    Ok(Dataset {
        id: uuid::Uuid::new_v4().to_string(),
        filename,
        columns,
        rows,
        total_rows,
    })
}

pub fn df_to_rows(df: &DataFrame, max_rows: usize) -> Vec<Vec<serde_json::Value>> {
    let cols = df.get_column_names().to_vec();
    let n = df.height().min(max_rows);
    (0..n)
        .map(|row_idx| {
            cols.iter()
                .map(|name| {
                    df.column(name)
                        .ok()
                        .and_then(|s| s.get(row_idx).ok())
                        .map(polars_value_to_json)
                        .unwrap_or(serde_json::Value::Null)
                })
                .collect()
        })
        .collect()
}

pub fn format_dtype(dt: &DataType) -> String {
    match dt {
        DataType::Int8 => "i8",
        DataType::Int16 => "i16",
        DataType::Int32 => "i32",
        DataType::Int64 => "i64",
        DataType::UInt8 => "u8",
        DataType::UInt16 => "u16",
        DataType::UInt32 => "u32",
        DataType::UInt64 => "u64",
        DataType::Float32 => "f32",
        DataType::Float64 => "f64",
        DataType::String => "string",
        DataType::Boolean => "bool",
        DataType::Date => "date",
        DataType::Datetime(_, _) => "datetime",
        DataType::Time => "time",
        DataType::Decimal(_, _) => "decimal",
        _ => "other",
    }
    .to_string()
}

fn polars_value_to_json(value: AnyValue) -> serde_json::Value {
    match value {
        AnyValue::Null => serde_json::Value::Null,
        AnyValue::Boolean(v) => serde_json::Value::Bool(v),
        AnyValue::Int8(v) => serde_json::Value::Number(serde_json::Number::from(v as i16)),
        AnyValue::Int16(v) => serde_json::Value::Number(serde_json::Number::from(v)),
        AnyValue::Int32(v) => serde_json::Number::from(v).into(),
        AnyValue::Int64(v) => serde_json::Number::from(v).into(),
        AnyValue::UInt8(v) => serde_json::Value::Number(serde_json::Number::from(v as u16)),
        AnyValue::UInt16(v) => serde_json::Value::Number(serde_json::Number::from(v)),
        AnyValue::UInt32(v) => serde_json::Value::Number(serde_json::Number::from(v)),
        AnyValue::UInt64(v) => serde_json::Value::Number(serde_json::Number::from(v)),
        AnyValue::Float32(v) => {
            serde_json::Number::from_f64(v as f64).map_or(serde_json::Value::Null, |n| n.into())
        }
        AnyValue::Float64(v) => {
            serde_json::Number::from_f64(v).map_or(serde_json::Value::Null, |n| n.into())
        }
        AnyValue::String(v) => serde_json::Value::String(v.to_string()),
        AnyValue::Date(v) => {
            let d = polars::export::arrow::temporal_conversions::date32_to_date(v);
            serde_json::Value::String(d.format("%Y-%m-%d").to_string())
        }
        AnyValue::Datetime(v, tu, _) => {
            let ts = match tu {
                TimeUnit::Nanoseconds => {
                    polars::export::arrow::temporal_conversions::timestamp_ns_to_datetime(v)
                }
                TimeUnit::Microseconds => {
                    polars::export::arrow::temporal_conversions::timestamp_us_to_datetime(v)
                }
                TimeUnit::Milliseconds => {
                    polars::export::arrow::temporal_conversions::timestamp_ms_to_datetime(v)
                }
            };
            serde_json::Value::String(ts.format("%Y-%m-%dT%H:%M:%S").to_string())
        }
        AnyValue::Time(v) => {
            let ts = polars::export::arrow::temporal_conversions::time64ns_to_time(v);
            serde_json::Value::String(ts.format("%H:%M:%S").to_string())
        }
        AnyValue::Decimal(v, scale) => {
            let factor = 10i128.pow(scale as u32);
            let int_part = v / factor;
            let frac_part = (v % factor).abs();
            if scale == 0 {
                serde_json::Value::String(int_part.to_string())
            } else {
                serde_json::Value::String(format!("{}.{:0>width$}", int_part, frac_part, width = scale as usize))
            }
        }
        _ => serde_json::Value::String(format!("{:?}", value)),
    }
}
