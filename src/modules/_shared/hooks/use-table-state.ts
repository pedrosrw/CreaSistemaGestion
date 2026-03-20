"use client";

import { useState, useMemo } from "react";

type UseTableStateOptions = {
  searchableFields?: string[];
  initialFilters?: Record<string, string>;
};

export function useTableState<T>(items: T[], options: UseTableStateOptions = {}) {
  const { searchableFields } = options;
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(options.initialFilters ?? {});

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const filtered = useMemo(() => {
    let result = items;

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        const record = item as Record<string, unknown>;
        const fields = searchableFields ?? Object.keys(record);
        return fields.some((field) => {
          const val = record[field];
          return typeof val === "string" && val.toLowerCase().includes(q);
        });
      });
    }

    // Dropdown filters
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      result = result.filter((item) => {
        const record = item as Record<string, unknown>;
        return String(record[key] ?? "") === value;
      });
    }

    return result;
  }, [items, search, filters, searchableFields]);

  return {
    filtered,
    search,
    setSearch,
    filters,
    setFilter
  };
}
