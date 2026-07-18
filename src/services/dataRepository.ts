import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Dataset, AppInfo } from "../types";

export interface DataRepository {
  loadFile(path: string): Promise<Dataset>;
  pickAndLoadFile(): Promise<Dataset | null>;
  getAppInfo(): Promise<AppInfo>;
}

export class TauriDataRepository implements DataRepository {
  async loadFile(path: string): Promise<Dataset> {
    return invoke<Dataset>("load_file", { path });
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
