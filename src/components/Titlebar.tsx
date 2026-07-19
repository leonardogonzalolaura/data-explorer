import { useState, useRef, useEffect } from "react";
import type { MenuItem } from "../types";
import WindowControls from "./WindowControls";

interface TitlebarProps {
  title?: string;
  onOpenFile?: () => void;
  onOpenPasteModal?: () => void;
  onOpenS3?: () => void;
  onExport?: () => void;
  onToggleShortcutLegend?: () => void;
  onToggleTheme?: () => void;
}

function MenuDropdown({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-dropdown py-1 min-w-44 z-50 animate-fade-in"
    >
      {items.map((item, i) => {
        if (item.separator) return <div key={i} className="h-px bg-gray-700 my-1" />;
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm ${
              item.disabled ? "text-gray-600 cursor-not-allowed" : "text-gray-200 hover:bg-gray-700"
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-xs text-gray-500 ml-6">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function Titlebar({
  title = "Data Explorer",
  onOpenFile,
  onOpenPasteModal,
  onOpenS3,
  onExport,
  onToggleShortcutLegend,
  onToggleTheme,
}: TitlebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menus: Record<string, MenuItem[]> = {
    Archivo: [
      { label: "Abrir archivo...", action: onOpenFile, shortcut: "Ctrl+Shift+O" },
      { label: "Conectar S3...", action: onOpenS3, shortcut: "Ctrl+Shift+S" },
      { label: "Pegar JSON...", action: onOpenPasteModal, shortcut: "Ctrl+Shift+J" },
      { label: "Exportar datos...", action: onExport, shortcut: "Ctrl+Shift+E", disabled: true },
      { separator: true },
      { label: "Salir", action: async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        getCurrentWindow().close();
      }, shortcut: "Alt+F4" },
    ],
    Editar: [
      { label: "Copiar", shortcut: "Ctrl+C", disabled: true },
      { label: "Seleccionar todo", shortcut: "Ctrl+A", disabled: true },
    ],
    Ver: [
      { label: "Modo oscuro/claro", action: onToggleTheme, shortcut: "Ctrl+Shift+D" },
      { label: "Atajos de teclado", action: onToggleShortcutLegend, shortcut: "Ctrl+Shift+L" },
    ],
    Ayuda: [
      { label: "Acerca de Data Explorer", action: () => {} },
    ],
  };

  const menuLabels = Object.keys(menus);

  return (
    <div
      className="flex items-stretch bg-gray-900 border-b border-gray-800 h-(--titlebar-height) select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2 px-4 text-sm font-semibold text-gray-200 flex-shrink-0" data-tauri-drag-region>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
        <span data-tauri-drag-region>{title}</span>
      </div>

      <nav className="flex items-stretch gap-0 ml-2" data-tauri-drag-region>
        {menuLabels.map((label) => (
          <div key={label} className="relative flex items-stretch">
            <button
              onClick={() => setOpenMenu(openMenu === label ? null : label)}
              onMouseEnter={() => { if (openMenu) setOpenMenu(label); }}
              className={`px-3 text-sm transition-colors ${
                openMenu === label ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {label}
            </button>
            {openMenu === label && (
              <MenuDropdown items={menus[label]} onClose={() => setOpenMenu(null)} />
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" data-tauri-drag-region />

      <WindowControls />
    </div>
  );
}
