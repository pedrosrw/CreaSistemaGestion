"use client";

import { useState, useCallback } from "react";
import { useCrudModule } from "@/features/modules/use-crud-module";
import {
  FormDrawer,
  InlineError,
  KpiGrid,
  ModuleActionBar,
  ModulePage,
  Panel,
  Toast
} from "@/features/modules/module-ui";
import { DataTable } from "@/modules/_shared/ui/data-table";
import { FilterBar } from "@/modules/_shared/ui/filter-bar";
import { FormFieldsGrid } from "@/modules/_shared/ui/form-field";
import { ConfirmDialog } from "@/modules/_shared/ui/confirm-dialog";
import { useTableState } from "@/modules/_shared/hooks/use-table-state";
import type { ColumnDef, FormFieldDef, KpiDef, FilterDef, StatusOption } from "@/modules/_shared/types";

type ToastState = { message: string; tone: "info" | "success" | "error" } | null;

type ModulePageLayoutProps<T> = {
  title: string;
  description: string;
  endpoint: string;
  columns: ColumnDef<T>[];
  formFields: FormFieldDef[];
  kpis?: KpiDef<T>[];
  defaultFormValues: Record<string, unknown>;
  createDrawerTitle: string;
  createDrawerDescription?: string;
  createButtonLabel?: string;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  statusField?: string;
  statusOptions?: StatusOption[];
  filters?: FilterDef[];
  searchableFields?: string[];
  searchPlaceholder?: string;
  allowDelete?: boolean;
  deleteConfirmMessage?: (item: T) => string;
  onRowClick?: (item: T) => void;
  panelTitle?: string;
  children?: React.ReactNode;
};

export function ModulePageLayout<T>({
  title,
  description,
  endpoint,
  columns,
  formFields,
  kpis,
  defaultFormValues,
  createDrawerTitle,
  createDrawerDescription,
  createButtonLabel = "Agregar",
  emptyMessage = "Sin datos cargados.",
  keyExtractor,
  statusField,
  statusOptions,
  filters: filterDefs,
  searchableFields,
  searchPlaceholder,
  allowDelete = false,
  deleteConfirmMessage,
  onRowClick,
  panelTitle = "Listado",
  children
}: ModulePageLayoutProps<T>) {
  const { items, error, pending, create, patch, remove } = useCrudModule<T>(endpoint);
  const [toast, setToast] = useState<ToastState>(null);
  const [isCreateDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ ...defaultFormValues });
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const { filtered, search, setSearch, filters, setFilter } = useTableState<T>(items, {
    searchableFields
  });

  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    void create(form).then((ok) => {
      if (!ok) {
        setToast({ message: `No se pudo crear ${title.toLowerCase()}.`, tone: "error" });
        return;
      }
      setToast({ message: `${title} creado exitosamente.`, tone: "success" });
      setCreateDrawerOpen(false);
      setForm({ ...defaultFormValues });
    });
  }

  function handleStatusChange(item: T, newStatus: string) {
    if (!statusField) return;
    void patch({ id: keyExtractor(item), [statusField]: newStatus }).then((ok) => {
      setToast({
        message: ok ? "Estado actualizado." : "No se pudo actualizar estado.",
        tone: ok ? "success" : "error"
      });
    });
  }

  function handleDelete() {
    if (!deleteTarget || !remove) return;
    void remove(keyExtractor(deleteTarget)).then((ok) => {
      setToast({
        message: ok ? "Eliminado exitosamente." : "No se pudo eliminar.",
        tone: ok ? "success" : "error"
      });
      setDeleteTarget(null);
    });
  }

  // Build columns with inline status select if configured
  const effectiveColumns: ColumnDef<T>[] = statusField && statusOptions
    ? columns.map((col) =>
        col.key === statusField
          ? {
              ...col,
              render: (item: T) => (
                <select
                  value={String((item as Record<string, unknown>)[statusField] ?? "")}
                  onChange={(e) => handleStatusChange(item, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )
            }
          : col
      )
    : columns;

  return (
    <ModulePage title={title} description={description}>
      <Toast message={toast?.message ?? null} tone={toast?.tone ?? "info"} />

      {kpis && kpis.length > 0 ? (
        <KpiGrid items={kpis.map((kpi) => ({ label: kpi.label, value: kpi.compute(items) }))} />
      ) : null}

      <ModuleActionBar>
        <button className="btn-primary" type="button" onClick={() => setCreateDrawerOpen(true)}>
          {createButtonLabel}
        </button>
      </ModuleActionBar>

      <FormDrawer
        isOpen={isCreateDrawerOpen}
        title={createDrawerTitle}
        description={createDrawerDescription}
        onClose={() => setCreateDrawerOpen(false)}
      >
        <form className="form-grid" onSubmit={handleCreateSubmit}>
          <FormFieldsGrid fields={formFields} values={form} onChange={handleFieldChange} />
          <button className="btn-primary" type="submit" disabled={pending === "saving"}>
            Guardar
          </button>
          <button className="btn-secondary" type="button" onClick={() => setCreateDrawerOpen(false)}>
            Cancelar
          </button>
        </form>
      </FormDrawer>

      <Panel
        title={panelTitle}
        right={
          <FilterBar
            searchPlaceholder={searchPlaceholder}
            searchValue={search}
            onSearchChange={setSearch}
            filters={filterDefs}
            filterValues={filters}
            onFilterChange={setFilter}
          />
        }
      >
        <InlineError message={error} />
        <DataTable<T>
          columns={effectiveColumns}
          data={filtered}
          keyExtractor={keyExtractor}
          emptyMessage={emptyMessage}
          loading={pending === "loading"}
          onRowClick={onRowClick}
          renderRowActions={
            allowDelete
              ? (item) => (
                  <button
                    className="btn-icon-danger"
                    type="button"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item);
                    }}
                  >
                    ✕
                  </button>
                )
              : undefined
          }
        />
      </Panel>

      {children}

      {allowDelete && (
        <ConfirmDialog
          isOpen={deleteTarget !== null}
          title="Confirmar eliminacion"
          message={
            deleteTarget && deleteConfirmMessage
              ? deleteConfirmMessage(deleteTarget)
              : "Esta seguro que desea eliminar este registro? Esta accion no se puede deshacer."
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={pending === "saving"}
        />
      )}
    </ModulePage>
  );
}
