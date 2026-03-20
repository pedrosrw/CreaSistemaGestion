"use client";

import { ModulePageLayout } from "@/modules/_shared/ui/module-page-layout";
import { tenderColumns } from "./columns";
import { tenderFormFields } from "./form-fields";
import { tenderKpis } from "./kpis";
import { TENDER_STATUS_LABELS } from "./catalogs";
import type { Tender } from "./types";

const defaultFormValues = {
  title: "",
  client: "",
  amount: 0,
  closeDate: "",
  probability: 50,
  responsible: "",
  status: "draft"
};

const statusOptions = Object.entries(TENDER_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function TendersPage() {
  return (
    <ModulePageLayout<Tender>
      title="Licitaciones"
      description="Pipeline de oportunidades y adjudicaciones."
      endpoint="/api/tenders"
      columns={tenderColumns}
      formFields={tenderFormFields}
      kpis={tenderKpis}
      defaultFormValues={defaultFormValues}
      createDrawerTitle="Agregar licitacion"
      createDrawerDescription="Completa los datos base para crear una oportunidad."
      createButtonLabel="Agregar licitacion"
      emptyMessage="Aun no hay licitaciones cargadas."
      keyExtractor={(t) => t.id}
      statusField="status"
      statusOptions={statusOptions}
      searchableFields={["title", "client", "responsible"]}
      searchPlaceholder="Buscar por titulo, cliente o responsable..."
      filters={[
        {
          key: "status",
          label: "Estado",
          options: statusOptions
        }
      ]}
      allowDelete
      deleteConfirmMessage={(t) => `Esta seguro que desea eliminar la licitacion "${t.title}"?`}
    />
  );
}
