import type { ModuleDefinition } from "@/modules/_registry/types";
import { buildAccessPolicy } from "@/modules/_registry/helpers";

export const tendersModule: ModuleDefinition = {
  moduleKey: "tenders",
  label: "Licitaciones",
  route: "/licitaciones",
  apiBase: "/api/tenders",
  collectionKeys: ["tenders"],
  primaryCollection: "tenders",
  enabled: true,
  accessPolicy: buildAccessPolicy(
    ["platform_admin", "tenant_admin", "tenant_manager", "tender_lead", "contract_manager"],
    ["platform_admin", "tenant_admin", "tenant_manager", "tender_lead"]
  ),
  relations: {
    default: []
  },
  dashboardContributors: ["openTenders"],
  navigation: {
    label: "Licitaciones",
    href: "/licitaciones",
    order: 20,
    visibleForRoles: ["platform_admin", "tenant_admin", "tenant_manager", "tender_lead"]
  }
};
