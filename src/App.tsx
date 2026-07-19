import { useState, useCallback, useRef, useEffect } from "react";
import Titlebar from "./components/Titlebar";
import Footer from "./components/Footer";
import ShortcutLegend from "./components/ShortcutLegend";
import TabBar from "./components/TabBar";
import MainContent from "./components/MainContent";
import SqlEditor from "./components/SqlEditor";
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
  const tablesRef = useRef<TableInfo[]>([]);

  const activeDataset = tabs.find((t) => t.id === activeTabId)?.dataset ?? null;

  const openFile = useCallback(async () => {
    try {
      const dataset = await repository.pickAndLoadFile();
      if (!dataset) return;
      const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setViewMode("table");
      // Refresh available tables for SQL
    invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; });
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
    } catch { /* ignore */ }
    setViewMode("sql");
  }, []);

  const handleLoadJson = useCallback(async (jsonText: string, name?: string) => {
    const dataset = await repository.loadJsonText(jsonText, name);
    const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setViewMode("table");
    invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; });
  }, []);

  const handleLoadS3 = useCallback(async (uri: string, credentials: S3Credentials) => {
    const dataset = await repository.loadS3File(uri, credentials);
    const tab: Tab = { id: dataset.id, label: dataset.filename, dataset };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setViewMode("table");
    invoke<TableInfo[]>("list_tables").then((t) => { tablesRef.current = t; });
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
      />

      {viewMode === "table" && tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={(id) => { setActiveTabId(id); setViewMode("table"); }}
          onCloseTab={closeTab}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {viewMode === "sql" ? (
          <SqlEditor
            tables={tablesRef.current}
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
