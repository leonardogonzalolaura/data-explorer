import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql, SQLite } from "@codemirror/lang-sql";
import { defaultKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { invoke } from "@tauri-apps/api/core";
import type { Dataset } from "../types";
import DataTable from "./DataTable";

interface SqlEditorProps {
  tables: string[];
  onResult: (dataset: Dataset) => void;
  onClose: () => void;
}

const darkTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#0f172a", color: "#e2e8f0", fontSize: "15px" },
    ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", padding: "24px 28px", lineHeight: "1.8", caretColor: "#60a5fa" },
    ".cm-cursor": { borderLeftColor: "#60a5fa", borderLeftWidth: "2px" },
    ".cm-gutters": { backgroundColor: "#0f172a", color: "#475569", border: "none", minWidth: "48px" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 20px", fontSize: "13px" },
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
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Dataset | null>(null);
  const [editorHeight, setEditorHeight] = useState(65);
  const dragging = useRef(false);

  const runQuery = useCallback(async () => {
    if (!viewRef.current) return;
    setError(null);
    setRunning(true);
    const sqlText = viewRef.current.state.doc.toString();
    try {
      const dataset = await invoke<Dataset>("execute_sql", { sql: sqlText });
      setResult(dataset);
      onResult(dataset);
    } catch (err) {
      setError(String(err));
    } finally {
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
      doc: `SELECT * FROM ${tables[0] ?? "data"} LIMIT 100`,
      extensions,
    });
    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
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
      setEditorHeight(Math.max(40, Math.min(90, pct)));
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

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-gray-950 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-800/80 bg-gray-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Editor SQL</h2>
            <p className="text-[11px] text-gray-500">
              {tables.length > 0 ? `Tablas: ${tables.join(", ")}` : "Abre un archivo primero"}
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <kbd className="hidden sm:inline-flex items-center text-xs bg-gray-800 border border-gray-700/60 rounded-md px-2.5 py-1 text-gray-500 font-mono gap-1.5">
            <span className="text-gray-600">Ctrl</span>
            <span className="text-gray-600">+</span>
            <span className="text-gray-600">Enter</span>
            <span className="text-gray-500 ml-1">▶</span>
          </kbd>
          <button
            onClick={runQuery}
            disabled={running || tables.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all active:scale-[0.97] shadow-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 disabled:text-blue-200 disabled:cursor-wait"
          >
            {running ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="8" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
            {running ? "Ejecutando..." : "Ejecutar"}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title="Cerrar (Ctrl+Shift+W)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor panel */}
      <div
        className="flex flex-col overflow-hidden min-h-0"
        style={{ flex: hasResults ? `${editorHeight} 1 0%` : "1 1 0%" }}
      >
        <div className="flex items-center justify-between px-6 py-2 bg-gray-900/30 border-b border-gray-800/50 shrink-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Consulta</span>
          <span className="text-[11px] text-gray-600 font-mono">SQL</span>
        </div>
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
            className="h-2 bg-gray-800/60 hover:bg-blue-700/40 cursor-row-resize shrink-0 transition-colors relative group"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-1 rounded-full bg-blue-500/60" />
            </div>
          </div>
          <div
            className="flex flex-col overflow-hidden min-h-0"
            style={{ flex: `${100 - editorHeight} 1 0%` }}
          >
            <div className="flex items-center justify-between px-6 py-2 bg-gray-900/30 border-b border-gray-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resultados</span>
                {error && <span className="text-xs text-red-400">Error</span>}
              </div>
              {result && (
                <span className="text-xs text-gray-500">
                  {result.total_rows.toLocaleString()} filas · {result.columns.length} columnas
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {error && (
                <div className="m-4 p-4 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg">
                  {error}
                </div>
              )}
              {result && <DataTable dataset={result} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
