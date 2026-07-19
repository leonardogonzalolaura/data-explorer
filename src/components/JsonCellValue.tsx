import { useState, useMemo, useCallback, useRef } from "react";

function tryParseJson(raw: unknown): unknown | null {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function isArrayOfObjects(val: unknown): val is Record<string, unknown>[] {
  return Array.isArray(val) && val.length > 0 && val.some((v) => v !== null && typeof v === "object" && !Array.isArray(v));
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function PreviewTree({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const isObj = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;

  if (!isExpandable || !expanded) {
    if (!isExpandable) {
      if (value === null) return <span style={{ color: "#a78bfa", fontStyle: "italic" }}>null</span>;
      if (typeof value === "string") return <span style={{ color: "#22c55e" }}>"{String(value)}"</span>;
      if (typeof value === "number") return <span style={{ color: "#fb923c" }}>{String(value)}</span>;
      if (typeof value === "boolean") return <span style={{ color: "#a78bfa" }}>{String(value)}</span>;
      return <span>{String(value)}</span>;
    }
    const len = isObj ? Object.keys(value as Record<string, unknown>).length : (value as unknown[]).length;
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
        style={{ cursor: "pointer", color: "#60a5fa" }}
        className="hover:underline"
      >
        {isArr ? `[${len} items]` : `{${len} keys}`}
      </span>
    );
  }

  const entries = isObj
    ? Object.entries(value as Record<string, unknown>)
    : (value as unknown[]).map((v, i) => [String(i), v] as const);

  const bracketOpen = isObj ? "{" : "[";
  const bracketClose = isObj ? "}" : "]";

  return (
    <span>
      <span style={{ color: "#9ca3af" }}>{bracketOpen}</span>
      <span className="block" style={{ paddingLeft: "12px", borderLeft: "1px solid rgba(75,85,99,0.3)", margin: "2px 0" }}>
        {entries.slice(0, 20).map(([k, v]) => (
          <div key={k} style={{ lineHeight: "1.4" }}>
            {isObj && <span style={{ color: "#60a5fa" }}>"{k}"</span>}
            {isObj && <span style={{ color: "#6b7280" }}>: </span>}
            {isArr && <span style={{ color: "#6b7280" }}>{k}: </span>}
            <PreviewTree value={v} />
            <span style={{ color: "#6b7280" }}>,</span>
          </div>
        ))}
        {entries.length > 20 && (
          <div style={{ color: "#6b7280", fontStyle: "italic" }}>... {entries.length - 20} más</div>
        )}
      </span>
      <span style={{ color: "#9ca3af" }}>{bracketClose}</span>
      <span
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        style={{ cursor: "pointer", color: "#6b7280", marginLeft: "4px", fontSize: "10px" }}
        className="hover:text-gray-400"
      >▴</span>
    </span>
  );
}

interface JsonCellValueProps {
  value: unknown;
  onOpenNested?: (jsonStr: string, label: string) => void;
}

export default function JsonCellValue({ value, onOpenNested }: JsonCellValueProps) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const parsed = useMemo(() => tryParseJson(value), [value]);
  const rawStr = typeof value === "string" ? value : value !== null && value !== undefined ? String(value) : "";

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawStr).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1200);
    }).catch(() => {});
  }, [rawStr]);

  const handleOpenTable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parsed) return;
    if (isArrayOfObjects(parsed) || isObject(parsed)) {
      const data = isObject(parsed) ? [parsed] : parsed;
      const jsonStr = JSON.stringify(data);
      const label = typeof value === "string"
        ? value.slice(0, 40) + (value.length > 40 ? "..." : "")
        : "datos";
      onOpenNested?.(jsonStr, label);
    }
  }, [parsed, value, onOpenNested]);

  if (parsed) {
    const canShowTable = (isArrayOfObjects(parsed) || isObject(parsed)) && onOpenNested;
    return (
      <div
        className="flex items-center gap-1"
        title={rawStr}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:bg-blue-900/30 transition-colors shrink-0"
          style={{ color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)", backgroundColor: "rgba(96,165,250,0.08)" }}
        >
          <PreviewTree value={parsed} />
        </span>
        {canShowTable && (
          <button
            onClick={handleOpenTable}
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 hover:bg-emerald-900/30 transition-colors"
            style={{ border: "1px solid rgba(52,211,153,0.2)", backgroundColor: "rgba(52,211,153,0.08)" }}
            title="Ver como tabla"
          >Tabla</button>
        )}
        <button
          onClick={handleCopy}
          className="shrink-0 px-1 py-0.5 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          style={{ opacity: hover ? 1 : 0.3 }}
          title="Copiar"
        >
          {copied ? (
            <span style={{ color: "#22c55e" }}>Copiado</span>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-gray-600 italic">null</span>;
  }

  return (
    <span
      className="truncate block flex items-center gap-1"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="truncate">{String(value)}</span>
      {rawStr && (
        <button
          onClick={handleCopy}
          className="shrink-0 px-1 py-0.5 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          style={{ opacity: hover ? 1 : 0.3 }}
          title="Copiar"
        >
          {copied ? (
            <span style={{ color: "#22c55e" }}>Copiado</span>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
