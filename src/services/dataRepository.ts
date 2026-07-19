import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Dataset, AppInfo, S3Credentials, S3Profile, S3Object } from "../types";

export interface DataRepository {
  loadFile(path: string): Promise<Dataset>;
  pickAndLoadFile(): Promise<Dataset | null>;
  loadJsonText(jsonText: string, name?: string): Promise<Dataset>;
  loadS3File(uri: string, credentials: S3Credentials): Promise<Dataset>;
  listS3Objects(bucket: string, prefix: string, credentials: S3Credentials): Promise<S3Object[]>;
  listS3Profiles(): Promise<S3Profile[]>;
  saveS3Profile(name: string, credentials: S3Credentials): Promise<void>;
  deleteS3Profile(name: string): Promise<void>;
  listS3Buckets(profileName: string): Promise<string[]>;
  saveS3Bucket(profileName: string, bucket: string): Promise<void>;
  deleteS3Bucket(profileName: string, bucket: string): Promise<void>;
  getAppInfo(): Promise<AppInfo>;
}

export class TauriDataRepository implements DataRepository {
  async loadFile(path: string): Promise<Dataset> {
    return invoke<Dataset>("load_file", { path });
  }

  async loadJsonText(jsonText: string, name?: string): Promise<Dataset> {
    return invoke<Dataset>("load_json_text", { jsonText, name: name ?? null });
  }

  async loadS3File(uri: string, credentials: S3Credentials): Promise<Dataset> {
    return invoke<Dataset>("load_s3_file", {
      uri,
      accessKeyId: credentials.access_key_id,
      secretAccessKey: credentials.secret_access_key,
      region: credentials.region,
      endpoint: credentials.endpoint ?? null,
    });
  }

  async listS3Profiles(): Promise<S3Profile[]> {
    return invoke<S3Profile[]>("list_s3_profiles");
  }

  async listS3Objects(bucket: string, prefix: string, credentials: S3Credentials): Promise<S3Object[]> {
    return invoke<S3Object[]>("list_s3_objects", {
      bucket,
      prefix,
      accessKeyId: credentials.access_key_id,
      secretAccessKey: credentials.secret_access_key,
      region: credentials.region,
      endpoint: credentials.endpoint ?? null,
    });
  }

  async saveS3Profile(name: string, credentials: S3Credentials): Promise<void> {
    return invoke<void>("save_s3_profile", { name, credentials });
  }

  async deleteS3Profile(name: string): Promise<void> {
    return invoke<void>("delete_s3_profile", { name });
  }

  async listS3Buckets(profileName: string): Promise<string[]> {
    return invoke<string[]>("list_s3_buckets", { profileName });
  }

  async saveS3Bucket(profileName: string, bucket: string): Promise<void> {
    return invoke<void>("save_s3_bucket", { profileName, bucket });
  }

  async deleteS3Bucket(profileName: string, bucket: string): Promise<void> {
    return invoke<void>("delete_s3_bucket", { profileName, bucket });
  }

  async pickAndLoadFile(): Promise<Dataset | null> {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Datos",
          extensions: ["json", "csv", "tsv", "parquet", "xlsx", "xls"],
        },
        {
          name: "Parquet",
          extensions: ["parquet"],
        },
        {
          name: "JSON",
          extensions: ["json"],
        },
        {
          name: "CSV / TSV",
          extensions: ["csv", "tsv"],
        },
        {
          name: "Excel",
          extensions: ["xlsx", "xls", "xlsm"],
        },
      ],
    });

    if (!selected) return null;
    return this.loadFile(selected);
  }

  async getAppInfo(): Promise<AppInfo> {
    return invoke<AppInfo>("get_app_info");
  }
}
