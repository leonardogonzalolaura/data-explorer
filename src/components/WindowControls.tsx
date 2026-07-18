import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized((v) => !v);
  };
  const handleClose = () => appWindow.close();

  return (
    <div className="flex items-stretch h-full">
      <button
        onClick={handleMinimize}
        className="px-3 hover:bg-gray-700 transition-colors flex items-center text-gray-400 hover:text-white"
        aria-label="Minimizar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={handleMaximize}
        className="px-3 hover:bg-gray-700 transition-colors flex items-center text-gray-400 hover:text-white"
        aria-label={isMaximized ? "Restaurar" : "Maximizar"}
      >
        {isMaximized ? (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2.5" y="4" width="6" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="3.5" y="2" width="7" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="2" width="8" height="8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        onClick={handleClose}
        className="px-3 hover:bg-red-600 transition-colors flex items-center text-gray-400 hover:text-white"
        aria-label="Cerrar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}
