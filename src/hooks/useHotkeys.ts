import { useEffect, useCallback } from "react";

type HotkeyHandler = (e: KeyboardEvent) => void;

const handlers = new Map<string, HotkeyHandler[]>();

function normalizeCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  parts.push(e.key.toUpperCase());
  return parts.join("+");
}

function globalKeydown(e: KeyboardEvent) {
  const combo = normalizeCombo(e);
  const comboHandlers = handlers.get(combo);
  if (comboHandlers) {
    for (const handler of comboHandlers) {
      handler(e);
    }
    if (comboHandlers.length > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

let listenerAttached = false;

function ensureListener() {
  if (!listenerAttached) {
    window.addEventListener("keydown", globalKeydown, true);
    listenerAttached = true;
  }
}

export function useHotkeys(combo: string, handler: HotkeyHandler, deps: unknown[] = []) {
  const stableHandler = useCallback(handler, deps);

  useEffect(() => {
    ensureListener();
    const entry = `${combo}`;
    if (!handlers.has(entry)) {
      handlers.set(entry, []);
    }
    const list = handlers.get(entry)!;
    list.push(stableHandler);

    return () => {
      const idx = list.indexOf(stableHandler);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) handlers.delete(entry);
    };
  }, [combo, stableHandler]);
}
