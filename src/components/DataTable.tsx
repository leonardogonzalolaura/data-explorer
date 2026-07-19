import { useMemo, useRef, useState, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Dataset } from "../types";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import JsonTreeView from "./JsonTreeView";
import JsonCellValue from "./JsonCellValue";
import NestedTableModal from "./NestedTableModal";

interface DataTableProps {
  dataset: Dataset;
  onOpenSql?: () => void;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none opacity-40">
      <svg
        width="8" height="4" viewBox="0 0 8 4"
        className={direction === "asc" ? "text-blue-400 opacity-100" : ""}
      >
        <path d="M0 4L4 0L8 4Z" fill="currentColor" />
      </svg>
      <svg
        width="8" height="4" viewBox="0 0 8 4"
        className={direction === "desc" ? "text-blue-400 opacity-100" : ""}
      >
        <path d="M0 0L4 4L8 0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

type ViewMode = "virtual" | "paged";
type ViewFormat = "table" | "tree";
const PAGE_SIZES = [100, 500, 1000];

export default function DataTable({ dataset, onOpenSql }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("virtual");
  const [viewFormat, setViewFormat] = useState<ViewFormat>("table");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(500);
  const [nestedTable, setNestedTable] = useState<{ jsonStr: string; label: string; source: string } | null>(null);

  const columns = useMemo<ColumnDef<unknown[]>[]>(
    () =>
      dataset.columns.map((col, colIdx) => ({
        id: col.name,
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 w-full text-left"
          >
            <span className="truncate">{col.name}</span>
            <span className="text-[10px] text-gray-500 font-mono uppercase shrink-0">
              {col.dtype}
            </span>
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
        cell: (info) => <JsonCellValue value={info.getValue()} onOpenNested={(s, l) => setNestedTable({ jsonStr: s, label: l, source: `${dataset.filename} → ${col.name} · fila ${info.row.index + 1}` })} />,
        size: Math.max(200, col.name.length * 10 + 60),
        enableSorting: true,
      })),
    [dataset.columns, sorting]
  );

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

  const table = useReactTable({
    data: displayRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { minSize: 100, size: 200 },
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: viewMode === "virtual" ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: table.getVisibleLeafColumns().length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => table.getVisibleLeafColumns()[i].getSize(),
    overscan: 3,
  });

  const visibleCols = colVirtualizer.getVirtualItems();

  const toggleMode = useCallback(() => {
    setViewMode((m) => (m === "virtual" ? "paged" : "virtual"));
    setPage(0);
  }, []);

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0">
      {viewFormat === "tree" ? (
        <JsonTreeView dataset={dataset} onToggleFormat={() => setViewFormat("table")} />
      ) : (
        <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500 border-b border-gray-800 shrink-0 overflow-x-auto">
        <span className="font-medium text-gray-300 whitespace-nowrap">{dataset.filename}</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{dataset.total_rows.toLocaleString()} filas</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="whitespace-nowrap">{dataset.columns.length} columnas</span>
        <span className="text-gray-600 shrink-0">|</span>
        {onOpenSql && (
          <>
            <button
              onClick={onOpenSql}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              SQL
            </button>
            <span className="text-gray-600 shrink-0">|</span>
          </>
        )}
        <div className="relative flex-1 min-w-[120px] max-w-xs">
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <span className="text-gray-600 whitespace-nowrap">
          {rows.length.toLocaleString()} de {allRows.length.toLocaleString()}
        </span>
        <span className="text-gray-600 shrink-0">|</span>
        <button
          onClick={toggleMode}
          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          {viewMode === "virtual" ? "Paginado" : "Virtual"}
        </button>
        <span className="text-gray-600 shrink-0">|</span>
        <button
          onClick={() => setViewFormat((f) => (f === "table" ? "tree" : "table"))}
          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
        >
          {viewFormat === "table" ? "JSON" : "Tabla"}
        </button>
      </div>

      {/* Table body */}
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0">
        {viewMode === "virtual" ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize() + 36}px`,
              width: `${colVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {/* Header row */}
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
                    className="flex items-center px-3 text-xs font-semibold text-gray-300 border-r border-gray-800 truncate cursor-pointer hover:bg-gray-800/50"
                  >
                    {flexRender(col.columnDef.header, { column: col, header: col.columnDef.header as never, table } as never)}
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
          /* Paginated mode: render all rows directly, no virtualizer */
          <div style={{ minWidth: `${colVirtualizer.getTotalSize()}px` }}>
            {/* Header row */}
            <div className="flex bg-gray-900 border-b border-gray-700 sticky top-0 z-10" style={{ height: "36px" }}>
              {table.getVisibleLeafColumns().map((col) => (
                <div
                  key={col.id}
                  style={{ width: col.getSize(), minWidth: col.getSize() }}
                  className="flex items-center px-3 text-xs font-semibold text-gray-300 border-r border-gray-800 truncate cursor-pointer hover:bg-gray-800/50 shrink-0"
                >
                  {flexRender(col.columnDef.header, { column: col, header: col.columnDef.header as never, table } as never)}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex border-b border-gray-800/50 hover:bg-gray-800/40"
                style={{ height: "32px" }}
              >
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
      </div>

      {/* Pagination bar (only in paged mode) */}
      {viewMode === "paged" && (
        <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-gray-500 border-t border-gray-800 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Filas por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <span className="text-gray-600 shrink-0">|</span>

          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            ◀
          </button>

          <span className="text-gray-400">
            Pág. {safePage + 1} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
          >
            ▶
          </button>
        </div>
      )}
        </>
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
