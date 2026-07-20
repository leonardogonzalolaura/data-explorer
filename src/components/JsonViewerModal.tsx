import { useMemo, useState, useCallback } from "react";

function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const tokens: { text: string; color: string }[] = [];
  const re = /("(?:[^"\\]|\\.)*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([{}[\]])|(.)/g;
  let m: RegExpExecArray | null;
  let lastIndex = 0;

  while ((m = re.exec(escaped)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ text: escaped.slice(lastIndex, m.index), color: "#6b7280" });
    }
    lastIndex = re.lastIndex;

    if (m[1]) {
      if (m[2] === ":") {
        tokens.push({ text: m[1], color: "#60a5fa" });
        tokens.push({ text: ":", color: "#6b7280" });
      } else {
        tokens.push({ text: m[1], color: "#22c55e" });
      }
    } else if (m[3]) {
      tokens.push({ text: m[3], color: "#a78bfa" });
    } else if (m[4]) {
      tokens.push({ text: m[4], color: "#fb923c" });
    } else if (m[5]) {
      tokens.push({ text: m[5], color: "#9ca3af" });
    } else if (m[6]) {
      tokens.push({ text: m[6], color: "#6b7280" });
    }
  }
  if (lastIndex < escaped.length) {
    tokens.push({ text: escaped.slice(lastIndex), color: "#6b7280" });
  }

  return tokens.map((t) => `<span style="color:${t.color}">${t.text}</span>`).join("");
}

interface JsonViewerModalProps {
  value: unknown;
  label: string;
  onClose: () => void;
}

export default function JsonViewerModal({ value, label, onClose }: JsonViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const jsonStr = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  const highlighted = useMemo(() => highlightJson(jsonStr), [jsonStr]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [jsonStr]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200 truncate">{label}</span>
        </div>
        <div className="flex-1 min-w-2" />
        <span className="text-[11px] text-gray-600 font-mono hidden sm:inline">
          {jsonStr.length.toLocaleString()} caracteres
        </span>
        <div className="w-px h-5 bg-gray-700 hidden sm:block" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-green-400">Copiado</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          title="Cerrar (Escape)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <pre
          className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
