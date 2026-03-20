import type { ColumnDef } from "@/modules/_shared/types";
import type { Tender } from "./types";
import { formatCurrency, formatDate } from "@/lib/format";
import { TENDER_STATUS_LABELS } from "./catalogs";

export const tenderColumns: ColumnDef<Tender>[] = [
  { key: "title", header: "Titulo", render: (t) => t.title, sortable: true },
  { key: "client", header: "Cliente", render: (t) => t.client, sortable: true },
  { key: "amount", header: "Monto", render: (t) => formatCurrency(t.amount), sortable: true },
  { key: "closeDate", header: "Cierre", render: (t) => formatDate(t.closeDate), sortable: true },
  { key: "probability", header: "Prob.", render: (t) => `${t.probability}%` },
  { key: "responsible", header: "Responsable", render: (t) => t.responsible, sortable: true },
  { key: "status", header: "Estado", render: (t) => TENDER_STATUS_LABELS[t.status] ?? t.status, sortable: true }
];
