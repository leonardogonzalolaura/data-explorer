import { useState, useCallback, useRef, useEffect } from "react";
import Titlebar from "./components/Titlebar";
import Footer from "./components/Footer";
import ShortcutLegend from "./components/ShortcutLegend";
import DataSidebar from "./components/DataSidebar";
import MainContent from "./components/MainContent";
import SqlEditor from "./components/SqlEditor";
import type { SqlEditorHandle } from "./components/SqlEditor";
import PasteJsonModal from "./components/PasteJsonModal";
import S3ConnectionModal from "./components/S3ConnectionModal";
import AboutModal from "./components/AboutModal";
import { useHotkeys } from "./hooks/useHotkeys";
import { TauriDataRepository } from "./services/dataRepository";
import { invoke } from "@tauri-apps/api/core";
import type { Tab, AppInfo, Dataset, TableInfo, S3Credentials } from "./types";

const repository = new TauriDataRepository();

type ViewMode = "table" | "sql";

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

  const handleSqlResult = useCallback((dataset: Dataset) => {
    const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const openSqlEditor = useCallback(async () => {
    try {
      const tables = await invoke<TableInfo[]>("list_tables");
      tablesRef.current = tables;
      setTableList(tables);
    } catch { /* ignore */ }
    setViewMode("sql");
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
          <SqlEditor
            ref={sqlEditorRef}
            tables={tableList}
            onResult={handleSqlResult}
            onClose={() => setViewMode("table")}
          />
        ) : (
          <MainContent activeDataset={activeDataset} onOpenSql={openSqlEditor} onOpenPasteModal={() => setShowPasteModal(true)} onOpenS3={() => setShowS3Modal(true)} />
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
