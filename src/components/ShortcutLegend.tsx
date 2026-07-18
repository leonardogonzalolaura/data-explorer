import { getShortcutsByCategory } from "../lib/shortcuts";

interface ShortcutLegendProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutLegend({ open, onClose }: ShortcutLegendProps) {
  if (!open) return null;

  const grouped = getShortcutsByCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-dropdown w-full max-w-lg max-h-[70vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Atajos de teclado</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {Object.entries(grouped).map(([category, shortcuts]) => (
          <div key={category} className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</h3>
            <div className="space-y-1">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-800">
                  <span className="text-sm text-gray-300">{s.description}</span>
                  <kbd className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400 font-mono">
                    {s.combo}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-600 mt-4 text-center">
          Presiona <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">Ctrl+Shift+L</kbd> para abrir/cerrar
        </p>
      </div>
    </div>
  );
}
