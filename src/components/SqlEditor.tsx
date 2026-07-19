import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql, SQLite } from "@codemirror/lang-sql";
import { defaultKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { invoke } from "@tauri-apps/api/core";
import type { Dataset, TableInfo } from "../types";
import SqlResults from "./SqlResults";

interface SqlEditorProps {
  tables: TableInfo[];
  onResult: (dataset: Dataset) => void;
  onClose: () => void;
}

function SourceIcon({ source }: { source: string }) {
  const s = source.toLowerCase();
  if (s === "csv" || s === "tsv") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (s === "parquet") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    );
  }
  if (s === "json" || s === "pegado") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (s === "xlsx" || s === "xls" || s === "xlsm") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="16" x2="16" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const sourceColors: Record<string, string> = {
  csv: "text-yellow-400",
  tsv: "text-yellow-400/80",
  parquet: "text-blue-400",
  json: "text-green-400",
  pegado: "text-emerald-400",
  xlsx: "text-emerald-400",
  xls: "text-emerald-400",
  xlsm: "text-emerald-400",
};

const darkTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#0f172a", color: "#e2e8f0", fontSize: "14px" },
    ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", padding: "16px 20px", lineHeight: "1.7", caretColor: "#60a5fa" },
    ".cm-cursor": { borderLeftColor: "#60a5fa", borderLeftWidth: "2px" },
    ".cm-gutters": { backgroundColor: "#0f172a", color: "#475569", border: "none", minWidth: "40px" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 16px", fontSize: "12px" },
    ".cm-activeLineGutter": { backgroundColor: "#1e3a8a", color: "#93c5fd" },
    ".cm-activeLine": { backgroundColor: "rgba(59, 130, 246, 0.05)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#334155" },
    ".cm-matchingBracket": { backgroundColor: "#334155", outline: "1px solid #60a5fa" },
    ".cm-scroller": { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", overflow: "auto" },
    ".cm-placeholder": { color: "#475569", fontStyle: "italic" },
  },
  { dark: true }
);

export default function SqlEditor({ tables, onResult, onClose }: SqlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runQueryRef = useRef<() => Promise<void>>(undefined);
  const runningRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Dataset | null>(null);
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [editorPct, setEditorPct] = useState(10);
  const dragging = useRef(false);

  const runQuery = useCallback(async () => {
    if (runningRef.current || !viewRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);
    const sqlText = viewRef.current.state.doc.toString();
    try {
      const dataset = await invoke<Dataset>("execute_sql", { sql: sqlText });
      setResult(dataset);
      onResult(dataset);
    } catch (err) {
      setError(String(err));
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [onResult]);

  runQueryRef.current = runQuery;

  const extensions = useMemo(
    () => [
      sql({ dialect: SQLite }),
      keymap.of([
        ...defaultKeymap,
        { key: "Mod-Enter", run: () => { runQueryRef.current?.(); return true; } },
        { key: "Shift-Enter", run: () => { viewRef.current?.dispatch(viewRef.current.state.replaceSelection("\n")); return true; } },
      ]),
      placeholder("Escribe tu consulta SQL aquí... (Ctrl+Enter para ejecutar)"),
      syntaxHighlighting(defaultHighlightStyle),
      darkTheme,
      EditorView.lineWrapping,
    ],
    [tables]
  );

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;
    const state = EditorState.create({
      doc: `SELECT * FROM ${tables[0]?.name ?? "data"} LIMIT 100`,
      extensions,
    });
    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    view.focus();
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runQueryRef.current?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const onDividerMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "row-resize";
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setEditorPct(Math.max(5, Math.min(50, pct)));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const hasResults = result || error;
  const noTables = tables.length === 0;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-gray-950 min-h-0 min-w-0">
      {/* Top header — light, just info + close */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/60 bg-gray-900/80 shrink-0">
        <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {tables.length > 0 && (
          <div className="flex items-center gap-2 truncate max-w-[400px]" title={`Tablas disponibles para consultas SQL. Usá SELECT, JOIN, WHERE, GROUP BY, etc.`}>
            {tables.map((t, i) => {
              const color = sourceColors[t.source.toLowerCase()] ?? "text-gray-400";
              return (
                <span key={t.name} className={`inline-flex items-center gap-1 shrink-0 ${color}`}>
                  {i > 0 && <span className="text-gray-700 mr-0.5">|</span>}
                  <SourceIcon source={t.source} />
                  <span
                    className="text-[11px] font-medium cursor-pointer hover:text-blue-300 transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(t.name);
                      setCopiedTable(t.name);
                      setTimeout(() => setCopiedTable(null), 1500);
                    }}
                    title="Copiar nombre de tabla"
                  >
                    {copiedTable === t.name ? "✓ Copiado" : t.name}
                  </span>
                  <span className="text-[10px] opacity-60">{t.source}</span>
                </span>
              );
            })}
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          title="Cerrar (Ctrl+Shift+W)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Editor panel */}
      <div
        className="flex flex-col overflow-hidden min-h-0"
        style={{ flex: hasResults ? `${editorPct} 1 0%` : "1 1 0%" }}
      >
        {noTables && (
          <div className="px-4 py-2 text-[11px] text-yellow-500 bg-yellow-950/20 border-b border-yellow-900/30 shrink-0">
            No hay tablas disponibles. Abrí un archivo primero para poder ejecutar SQL.
          </div>
        )}
        <div
          ref={editorRef}
          tabIndex={0}
          className="flex-1 overflow-auto min-h-0"
        />
      </div>

      {/* Results */}
      {hasResults && (
        <>
          <div
            onMouseDown={onDividerMouseDown}
            className="h-1.5 bg-gray-800/50 hover:bg-blue-700/40 cursor-row-resize shrink-0 transition-colors relative group"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-6 h-0.5 rounded-full bg-blue-500/60" />
            </div>
          </div>

          <div
            className="flex flex-col min-h-0 min-w-0"
            style={{ flex: `${100 - editorPct} 1 0%` }}
          >
            {/* Results header — with execute button */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900/20 border-b border-gray-800/40 shrink-0">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Resultados</span>
              {error && <span className="text-[11px] text-red-400">Error</span>}
              <div className="flex-1" />
              <span className="text-[10px] text-gray-600 font-mono">Ctrl+Enter</span>
              <button
                onClick={runQuery}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "5px",
                  border: "none",
                  cursor: noTables ? "not-allowed" : running ? "wait" : "pointer",
                  opacity: noTables ? 0.4 : 1,
                  backgroundColor: running ? "#1e40af" : "#2563eb",
                  color: "white",
                }}
              >
                {running && (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="8" />
                  </svg>
                )}
                {!running && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ display: "inline-block" }}>
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
                {running ? "Ejecutando..." : "Ejecutar"}
              </button>
              {result && (
                <span className="text-[11px] text-gray-600 ml-1">
                  {result.total_rows.toLocaleString()} filas · {result.columns.length} columnas
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {error && (
                <div className="m-3 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {error}
                </div>
              )}
              {result && (
                <div
                  style={{
                    margin: "8px",
                    border: "2px solid #3b82f6",
                    borderRadius: "6px",
                    flex: "1 1 0%",
                    minHeight: 0,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <SqlResults dataset={result} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
