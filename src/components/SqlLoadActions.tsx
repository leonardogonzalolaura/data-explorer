interface SqlLoadActionsProps {
  onLoadFile?: () => void;
  onPasteJson?: () => void;
  onConnectS3?: () => void;
}

export default function SqlLoadActions({ onLoadFile, onPasteJson, onConnectS3 }: SqlLoadActionsProps) {
  return (
    <div className="px-3 py-3 border-t border-gray-800 flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium px-1 mb-0.5">
        Cargar fuente
      </span>
      {onLoadFile && (
        <button
          onClick={onLoadFile}
          className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-md transition-colors text-left"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Abrir archivo
          <span className="ml-auto text-[9px] text-gray-600">Ctrl+Shift+O</span>
        </button>
      )}
      {onPasteJson && (
        <button
          onClick={onPasteJson}
          className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-md transition-colors text-left"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          Pegar JSON
          <span className="ml-auto text-[9px] text-gray-600">Ctrl+Shift+J</span>
        </button>
      )}
      {onConnectS3 && (
        <button
          onClick={onConnectS3}
          className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-md transition-colors text-left"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Conectar S3
          <span className="ml-auto text-[9px] text-gray-600">Ctrl+Shift+S</span>
        </button>
      )}
    </div>
  );
}
