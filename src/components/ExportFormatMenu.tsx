import { useState, useRef, useEffect, useCallback } from "react";

interface ExportFormatMenuProps {
  onSelect: (format: string) => void;
}

const FORMATS = [
  { key: "csv", label: "CSV" },
  { key: "parquet", label: "Parquet" },
  { key: "json", label: "JSON" },
];

export default function ExportFormatMenu({ onSelect }: ExportFormatMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = useCallback(() => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[100] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-32"
          style={{ top: pos.top, right: pos.right }}
        >
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => { onSelect(f.key); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
