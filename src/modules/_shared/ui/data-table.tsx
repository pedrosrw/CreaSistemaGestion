"use client";

import { useState, useMemo, type ReactNode } from "react";
import type { ColumnDef } from "@/modules/_shared/types";
import { EmptyState, SkeletonRows } from "@/features/modules/module-ui";

type SortDir = "asc" | "desc";

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  renderRowActions?: (item: T) => ReactNode;
};

function getSortValue<T>(item: T, key: string): string | number {
  const value = (item as Record<string, unknown>)[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return value.toLowerCase();
  return String(value ?? "");
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Sin datos.",
  loading = false,
  onRowClick,
  renderRowActions
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (loading) {
    return <SkeletonRows rows={5} />;
  }

  const allColumns = renderRowActions
    ? [...columns, { key: "__actions", header: "", render: renderRowActions, width: "80px" } as ColumnDef<T>]
    : columns;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {allColumns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align ?? "left" }}
                className={col.sortable ? "sortable-header" : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDir === "asc" ? "ascending" : "descending"
                    : undefined
                }
              >
                {col.header}
                {col.sortable && sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr className="table-empty-row">
              <td colSpan={allColumns.length}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : null}
          {sorted.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={onRowClick ? "clickable-row" : undefined}
            >
              {allColumns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
