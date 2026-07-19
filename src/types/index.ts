export interface ColumnInfo {
  name: string;
  dtype: string;
}

export interface Dataset {
  id: string;
  filename: string;
  columns: ColumnInfo[];
  rows: unknown[][];
  total_rows: number;
}

export interface Tab {
  id: string;
  label: string;
  dataset: Dataset;
}

export interface Shortcut {
  key: string;
  description: string;
  category: string;
  combo: string;
}

export interface TableInfo {
  name: string;
  source: string;
}

export interface S3Credentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  endpoint?: string | null;
}

export interface S3Profile {
  name: string;
  credentials: S3Credentials;
}

export interface S3Object {
  key: string;
  size: number;
  is_dir: boolean;
  last_modified: string;
}

export type MenuItem = {
  label?: string;
  action?: () => void;
  shortcut?: string;
  disabled?: boolean;
  children?: MenuItem[];
  separator?: boolean;
};

export type Theme = "dark" | "light";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface AppInfo {
  version: string;
  name: string;
}
