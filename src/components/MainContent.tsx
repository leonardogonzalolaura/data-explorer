import DataTable from "./DataTable";
import type { Dataset } from "../types";

interface MainContentProps {
  activeDataset: Dataset | null;
  onOpenSql?: () => void;
}

export default function MainContent({ activeDataset, onOpenSql }: MainContentProps) {
  if (!activeDataset) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-40">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
          <p className="text-lg font-medium mb-1">Data Explorer</p>
          <p className="text-sm">Abre un archivo o conecta S3 para comenzar</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="text-xs text-gray-700">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">Ctrl+Shift+O</kbd>
              Abrir archivo
            </span>
            <span className="text-xs text-gray-700">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">Ctrl+Shift+K</kbd>
              SQL
            </span>
            <span className="text-xs text-gray-700">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">Ctrl+Shift+L</kbd>
              Atajos
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <DataTable dataset={activeDataset} onOpenSql={onOpenSql} />
    </main>
  );
}
