import { useMemo, useRef, useState } from "react";
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

export default function DataTable({ dataset, onOpenSql }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

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
        cell: (info) => {
          const val = info.getValue();
          if (val === null || val === undefined) {
            return <span className="text-gray-600 italic">null</span>;
          }
          return String(val);
        },
        size: Math.max(120, col.name.length * 10 + 60),
        enableSorting: true,
      })),
    [dataset.columns, sorting]
  );

  const table = useReactTable({
    data: dataset.rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { minSize: 60, size: 150 },
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
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
  const visibleRows = rowVirtualizer.getVirtualItems();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500 border-b border-gray-800 shrink-0">
        <span className="font-medium text-gray-300">{dataset.filename}</span>
        <span className="text-gray-600">|</span>
        <span>{dataset.total_rows.toLocaleString()} filas</span>
        <span className="text-gray-600">|</span>
        <span>{dataset.columns.length} columnas</span>
        <span className="text-gray-600">|</span>
        {onOpenSql && (
          <>
            <button
              onClick={onOpenSql}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              SQL
            </button>
            <span className="text-gray-600">|</span>
          </>
        )}
        <div className="relative flex-1 max-w-xs">
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar en toda la tabla..."
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
        <span className="text-gray-600">
          {rows.length.toLocaleString()} de {dataset.total_rows.toLocaleString()} filas
        </span>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize() + 36}px`,
            width: `${colVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
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

          {visibleRows.map((vr) => {
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
      </div>
    </div>
  );
}
