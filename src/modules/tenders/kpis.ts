import type { KpiDef } from "@/modules/_shared/types";
import type { Tender } from "./types";
import { formatCurrency } from "@/lib/format";

export const tenderKpis: KpiDef<Tender>[] = [
  {
    label: "Total",
    compute: (items) => items.length
  },
  {
    label: "Abiertas",
    compute: (items) => items.filter((i) => i.status === "draft" || i.status === "submitted").length
  },
  {
    label: "Win rate",
    compute: (items) => {
      const won = items.filter((i) => i.status === "won").length;
      const decided = items.filter((i) => i.status === "won" || i.status === "lost").length;
      return decided ? `${((won / decided) * 100).toFixed(1)}%` : "0.0%";
    }
  },
  {
    label: "Pipeline potencial",
    compute: (items) =>
      formatCurrency(
        items.filter((i) => i.status === "draft" || i.status === "submitted").reduce((acc, i) => acc + i.amount, 0)
      )
  }
];
