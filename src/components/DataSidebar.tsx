import { useCallback, useRef } from "react";
import type { Tab, TableInfo } from "../types";
import DatasetList from "./DatasetList";
import SqlSidebar from "./SqlSidebar";

interface DataSidebarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  viewMode: "table" | "sql";
  tables: TableInfo[];
  onInsertTable?: (name: string) => void;
  onLoadFile?: () => void;
  onPasteJson?: () => void;
  onConnectS3?: () => void;
  onBackToTable?: () => void;
}

export default function DataSidebar({
  tabs, activeTabId, onSelectTab, onCloseTab, collapsed, onToggleCollapse, width, onWidthChange,
  viewMode, tables, onInsertTable, onLoadFile, onPasteJson, onConnectS3, onBackToTable,
}: DataSidebarProps) {
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const newW = Math.max(160, Math.min(400, startW.current + (ev.clientX - startX.current)));
      onWidthChange(newW);
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [width, onWidthChange]);

  if (collapsed) return null;

  return (
    <div
      className="relative flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden shrink-0"
      style={{ width }}
    >
      {/* Collapse button */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="Colapsar sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {viewMode === "table" && (
          <>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Datos</span>
            <span className="text-[10px] text-gray-600 font-mono ml-auto">{tabs.length}</span>
          </>
        )}
      </div>

      {viewMode === "sql" ? (
        <SqlSidebar
          tables={tables}
          onInsertTable={onInsertTable}
          onLoadFile={onLoadFile}
          onPasteJson={onPasteJson}
          onConnectS3={onConnectS3}
          onBackToTable={onBackToTable}
        />
      ) : (
        <DatasetList
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
        />
      )}

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
      />
    </div>
  );
}
