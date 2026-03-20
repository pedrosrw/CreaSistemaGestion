"use client";

import type { FilterDef } from "@/modules/_shared/types";

type FilterBarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterDef[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
};

export function FilterBar({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={searchPlaceholder}
      />
      {filters?.map((filter) => (
        <select
          key={filter.key}
          className="filter-select"
          value={filterValues[filter.key] ?? ""}
          onChange={(e) => onFilterChange(filter.key, e.target.value)}
          aria-label={filter.label}
        >
          <option value="">{filter.allLabel ?? `Todos - ${filter.label}`}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
