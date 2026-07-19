import { useMemo } from "react";
import DataTable from "./DataTable";
import type { Dataset, ColumnInfo } from "../types";

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function inferType(values: unknown[]): string {
  let hasNum = false, hasBool = false, hasStr = false, hasObj = false;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "number") hasNum = true;
    else if (typeof v === "boolean") hasBool = true;
    else if (typeof v === "string") hasStr = true;
    else if (typeof v === "object") hasObj = true;
  }
  if (hasObj) return "json";
  if (hasStr) return "string";
  if (hasNum) return "f64";
  if (hasBool) return "bool";
  return "string";
}

interface NestedTableModalProps {
  jsonStr: string;
  label: string;
  source?: string;
  onClose: () => void;
}

export default function NestedTableModal({ jsonStr, label, source, onClose }: NestedTableModalProps) {

  const dataset = useMemo<Dataset | null>(() => {
    try {
      const items = JSON.parse(jsonStr);
      if (!Array.isArray(items) || items.length === 0) return null;

      const keys = new Map<string, unknown[]>();
      for (const item of items) {
        const flat = flattenObject(item);
        for (const k of Object.keys(flat)) {
          if (!keys.has(k)) keys.set(k, []);
          keys.get(k)!.push(flat[k]);
        }
      }

      const sortedKeys = Array.from(keys.keys()).sort();
      const columns: ColumnInfo[] = sortedKeys.map((name) => ({
        name,
        dtype: inferType(keys.get(name) ?? []),
      }));

      const rows: unknown[][] = items.map((item) => {
        const flat = flattenObject(item);
        return sortedKeys.map((k) => flat[k] ?? null);
      });

      return {
        id: `nested-${Math.random().toString(36).slice(2)}`,
        filename: label,
        path: "",
        columns,
        rows,
        total_rows: items.length,
      };
    } catch {
      return null;
    }
  }, [jsonStr, label]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-200">{label}</span>
          {source && (
            <span className="text-[11px] text-gray-500 font-mono">{source}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {dataset ? `${dataset.total_rows} filas · ${dataset.columns.length} columnas` : "—"}
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0">
        {dataset ? (
          <DataTable dataset={dataset} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            No se pudo interpretar como array de objetos
          </div>
        )}
      </div>
    </div>
  );
}
