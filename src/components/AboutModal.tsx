interface AboutModalProps {
  version: string;
  onClose: () => void;
}

export default function AboutModal({ version, onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-200">Data Explorer</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Versión {version}</p>
          </div>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Navegá, consultá y explorá archivos de datos (JSON, CSV, Parquet, Excel)
            con SQL integrado y conexión S3. Visualizá estructuras anidadas,
            ejecutá consultas y exportá resultados desde una interfaz nativa.
          </p>

          <div className="w-full h-px bg-gray-800" />

          <a
            href="https://atechlo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            Producto de <span className="font-medium text-gray-500">atechlo.com</span>
          </a>
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
