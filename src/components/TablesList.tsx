import { useState, useCallback } from "react";
import type { TableInfo } from "../types";
import ConfirmModal from "./ConfirmModal";

interface TablesListProps {
  tables: TableInfo[];
  onInsertTable?: (name: string) => void;
  onDropTable?: (name: string) => void;
}

function TableIcon({ source }: { source: string }) {
  const s = source.toLowerCase();
  if (s === "csv" || s === "tsv") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (s === "parquet") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    );
  }
  if (s === "json" || s === "pegado") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (s === "xlsx" || s === "xls" || s === "xlsm") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="16" x2="16" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function TablesList({ tables, onInsertTable, onDropTable }: TablesListProps) {
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState<string | null>(null);

  const handleCopy = useCallback((name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedTable(name);
    setTimeout(() => setCopiedTable(null), 1500);
  }, []);

  const pendingTable = confirmDrop ? tables.find((t) => t.name === confirmDrop) : null;

  if (tables.length === 0) {
    return (
      <div className="px-3 py-6 text-[11px] text-gray-600 text-center italic">
        No hay tablas registradas
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto py-1">
        {tables.map((t) => {
          const color = sourceColors[t.source.toLowerCase()] ?? "text-gray-400";
          return (
            <div
              key={t.name}
              className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors ${color} hover:bg-gray-800/60`}
              onClick={() => handleCopy(t.name)}
              title="Copiar nombre de tabla"
            >
              <TableIcon source={t.source} />
              <span className="flex-1 text-[11px] font-medium truncate">
                {copiedTable === t.name ? (
                  <span className="text-blue-300">✓ Copiado</span>
                ) : (
                  t.name
                )}
              </span>
              <span className="text-[10px] text-gray-600 font-mono shrink-0">{t.source}</span>
              {onInsertTable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInsertTable(t.name); }}
                  className="p-0.5 rounded text-gray-600 hover:text-blue-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Insertar en el editor"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                </button>
              )}
              {onDropTable && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDrop(t.name); }}
                  className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Eliminar fuente"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmDrop !== null}
        title="Eliminar fuente"
        message={
          pendingTable
            ? `¿Estás seguro de eliminar la tabla "${pendingTable.name}" de tipo ${pendingTable.source}? Los datos no se perderán, solo se quitará del listado de tablas SQL.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (confirmDrop) onDropTable?.(confirmDrop);
          setConfirmDrop(null);
        }}
        onCancel={() => setConfirmDrop(null)}
      />
    </>
  );
}
