import type { UserRole } from "@/types/auth";
import type { CollectionKey } from "@/types/collections";

export type AccessAction = "read" | "write";

export type AccessPolicy = Record<UserRole, Record<AccessAction, boolean>>;

export type RelationDefinition = {
  field: string;
  targetCollection: CollectionKey;
  required?: boolean;
  label?: string;
};

export type RelationSetMap = Record<string, RelationDefinition[]>;

export type DashboardMetricKey =
  | "openTenders"
  | "activeContracts"
  | "riskContracts"
  | "blockedTasks"
  | "monthNetFlow"
  | "openVacancies"
  | "activeCandidates"
  | "expiredDocuments";

export type ModuleNavigation = {
  label: string;
  href: string;
  order: number;
  groupLabel?: string;
  groupHref?: string;
  groupOrder?: number;
  visibleForRoles?: UserRole[];
};

export type ModuleDefinition = {
  moduleKey: string;
  label: string;
  route: string;
  apiBase: string;
  collectionKeys: CollectionKey[];
  primaryCollection?: CollectionKey;
  enabled: boolean;
  accessPolicy: AccessPolicy;
  relations?: RelationSetMap;
  dashboardContributors?: DashboardMetricKey[];
  navigation?: ModuleNavigation;
};
