import type { TableInfo } from "../types";
import TablesList from "./TablesList";
import SqlLoadActions from "./SqlLoadActions";

interface SqlSidebarProps {
  tables: TableInfo[];
  onInsertTable?: (name: string) => void;
  onDropTable?: (name: string) => void;
  onLoadFile?: () => void;
  onPasteJson?: () => void;
  onConnectS3?: () => void;
  onBackToTable?: () => void;
}

export default function SqlSidebar({ tables, onInsertTable, onDropTable, onLoadFile, onPasteJson, onConnectS3, onBackToTable }: SqlSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tablas SQL</span>
        <span className="text-[10px] text-gray-600 font-mono ml-auto">{tables.length}</span>
      </div>

      <TablesList tables={tables} onInsertTable={onInsertTable} onDropTable={onDropTable} />

      <SqlLoadActions
        onLoadFile={onLoadFile}
        onPasteJson={onPasteJson}
        onConnectS3={onConnectS3}
      />

      {onBackToTable && (
        <div className="px-3 py-2 border-t border-gray-800">
          <button
            onClick={onBackToTable}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 rounded-md transition-colors text-left"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Volver a datos
          </button>
        </div>
      )}
    </div>
  );
}
