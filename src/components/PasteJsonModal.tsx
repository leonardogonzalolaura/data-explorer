import { useState, useRef, useCallback } from "react";

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

interface PasteJsonModalProps {
  onLoadJson: (jsonText: string, name?: string) => Promise<void>;
  onClose: () => void;
}

export default function PasteJsonModal({ onLoadJson, onClose }: PasteJsonModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleLoad = async () => {
    const trimmed = jsonText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onLoadJson(trimmed, name.trim() || undefined);
      setJsonText("");
      setName("");
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape" && !loading) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="text-sm font-medium text-gray-200">Pegar JSON</span>
        <span className="text-[11px] text-gray-500 font-mono">Ctrl+Shift+J</span>
        <div className="w-px h-5 bg-gray-700" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (opcional)"
          className="w-44 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <div className="flex-1" />
        <button
          onClick={onClose}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-800">
          <pre
            ref={preRef}
            className="absolute inset-0 p-4 text-xs font-mono leading-relaxed overflow-auto pointer-events-none"
            style={{
              background: "transparent",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              color: "#6b7280",
            }}
            dangerouslySetInnerHTML={{
              __html: jsonText
                ? highlightJson(jsonText)
                : "<span style=\"color:#4b5563\">[{ &quot;columna&quot;: &quot;valor&quot; }, ...]</span>",
            }}
          />
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setError(null); }}
            onScroll={handleScroll}
            className="absolute inset-0 block w-full h-full bg-transparent p-4 text-xs font-mono leading-relaxed resize-none focus:outline-none"
            style={{
              color: "transparent",
              caretColor: "#e5e7eb",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              overflow: "auto",
            }}
            autoFocus
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-3 px-6 py-2 border-t border-gray-800 shrink-0 text-xs text-gray-600">
        <button
          onClick={handleLoad}
          disabled={loading || !jsonText.trim()}
          className="px-4 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          {loading ? "Cargando..." : "Cargar"}
        </button>
        <div className="w-px h-4 bg-gray-700" />
        <button
          onClick={() => { setJsonText(""); setError(null); }}
          disabled={!jsonText.trim() || loading}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 transition-colors"
        >
          Limpiar
        </button>
        <span className="text-gray-700">|</span>
        <span>Pegá o escribí JSON válido</span>
        <span className="text-gray-700">|</span>
        <span className="text-gray-600">{jsonText.length.toLocaleString()} caracteres</span>
      </div>
    </div>
  );
}
