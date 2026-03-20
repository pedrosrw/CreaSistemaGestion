import type { ReactNode } from "react";

/** Column definition for DataTable */
export type ColumnDef<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
};

/** Form field definition for declarative forms */
export type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "money" | "percentage";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  colSpan?: 1 | 2;
};

/** KPI definition for module dashboards */
export type KpiDef<T> = {
  label: string;
  compute: (items: T[]) => string | number;
};

/** Filter dropdown definition */
export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
};

/** Status option for inline status selects */
export type StatusOption = {
  value: string;
  label: string;
  tone?: "good" | "warn" | "risk";
};

/** Full page config for ModulePageLayout */
export type ModulePageConfig<T> = {
  title: string;
  description: string;
  endpoint: string;
  columns: ColumnDef<T>[];
  formFields: FormFieldDef[];
  kpis?: KpiDef<T>[];
  defaultFormValues: Record<string, unknown>;
  createDrawerTitle: string;
  createDrawerDescription?: string;
  emptyMessage: string;
  keyExtractor: (item: T) => string;
  statusField?: string;
  statusOptions?: StatusOption[];
  filters?: FilterDef[];
  searchableFields?: string[];
  allowDelete?: boolean;
  onRowClick?: (item: T) => void;
};
