import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { Dataset } from "../types";
import type { ColumnDef, SortingState, VisibilityState, ColumnOrderState } from "@tanstack/react-table";
import JsonCellValue from "./JsonCellValue";
import NestedTableModal from "./NestedTableModal";
import ExportFormatMenu from "./ExportFormatMenu";

interface SqlResultsProps {
  dataset: Dataset;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none opacity-40">
      <svg width="8" height="4" viewBox="0 0 8 4" className={direction === "asc" ? "text-blue-400 opacity-100" : ""}>
        <path d="M0 4L4 0L8 4Z" fill="currentColor" />
      </svg>
      <svg width="8" height="4" viewBox="0 0 8 4" className={direction === "desc" ? "text-blue-400 opacity-100" : ""}>
        <path d="M0 0L4 4L8 0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

type ViewMode = "virtual" | "paged";
const PAGE_SIZES = [100, 500, 1000] as const;

export default function SqlResults({ dataset }: SqlResultsProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => dataset.columns.map((c) => c.name));
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPos, setColumnsMenuPos] = useState({ top: 0, left: 0 });
  const [columnSearch, setColumnSearch] = useState("");
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("virtual");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(500);
  const [nestedTable, setNestedTable] = useState<{ jsonStr: string; label: string; source: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allRows = useMemo(() => dataset.rows, [dataset.rows]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(allRows.length / pageSize)), [allRows.length, pageSize]);
  const safePage = Math.min(page, totalPages - 1);

  const displayRows = useMemo(() => {
    if (viewMode === "paged") {
      const start = safePage * pageSize;
      return allRows.slice(start, start + pageSize);
    }
    return allRows;
  }, [viewMode, allRows, safePage, pageSize]);

  const columns = useMemo<ColumnDef<unknown[]>[]>(
    () =>
      dataset.columns.map((col, colIdx) => ({
        id: col.name,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 w-full text-left">
            <span className="truncate">{col.name}</span>
            <span className="text-[10px] text-gray-500 font-mono uppercase shrink-0">{col.dtype}</span>
            <SortIcon
              direction={
                sorting.find((s) => s.id === col.name)?.desc === undefined
                  ? false
                  : sorting.find((s) => s.id === col.name)!.desc
                  ? "desc"
                  : "asc"
              }
            />
          </button>
        ),
        accessorFn: (row: unknown[]) => (row as unknown[])[colIdx],
        cell: (info) => <JsonCellValue value={info.getValue()} onOpenNested={(s, l) => setNestedTable({ jsonStr: s, label: l, source: `SQL Result → ${col.name} · fila ${info.row.index + 1}` })} />,
        size: Math.max(200, col.name.length * 10 + 60),
        enableSorting: true,
      })),
    [dataset.columns, sorting]
  );

  const table = useReactTable({
    data: displayRows,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { minSize: 100, size: 200, enableResizing: true },
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: viewMode === "virtual" ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: table.getVisibleLeafColumns().length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => table.getVisibleLeafColumns()[i].getSize(),
    overscan: 3,
  });

  const visibleCols = colVirtualizer.getVirtualItems();

  const toggleMode = useCallback(() => {
    setViewMode((m) => (m === "virtual" ? "paged" : "virtual"));
    setPage(0);
  }, []);

  const columnMenuRef = useRef<HTMLDivElement>(null);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showColumnsMenu) return;
    const handler = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node) && !columnsBtnRef.current?.contains(e.target as Node)) {
        setShowColumnsMenu(false);
        setColumnSearch("");
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColumnsMenu]);

  const handleExport = useCallback(async (format: string) => {
    const ext = format === "csv" ? "csv" : format === "parquet" ? "parquet" : "json";
    const path = await save({
      filters: [{ name: format.toUpperCase(), extensions: [ext] }],
      defaultPath: `SQL_Result.${ext}`,
    });
    if (!path) return;
    try {
      await invoke("export_dataset", { dataset, format, path });
    } catch (err) {
      console.error("Error exportando:", err);
    }
  }, [dataset]);

  const handleDragStart = useCallback((colId: string) => {
    setDragColId(colId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((targetColId: string) => {
    if (!dragColId || dragColId === targetColId) return;
    setColumnOrder((prev) => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(dragColId);
      const toIdx = newOrder.indexOf(targetColId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragColId);
      return newOrder;
    });
    setDragColId(null);
  }, [dragColId]);

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-gray-500 border-b border-gray-800 shrink-0 overflow-x-auto">
        <span className="font-medium text-gray-300 whitespace-nowrap">SQL Result</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{dataset.total_rows.toLocaleString()} filas</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{dataset.columns.length} columnas</span>
        <span className="text-gray-600 shrink-0">|</span>
        <div className="relative flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap font-medium"
            title="Exportar CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar
          </button>
          <ExportFormatMenu onSelect={handleExport} />
        </div>
        <span className="text-gray-600 shrink-0">|</span>
        <div className="relative">
          <button
            ref={columnsBtnRef}
            onClick={() => {
              if (columnsBtnRef.current) {
                const rect = columnsBtnRef.current.getBoundingClientRect();
                setColumnsMenuPos({ top: rect.bottom + 4, left: rect.left });
              }
              setShowColumnsMenu((v) => !v);
            }}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            Columnas
          </button>
          {showColumnsMenu && (
            <div
              ref={columnMenuRef}
              className="fixed z-[100] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-48 max-h-72 overflow-hidden flex flex-col"
              style={{ top: columnsMenuPos.top, left: columnsMenuPos.left }}
            >
              <div className="px-2 py-1.5 border-b border-gray-800">
                <input
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  placeholder="Buscar columna..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1 px-2 py-1 border-b border-gray-800">
                <button
                  onClick={() => { table.getAllLeafColumns().forEach((c) => c.toggleVisibility(true)); }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >Todo</button>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => { table.getAllLeafColumns().forEach((c) => c.toggleVisibility(false)); }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >Ninguno</button>
              </div>
              <div className="overflow-auto flex-1 py-0.5">
                {table.getAllLeafColumns()
                  .filter((col) => col.id.toLowerCase().includes(columnSearch.toLowerCase()))
                  .map((col) => (
                    <label key={col.id} className="flex items-center gap-2 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 cursor-pointer">
                      <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} className="accent-blue-500" />
                      <span className="truncate">{col.id}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-gray-600 shrink-0">|</span>
        <div className="flex-1" />
        <div className="relative min-w-[100px] max-w-[180px]">
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <span className="text-gray-600 whitespace-nowrap">{rows.length.toLocaleString()} de {allRows.length.toLocaleString()}</span>
        <span className="text-gray-600 shrink-0">|</span>
        <button
          onClick={toggleMode}
          className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          {viewMode === "virtual" ? "Paginado" : "Virtual"}
        </button>
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          minWidth: 0,
          overflowY: "scroll",
          overflowX: "auto",
        }}
      >
        {viewMode === "virtual" ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize() + 36}px`,
              width: `${colVirtualizer.getTotalSize()}px`,
              position: "relative",
              minHeight: "100%",
            }}
          >
            {/* Header */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                height: "36px",
                width: `${colVirtualizer.getTotalSize()}px`,
              }}
              className="bg-gray-900 border-b border-gray-700"
            >
              {visibleCols.map((vc) => {
                const col = table.getVisibleLeafColumns()[vc.index];
                const header = table.getHeaderGroups()[0]?.headers.find((h) => h.column.id === col.id);
                return (
                  <div
                    key={col.id}
                    style={{
                      width: col.getSize(),
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      transform: `translateX(${vc.start}px)`,
                    }}
                    className={`flex items-center px-3 text-xs font-semibold text-gray-300 border-r border-gray-800 truncate cursor-pointer hover:bg-gray-800/50 ${dragColId === col.id ? "opacity-50" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(col.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
                    onDragEnd={() => setDragColId(null)}
                  >
                    {flexRender(col.columnDef.header, { column: col, header: col.columnDef.header as never, table } as never)}
                    {header && (
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); header.getResizeHandler()(e as unknown); }}
                        onTouchStart={(e) => { e.stopPropagation(); header.getResizeHandler()(e as unknown); }}
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Virtual rows */}
            {rowVirtualizer.getVirtualItems().map((vr) => {
              const row = rows[vr.index];
              return (
                <div
                  key={row.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${colVirtualizer.getTotalSize()}px`,
                    height: `${vr.size}px`,
                    transform: `translateY(${vr.start + 36}px)`,
                  }}
                  className="flex border-b border-gray-800/50 hover:bg-gray-800/40"
                >
                  {visibleCols.map((vc) => {
                    const cell = row.getVisibleCells()[vc.index];
                    return (
                      <div
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          transform: `translateX(${vc.start}px)`,
                        }}
                        className="flex items-center px-3 text-xs text-gray-400 border-r border-gray-800/30 truncate"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* Paginated mode */
          <div style={{ minWidth: `${colVirtualizer.getTotalSize()}px` }}>
            <div className="flex bg-gray-900 border-b border-gray-700 sticky top-0 z-10" style={{ height: "36px" }}>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <div
                  key={header.id}
                  style={{ width: header.getSize(), minWidth: header.getSize() }}
                  className={`flex items-center px-3 text-xs font-semibold text-gray-300 border-r border-gray-800 truncate cursor-pointer hover:bg-gray-800/50 shrink-0 relative ${dragColId === header.column.id ? "opacity-50" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(header.column.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => { e.preventDefault(); handleDrop(header.column.id); }}
                  onDragEnd={() => setDragColId(null)}
                >
                  {flexRender(header.column.columnDef.header, { column: header.column, header: header.column.columnDef.header as never, table } as never)}
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); header.getResizeHandler()(e as unknown); }}
                    onTouchStart={(e) => { e.stopPropagation(); header.getResizeHandler()(e as unknown); }}
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 shrink-0"
                  />
                </div>
              ))}
            </div>
            {rows.map((row) => (
              <div key={row.id} className="flex border-b border-gray-800/50 hover:bg-gray-800/40" style={{ height: "32px" }}>
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                    className="flex items-center px-3 text-xs text-gray-400 border-r border-gray-800/30 truncate shrink-0"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {/* Spacer to ensure scrollability when content is short */}
        <div style={{ minHeight: "1px" }} />
      </div>

      {/* Pagination bar */}
      {viewMode === "paged" && (
        <div className="flex items-center gap-3 px-4 py-1 text-xs text-gray-500 border-t border-gray-800 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Filas por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              {PAGE_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <span className="text-gray-600 shrink-0">|</span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >◀</button>
          <span className="text-gray-400">Pág. {safePage + 1} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >▶</button>
        </div>
      )}
    </div>
    {nestedTable && (
      <NestedTableModal
        jsonStr={nestedTable.jsonStr}
        label={nestedTable.label}
        source={nestedTable.source}
        onClose={() => setNestedTable(null)}
      />
    )}
    </>
  );
}
