import { useState, useCallback, useEffect } from "react";
import type { Tab } from "../types";

interface DatasetListProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export default function DatasetList({ tabs, activeTabId, onSelectTab, onCloseTab }: DatasetListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  const closeContext = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-context-menu]")) closeContext();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu, closeContext]);

  const closeOthers = useCallback((keepId: string) => {
    tabs.forEach((t) => { if (t.id !== keepId) onCloseTab(t.id); });
    closeContext();
  }, [tabs, onCloseTab, closeContext]);

  const closeAll = useCallback(() => {
    tabs.forEach((t) => onCloseTab(t.id));
    closeContext();
  }, [tabs, onCloseTab, closeContext]);

  return (
    <>
      <div className="flex-1 overflow-auto py-1">
        {tabs.length === 0 && (
          <div className="px-3 py-6 text-[11px] text-gray-600 text-center italic">
            Sin datos cargados
          </div>
        )}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => { onSelectTab(tab.id); closeContext(); }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
            }}
            className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-md cursor-pointer transition-colors ${
              tab.id === activeTabId
                ? "bg-blue-900/30 text-blue-200"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tab.id === activeTabId ? "#60a5fa" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="flex-1 text-[11px] truncate">{tab.label}</span>
            <span className="text-[10px] text-gray-600 font-mono shrink-0">{tab.dataset.total_rows.toLocaleString()}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); closeContext(); }}
              className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Cerrar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          data-context-menu
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={() => { onCloseTab(contextMenu.tabId); closeContext(); }} className="w-full text-left px-3.5 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
            Cerrar
          </button>
          <button onClick={() => closeOthers(contextMenu.tabId)} className="w-full text-left px-3.5 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
            Cerrar otros
          </button>
          <div className="h-px bg-gray-800 my-1 mx-3" />
          <button onClick={closeAll} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors">
            Cerrar todos
          </button>
        </div>
      )}
    </>
  );
}
