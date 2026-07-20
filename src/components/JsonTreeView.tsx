import { useState, useMemo, useCallback } from "react";
import type { Dataset } from "../types";
import JsonViewerModal from "./JsonViewerModal";

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

function tryParseJson(raw: unknown): unknown | null {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

const C = {
  string: "#22c55e",
  number: "#fb923c",
  boolean: "#a78bfa",
  null: "#a78bfa",
  key: "#60a5fa",
  bracket: "#9ca3af",
  punctuation: "#6b7280",
};

function LeafValue({ value }: { value: unknown }) {
  if (value === null) return <span style={{ color: C.null, fontStyle: "italic" }}>null</span>;
  if (typeof value === "string") return <span style={{ color: C.string }}>"{String(value)}"</span>;
  if (typeof value === "number") return <span style={{ color: C.number }}>{String(value)}</span>;
  if (typeof value === "boolean") return <span style={{ color: C.boolean }}>{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function isExpandable(value: unknown): boolean {
  if (value !== null && typeof value === "object") return true;
  return tryParseJson(value) !== null;
}

function itemLabel(value: unknown): string {
  const parsed = tryParseJson(value);
  const target = parsed ?? value;
  if (target === null || typeof target !== "object") return String(target);
  if (Array.isArray(target)) {
    const n = target.length;
    return n === 1 ? "[1 item]" : `[${n} items]`;
  }
  const n = Object.keys(target).length;
  return n === 1 ? "{1 key}" : `{${n} keys}`;
}

export default function JsonTreeView({ dataset, onToggleFormat }: JsonTreeViewProps) {
  const [currentRow, setCurrentRow] = useState(0);
  const [modalJson, setModalJson] = useState<{ value: unknown; label: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const obj = useMemo(() => {
    if (dataset.rows.length === 0) return null;
    return unflattenRow(dataset.columns, dataset.rows[currentRow]);
  }, [dataset.columns, dataset.rows, currentRow]);

  const entries = useMemo(() => {
    if (!obj) return [];
    return Object.entries(obj);
  }, [obj]);

  const totalRows = dataset.total_rows;
  const displayRows = dataset.rows.length;

  const handleCopy = useCallback(async () => {
    if (!obj) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [obj]);

  const handleOpenModal = useCallback((value: unknown, label: string) => {
    setModalJson({ value, label });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
        <div className="hidden sm:block w-px h-5 bg-gray-700" />
        {obj && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-green-400">Copiado</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copiar JSON
              </>
            )}
          </button>
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

      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {!obj && (
          <div className="text-gray-500 italic">Sin datos</div>
        )}
        {obj && (
          <div className="inline-block min-w-full">
            <span style={{ color: C.bracket }}>{`{`}</span>
            <div className="pl-4 border-l border-gray-800/40 ml-1 my-1">
              {entries.map(([key, value]) => {
                const exp = isExpandable(value);
                return (
                  <div key={key} className="my-1" style={{ lineHeight: "1.6" }}>
                    <span style={{ color: C.key }}>"{key}"</span>
                    <span style={{ color: C.punctuation }}>: </span>
                    {exp ? (
                      <span
                        onClick={() => handleOpenModal(tryParseJson(value) ?? value, key)}
                        style={{ cursor: "pointer", userSelect: "none" }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-900/30 transition-colors"
                      >
                        <span className="text-[10px]" style={{ color: C.punctuation }}>▸</span>
                        <span style={{ color: C.bracket }}>{Array.isArray(value) ? "[" : "{"}</span>
                        <span className="text-[11px]" style={{ color: C.punctuation }}>
                          {itemLabel(value)}
                        </span>
                        <span style={{ color: C.bracket }}>{Array.isArray(value) ? "]" : "}"}</span>
                      </span>
                    ) : (
                      <LeafValue value={value} />
                    )}
                    <span style={{ color: C.punctuation }}>,</span>
                  </div>
                );
              })}
            </div>
            <span style={{ color: C.bracket }}>{`}`}</span>
          </div>
        )}
      </div>

      {modalJson && (
        <JsonViewerModal
          value={modalJson.value}
          label={`${dataset.filename} → ${modalJson.label}`}
          onClose={() => setModalJson(null)}
        />
      )}
    </div>
  );
}
