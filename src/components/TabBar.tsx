import type { Tab } from "../types";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onDragEnd?: (id: string, newIndex: number) => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-stretch h-9 bg-gray-900 border-b border-gray-800 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`group flex items-center gap-2 px-3 text-xs border-r border-gray-800 cursor-pointer transition-colors ${
            tab.id === activeTabId
              ? "bg-gray-800 text-gray-100"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 opacity-60"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="truncate max-w-32">{tab.label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            className="ml-auto p-0.5 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
