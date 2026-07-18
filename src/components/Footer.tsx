interface FooterProps {
  version?: string;
  filename?: string;
  rowCount?: number;
  columnCount?: number;
  connectionStatus?: string;
}

export default function Footer({
  version = "0.1.0",
  filename,
  rowCount,
  columnCount,
  connectionStatus,
}: FooterProps) {
  return (
    <footer className="flex items-center justify-between bg-gray-900 border-t border-gray-800 px-4 py-1 text-xs text-gray-500 h-7 flex-shrink-0">
      <div className="flex items-center gap-4">
        <span className="font-mono">v{version}</span>
        {filename && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {filename}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {rowCount !== undefined && columnCount !== undefined && (
          <span>{rowCount.toLocaleString()} filas × {columnCount} columnas</span>
        )}
        {connectionStatus && (
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === "connected" ? "bg-green-500" :
              connectionStatus === "error" ? "bg-red-500" :
              "bg-yellow-500"
            }`} />
            {connectionStatus === "connected" ? "Conectado" :
             connectionStatus === "error" ? "Error" :
             connectionStatus === "connecting" ? "Conectando..." :
             "Desconectado"}
          </span>
        )}
      </div>
    </footer>
  );
}
