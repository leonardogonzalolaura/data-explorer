interface TabBarTab {
  id: string;
  label: string;
  path?: string;
}

interface TabBarProps {
  tabs: TabBarTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab?: (id: string) => void;
  onNewTab?: () => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-stretch h-9 bg-gray-900 border-b border-gray-800 overflow-x-auto shrink-0">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          title={tab.path ?? tab.label}
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
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="truncate max-w-32">{tab.label}</span>
          {onCloseTab && (
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
          )}
        </div>
      ))}
      {onNewTab && (
        <button
          onClick={onNewTab}
          className="flex items-center gap-1 px-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border-r border-gray-800 transition-colors"
          title="Nueva consulta"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
