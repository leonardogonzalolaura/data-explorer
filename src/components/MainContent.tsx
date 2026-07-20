import DataTable from "./DataTable";
import type { Dataset } from "../types";

interface MainContentProps {
  activeDataset: Dataset | null;
  onOpenFile?: () => void;
  onOpenSql?: () => void;
  onOpenPasteModal?: () => void;
  onOpenS3?: () => void;
}

const SHORTCUT_CHIPS = [
  { keys: "Ctrl+Shift+O", label: "Abrir archivo", action: "onOpenFile" as const },
  { keys: "Ctrl+Shift+J", label: "Pegar JSON", action: "onOpenPasteModal" as const },
  { keys: "Ctrl+Shift+K", label: "SQL", action: "onOpenSql" as const },
  { keys: "Ctrl+Shift+S", label: "Conectar S3", action: "onOpenS3" as const },
];

export default function MainContent({ activeDataset, onOpenFile, onOpenSql, onOpenPasteModal, onOpenS3 }: MainContentProps) {
  if (!activeDataset) {
    return (
      <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="flex flex-col items-center gap-8 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-lg font-medium text-gray-200">Data Explorer</h1>
            <p className="text-sm text-gray-600 mt-1">Navegá, consultá y explorá tus datos</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-xs">
            {SHORTCUT_CHIPS.map(({ keys, label, action }) => {
              const handler = { onOpenFile, onOpenPasteModal, onOpenSql, onOpenS3 }[action];
              return handler ? (
                <button
                  key={keys}
                  onClick={handler}
                  className="inline-flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full px-2.5 py-1 hover:border-blue-500/40 hover:bg-gray-800/60 transition-all cursor-pointer"
                >
                  <kbd className="text-[10px] font-mono text-blue-400 bg-blue-500/10 rounded px-1 py-0.5">{keys}</kbd>
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-300">{label}</span>
                </button>
              ) : (
                <span
                  key={keys}
                  className="inline-flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full px-2.5 py-1 opacity-50"
                >
                  <kbd className="text-[10px] font-mono text-gray-500 bg-gray-800 rounded px-1 py-0.5">{keys}</kbd>
                  <span className="text-[11px] text-gray-600">{label}</span>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600 font-medium">ACCIONES RÁPIDAS</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="flex flex-col gap-2 w-full">
            {onOpenPasteModal && (
              <button onClick={onOpenPasteModal} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500/30 hover:bg-gray-800/50 transition-all group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="14" y="2" width="8" height="8" rx="2" ry="2" /><path d="M3 7h6a2 2 0 0 1 2 2v2" /><path d="M17 17h2a2 2 0 0 0 2-2v-4" /><path d="M3 17h2" /><path d="M9 21h4" /><rect x="3" y="13" width="4" height="4" rx="1" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-medium text-gray-300">Pegar JSON</p>
                  <p className="text-[10px] text-gray-600">Copiá JSON al portapapeles y cargalo</p>
                </div>
                <kbd className="text-[10px] font-mono text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 shrink-0">Ctrl+Shift+J</kbd>
              </button>
            )}
            {onOpenS3 && (
              <button onClick={onOpenS3} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500/30 hover:bg-gray-800/50 transition-all group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.7-9c.3-.1.5-.1.8-.1a4.5 4.5 0 1 1-3 7.9" />
                    <path d="M12 11v4" /><path d="M14 13h-4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-medium text-gray-300">Conectar S3</p>
                  <p className="text-[10px] text-gray-600">Explorá buckets y cargá archivos remotos</p>
                </div>
                <kbd className="text-[10px] font-mono text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 shrink-0">Ctrl+Shift+S</kbd>
              </button>
            )}
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
