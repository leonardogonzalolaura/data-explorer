import type { Shortcut } from "../types";

export const SHORTCUTS: Shortcut[] = [
  { key: "O", description: "Abrir archivo", category: "Archivo", combo: "Ctrl+Shift+O" },
  { key: "E", description: "Exportar datos", category: "Archivo", combo: "Ctrl+Shift+E" },
  { key: "F", description: "Buscar / filtrar", category: "Datos", combo: "Ctrl+Shift+F" },
  { key: "K", description: "Editor SQL", category: "Datos", combo: "Ctrl+Shift+K" },
  { key: "J", description: "Pegar JSON", category: "Archivo", combo: "Ctrl+Shift+J" },
  { key: "S", description: "Conectar S3", category: "Archivo", combo: "Ctrl+Shift+S" },
  { key: "L", description: "Atajos de teclado", category: "General", combo: "Ctrl+Shift+L" },
  { key: "T", description: "Nueva pestaña", category: "General", combo: "Ctrl+Shift+T" },
  { key: "W", description: "Cerrar pestaña", category: "General", combo: "Ctrl+Shift+W" },
  { key: "D", description: "Modo oscuro / claro", category: "General", combo: "Ctrl+Shift+D" },
  { key: "I", description: "Perfil de datos", category: "Datos", combo: "Ctrl+Shift+I" },
  { key: "Q", description: "Ejecutar query SQL", category: "Datos", combo: "Ctrl+Enter" },
];

export function getShortcutByKey(key: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.key === key.toUpperCase());
}

export function getShortcutsByCategory(): Record<string, Shortcut[]> {
  const grouped: Record<string, Shortcut[]> = {};
  for (const s of SHORTCUTS) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }
  return grouped;
}
