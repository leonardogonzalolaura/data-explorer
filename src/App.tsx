import { useState, useCallback, useRef, useEffect } from "react";
import Titlebar from "./components/Titlebar";
import Footer from "./components/Footer";
import ShortcutLegend from "./components/ShortcutLegend";
import DataSidebar from "./components/DataSidebar";
import MainContent from "./components/MainContent";
import SqlEditor from "./components/SqlEditor";
import type { SqlEditorHandle } from "./components/SqlEditor";
import TabBar from "./components/TabBar";
import PasteJsonModal from "./components/PasteJsonModal";
import S3ConnectionModal from "./components/S3ConnectionModal";
import AboutModal from "./components/AboutModal";
import { useHotkeys } from "./hooks/useHotkeys";
import { TauriDataRepository } from "./services/dataRepository";
import { invoke } from "@tauri-apps/api/core";
import type { Tab, AppInfo, TableInfo, S3Credentials, Dataset } from "./types";

const repository = new TauriDataRepository();

type ViewMode = "table" | "sql";

interface SqlQueryTab {
  id: string;
  label: string;
  sql: string;
  result: Dataset | null;
  error: string | null;
  editorPct: number;
  showResult: boolean;
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showS3Modal, setShowS3Modal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem("sidebar_width");
    return stored ? Math.max(160, Math.min(400, Number(stored))) : 220;
  });
  const tablesRef = useRef<TableInfo[]>([]);
  const [tableList, setTableList] = useState<TableInfo[]>([]);
  const sqlEditorRef = useRef<SqlEditorHandle>(null);

  // SQL tabs
  const [sqlTabs, setSqlTabs] = useState<SqlQueryTab[]>([{ id: crypto.randomUUID(), label: "Query 1", sql: "", result: null, error: null, editorPct: 50, showResult: false }]);
  const [activeSqlTabId, setActiveSqlTabId] = useState(sqlTabs[0].id);

  const activeDataset = tabs.find((t) => t.id === activeTabId)?.dataset ?? null;

  const openFile = useCallback(async () => {
    try {
      const dataset = await repository.pickAndLoadFile();
      if (!dataset) return;
      const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; setTableList(t); });
    } catch (err) {
      console.error("Error abriendo archivo:", err);
    }
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return next;
    });
    setActiveTabId((prev) => {
      if (prev !== id) return prev;
      const remaining = tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        setViewMode("table");
        return null;
      }
      const idx = tabs.findIndex((t) => t.id === id);
      const newIdx = Math.min(idx, remaining.length - 1);
      return remaining[newIdx].id;
    });
  }, [tabs]);

  const saveActiveTabState = useCallback(() => {
    if (sqlEditorRef.current) {
      setSqlTabs((prev) =>
        prev.map((t) =>
          t.id === activeSqlTabId
            ? {
                ...t,
                sql: sqlEditorRef.current!.getSql(),
                result: sqlEditorRef.current!.getResult(),
                error: sqlEditorRef.current!.getError(),
                editorPct: sqlEditorRef.current!.getEditorPct(),
                showResult: sqlEditorRef.current!.getShowResult(),
              }
            : t
        )
      );
    }
  }, [activeSqlTabId]);

  const openSqlEditor = useCallback(async () => {
    if (sqlTabs.length === 0) {
      setSqlTabs([{ id: crypto.randomUUID(), label: "Query 1", sql: "", result: null, error: null, editorPct: 50, showResult: false }]);
      setActiveSqlTabId(sqlTabs[0]?.id ?? "");
    }
    try {
      const tables = await invoke<TableInfo[]>("list_tables");
      tablesRef.current = tables;
      setTableList(tables);
    } catch { /* ignore */ }
    setViewMode("sql");
  }, [sqlTabs]);

  const handleSelectSqlTab = useCallback((id: string) => {
    saveActiveTabState();
    setActiveSqlTabId(id);
  }, [saveActiveTabState]);

  const handleNewSqlTab = useCallback(() => {
    saveActiveTabState();
    const newId = crypto.randomUUID();
    setSqlTabs((prev) => [...prev, { id: newId, label: `Query ${prev.length + 1}`, sql: "", result: null, error: null, editorPct: 50, showResult: false }]);
    setActiveSqlTabId(newId);
  }, [saveActiveTabState]);

  const handleCloseAllSqlTabs = useCallback(() => {
    setViewMode("table");
  }, []);

  const handleCloseSqlTab = useCallback((id: string) => {
    let newActiveId: string | null = null;
    setSqlTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        setViewMode("table");
        return prev;
      }
      const newIdx = Math.min(idx, next.length - 1);
      newActiveId = next[Math.max(0, newIdx)].id;
      return next;
    });
    if (newActiveId) {
      setActiveSqlTabId(newActiveId);
    }
  }, []);

  const handleLoadJson = useCallback(async (jsonText: string, name?: string) => {
    const dataset = await repository.loadJsonText(jsonText, name);
    const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; setTableList(t); });
  }, []);

  const handleLoadS3 = useCallback(async (uri: string, credentials: S3Credentials) => {
    const dataset = await repository.loadS3File(uri, credentials);
    const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; setTableList(t); });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const handleSidebarWidth = useCallback((w: number) => {
    setSidebarWidth(w);
    localStorage.setItem("sidebar_width", String(w));
  }, []);

  const handleDropTable = useCallback(async (name: string) => {
    try {
      const updated = await invoke<TableInfo[]>("drop_table", { name });
      tablesRef.current = updated;
      setTableList(updated);
    } catch (err) {
      console.error("Error eliminando tabla:", err);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useHotkeys("Ctrl+Shift+O", openFile);
  useHotkeys("Ctrl+Shift+J", () => setShowPasteModal((v) => !v));
  useHotkeys("Ctrl+Shift+K", openSqlEditor);
  useHotkeys("Ctrl+Shift+L", () => setShowShortcuts((v) => !v));
  useHotkeys("Ctrl+Shift+S", () => setShowS3Modal((v) => !v));
  useHotkeys("Ctrl+Shift+D", handleToggleTheme);
  useHotkeys("Ctrl+Shift+B", toggleSidebar);
  useHotkeys("Ctrl+Shift+W", () => {
    if (viewMode === "sql") {
      setViewMode("table");
      return;
    }
    if (activeTabId) closeTab(activeTabId);
  });

  if (!appInfo) {
    repository.getAppInfo().then(setAppInfo).catch(() => {});
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      <Titlebar
        onOpenFile={openFile}
        onOpenPasteModal={() => setShowPasteModal(true)}
        onOpenS3={() => setShowS3Modal(true)}
        onToggleShortcutLegend={() => setShowShortcuts((v) => !v)}
        onToggleTheme={handleToggleTheme}
        onOpenAbout={() => setShowAbout(true)}
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex overflow-hidden">
        {(tabs.length > 0 || viewMode === "sql") && (
          <DataSidebar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={(id) => { setActiveTabId(id); setViewMode("table"); }}
            onCloseTab={closeTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            width={sidebarWidth}
            onWidthChange={handleSidebarWidth}
            viewMode={viewMode}
            tables={tableList}
            onInsertTable={(name) => sqlEditorRef.current?.insertTableName(name)}
            onDropTable={handleDropTable}
            onLoadFile={openFile}
            onPasteJson={() => setShowPasteModal(true)}
            onConnectS3={() => setShowS3Modal(true)}
            onBackToTable={() => setViewMode("table")}
            onOpenSql={openSqlEditor}
          />
        )}
        {sidebarCollapsed && (tabs.length > 0 || viewMode === "sql") && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-5 shrink-0 bg-gray-900 border-r border-gray-800 text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
            title="Mostrar sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        {viewMode === "sql" ? (
          <div className="flex-1 flex flex-col min-w-0">
            <TabBar
              tabs={sqlTabs}
              activeTabId={activeSqlTabId}
              onSelectTab={handleSelectSqlTab}
              onCloseTab={handleCloseSqlTab}
              onNewTab={handleNewSqlTab}
              onCloseAll={handleCloseAllSqlTabs}
            />
            {(() => {
              const activeTab = sqlTabs.find((t) => t.id === activeSqlTabId);
              return (
                <SqlEditor
                  key={activeSqlTabId}
                  ref={sqlEditorRef}
                  tables={tableList}
                  initialSql={activeTab?.sql ?? ""}
                  initialResult={activeTab?.result ?? null}
                  initialError={activeTab?.error ?? null}
                  initialEditorPct={activeTab?.editorPct ?? 50}
                  initialShowResult={activeTab?.showResult ?? false}
                />
              );
            })()}
          </div>
        ) : (
          <MainContent activeDataset={activeDataset} onOpenFile={openFile} onOpenSql={openSqlEditor} onOpenPasteModal={() => setShowPasteModal(true)} onOpenS3={() => setShowS3Modal(true)} />
        )}
      </div>

      <Footer
        version={appInfo?.version ?? "0.1.0"}
        filename={activeDataset?.filename}
        rowCount={activeDataset?.total_rows}
        columnCount={activeDataset?.columns.length}
      />

      <ShortcutLegend open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {showPasteModal && (
        <PasteJsonModal onLoadJson={handleLoadJson} onClose={() => setShowPasteModal(false)} />
      )}

      {showS3Modal && (
        <S3ConnectionModal
          repository={repository}
          onLoadS3={handleLoadS3}
          onClose={() => setShowS3Modal(false)}
        />
      )}

      {showAbout && appInfo && (
        <AboutModal version={appInfo.version} onClose={() => setShowAbout(false)} />
      )}
    </div>
  );
}
