import { useState, useMemo } from "react";
import type { Dataset } from "../types";

interface JsonTreeViewProps {
  dataset: Dataset;
  onToggleFormat?: () => void;
}

function unflattenRow(columns: { name: string }[], row: unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    const parts = columns[i].name.split(".");
    let current = result;
    for (let j = 0; j < parts.length - 1; j++) {
      if (!(parts[j] in current)) current[parts[j]] = {};
      const next = current[parts[j]];
      current = next as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = row[i];
  }
  return result;
}

const VALUE_COLORS: Record<string, string> = {
  string: "#22c55e",
  number: "#fb923c",
  boolean: "#a78bfa",
  null: "#a78bfa",
  key: "#60a5fa",
  bracket: "#9ca3af",
  punctuation: "#6b7280",
};

function JsonValueDisplay({ value, defaultExpanded }: { value: unknown; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const type = typeof value;
  const isObj = value !== null && type === "object" && !Array.isArray(value);
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;

  const entries = useMemo(() => {
    if (isObj) return Object.entries(value as Record<string, unknown>);
    if (isArr) return (value as unknown[]).map((v, i) => [String(i), v] as const);
    return [];
  }, [value, isObj, isArr]);

  const itemCount = isObj ? Object.keys(value as Record<string, unknown>).length : isArr ? (value as unknown[]).length : 0;

  if (!isExpandable) {
    if (value === null) return <span style={{ color: VALUE_COLORS.null, fontStyle: "italic" }}>null</span>;
    if (type === "string") return <span style={{ color: VALUE_COLORS.string }}>"{String(value)}"</span>;
    if (type === "number") return <span style={{ color: VALUE_COLORS.number }}>{String(value)}</span>;
    if (type === "boolean") return <span style={{ color: VALUE_COLORS.boolean }}>{String(value)}</span>;
    return <span>{String(value)}</span>;
  }

  const openBracket = isObj ? "{" : "[";
  const closeBracket = isObj ? "}" : "]";

  return (
    <span>
      <span
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", color: VALUE_COLORS.punctuation, userSelect: "none" }}
        className="hover:text-gray-300 transition-colors"
      >
        <span className="mr-0.5 text-[10px]">{expanded ? "▾" : "▸"}</span>
        <span style={{ color: VALUE_COLORS.bracket }}>{openBracket}</span>
        <span style={{ color: VALUE_COLORS.punctuation }} className="ml-1 text-[11px]">
          {itemCount} {isObj ? (itemCount === 1 ? "key" : "keys") : itemCount === 1 ? "item" : "items"}
        </span>
        {!expanded && (
          <>
            <span style={{ color: VALUE_COLORS.punctuation }}> </span>
            <span style={{ color: VALUE_COLORS.bracket }}>{closeBracket}</span>
          </>
        )}
      </span>
      {expanded && (
        <span className="block" style={{ paddingLeft: "16px", borderLeft: "1px solid rgba(75, 85, 99, 0.3)", marginLeft: "4px" }}>
          {entries.map(([key, val]) => (
            <div key={key} className="my-0.5" style={{ lineHeight: "1.5" }}>
              {isObj && (
                <span>
                  <span style={{ color: VALUE_COLORS.key }}>"{key}"</span>
                  <span style={{ color: VALUE_COLORS.punctuation }}>: </span>
                </span>
              )}
              {isArr && <span style={{ color: VALUE_COLORS.punctuation }}>{key}: </span>}
              <JsonValueDisplay value={val} defaultExpanded={false} />
              <span style={{ color: VALUE_COLORS.punctuation }}>,</span>
            </div>
          ))}
          <div style={{ color: VALUE_COLORS.bracket }}>{closeBracket}</div>
        </span>
      )}
    </span>
  );
}

export default function JsonTreeView({ dataset, onToggleFormat }: JsonTreeViewProps) {
  const [currentRow, setCurrentRow] = useState(0);

  const obj = useMemo(() => {
    if (dataset.rows.length === 0) return null;
    return unflattenRow(dataset.columns, dataset.rows[currentRow]);
  }, [dataset.columns, dataset.rows, currentRow]);

  const totalRows = dataset.total_rows;
  const displayRows = dataset.rows.length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500 border-b border-gray-800 shrink-0 overflow-x-auto">
        <span className="font-medium text-gray-300 whitespace-nowrap">{dataset.filename}</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{totalRows.toLocaleString()} filas</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{dataset.columns.length} columnas</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="text-blue-400 text-[11px] whitespace-nowrap">Vista JSON</span>
        {onToggleFormat && (
          <>
            <span className="text-gray-600 shrink-0">|</span>
            <button
              onClick={onToggleFormat}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
            >Tabla</button>
          </>
        )}
        <div className="flex-1" />
        {displayRows > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">
              Fila {currentRow + 1} de {displayRows}
            </span>
            <button
              onClick={() => setCurrentRow((p) => Math.max(0, p - 1))}
              disabled={currentRow === 0}
              className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-[11px]"
            >◀</button>
            <button
              onClick={() => setCurrentRow((p) => Math.min(displayRows - 1, p + 1))}
              disabled={currentRow >= displayRows - 1}
              className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-[11px]"
            >▶</button>
          </div>
        )}
      </div>

      {/* Tree body */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {obj ? (
          <JsonValueDisplay value={obj} defaultExpanded />
        ) : (
          <div className="text-gray-500 italic">Sin datos</div>
        )}
      </div>
    </div>
  );
}
