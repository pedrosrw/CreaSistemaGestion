import type { FormFieldDef } from "@/modules/_shared/types";
import { TENDER_STATUS_LABELS } from "./catalogs";

export const tenderFormFields: FormFieldDef[] = [
  { name: "title", label: "Nombre", type: "text", required: true },
  { name: "client", label: "Cliente", type: "text", required: true },
  { name: "amount", label: "Monto", type: "money", required: true },
  { name: "closeDate", label: "Cierre", type: "date", required: true },
  { name: "probability", label: "Probabilidad", type: "percentage", required: true, min: 0, max: 100 },
  { name: "responsible", label: "Responsable", type: "text", required: true },
  {
    name: "status",
    label: "Estado",
    type: "select",
    required: true,
    options: Object.entries(TENDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))
  }
];
