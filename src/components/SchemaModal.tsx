import { useState } from "react";
import type { ColumnInfo } from "../types";

interface SchemaModalProps {
  columns: ColumnInfo[];
  filename: string;
  path: string;
  onClose: () => void;
}

export default function SchemaModal({ columns, filename, path, onClose }: SchemaModalProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = query
    ? columns.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : columns;

  const copySchema = async () => {
    const text = columns.map((c) => `${c.name}: ${c.dtype}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-sm font-medium text-gray-200">Esquema &mdash; {filename}</h2>
            {path && <p className="text-[11px] text-gray-600 mt-0.5 font-mono truncate max-w-md">{path}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-800 shrink-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar entre ${columns.length} columnas...`}
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Column list */}
        <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-6">Sin resultados</p>
          )}
          {filtered.map((col) => (
            <div key={col.name} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors">
              <code className="flex-1 text-xs text-gray-300 font-mono">{col.name}</code>
              <span className="text-[10px] text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 font-mono border border-gray-700/50">{col.dtype}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 shrink-0">
          <span className="text-[11px] text-gray-600">{columns.length} columna{columns.length !== 1 ? "s" : ""}</span>
          <button
            onClick={copySchema}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
          >
            {copied ? "Copiado" : "Copiar esquema"}
          </button>
        </div>
      </div>
    </div>
  );
}
