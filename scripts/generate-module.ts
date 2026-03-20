/**
 * Module Generator CLI
 *
 * Usage:
 *   npm run generate:module -- --key inventory --label "Inventario" \
 *     --route "/inventario" --collection "inventoryItems" \
 *     --statuses "active,inactive,archived" \
 *     --group "Logistica" --groupRoute "/logistica"
 *
 * This generates all files needed for a new ERP module:
 *   - src/modules/{key}/types.ts
 *   - src/modules/{key}/catalogs.ts
 *   - src/modules/{key}/schema.ts
 *   - src/modules/{key}/columns.tsx
 *   - src/modules/{key}/form-fields.ts
 *   - src/modules/{key}/kpis.ts
 *   - src/modules/{key}/page.tsx
 *   - src/modules/{key}/registry.ts
 *   - src/app/api/{key}/route.ts
 *   - src/app/(protected)/{route}/page.tsx
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const moduleKey = args.key;
const moduleLabel = args.label;
const moduleRoute = args.route;
const collectionName = args.collection;
const statusesRaw = args.statuses || "active,inactive";
const groupLabel = args.group;
const groupRoute = args.groupRoute;

if (!moduleKey || !moduleLabel || !moduleRoute || !collectionName) {
  console.error(`
Usage:
  npm run generate:module -- --key <key> --label <label> --route <route> --collection <collection>

Required:
  --key         Module key (e.g. "inventory")
  --label       Display label (e.g. "Inventario")
  --route       Frontend route (e.g. "/inventario")
  --collection  Firestore collection name (e.g. "inventoryItems")

Optional:
  --statuses    Comma-separated statuses (default: "active,inactive")
  --group       Navigation group label (e.g. "Logistica")
  --groupRoute  Navigation group route (e.g. "/logistica")
`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Derived names
// ---------------------------------------------------------------------------

const statuses = statusesRaw.split(",").map((s) => s.trim());

function toPascalCase(str: string): string {
  return str
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s/g, "");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toConstCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toUpperCase();
}

const entityPascal = toPascalCase(collectionName).replace(/s$/, ""); // inventoryItems -> InventoryItem
const entityCamel = toCamelCase(entityPascal); // inventoryItem
const entityConst = toConstCase(collectionName); // INVENTORY_ITEMS
const statusConstName = `${toConstCase(entityPascal)}_STATUSES`; // INVENTORY_ITEM_STATUSES
const statusTypeName = `${entityPascal}Status`; // InventoryItemStatus

const ROOT = path.resolve(process.cwd());
const MODULE_DIR = path.join(ROOT, "src", "modules", moduleKey);
const API_DIR = path.join(ROOT, "src", "app", "api", moduleKey);
const routeSegments = moduleRoute.replace(/^\//, "").split("/");
const PAGE_DIR = path.join(ROOT, "src", "app", "(protected)", ...routeSegments);

// ---------------------------------------------------------------------------
// File generators
// ---------------------------------------------------------------------------

function genTypes(): string {
  return `import type { BaseEntity } from "@/types/domain";
import type { ${statusConstName} } from "./catalogs";

export type ${statusTypeName} = (typeof ${statusConstName})[number];

export interface ${entityPascal} extends BaseEntity {
  name: string;
  status: ${statusTypeName};
  // TODO: Add entity-specific fields
}
`;
}

function genCatalogs(): string {
  const statusArray = statuses.map((s) => `"${s}"`).join(", ");
  const labelsEntries = statuses.map((s) => `  ${s}: "${toPascalCase(s)}"`).join(",\n");
  return `export const ${statusConstName} = [${statusArray}] as const;

export const ${toConstCase(entityPascal)}_STATUS_LABELS: Record<string, string> = {
${labelsEntries}
};
`;
}

function genSchema(): string {
  return `import { z } from "zod";
import { ${statusConstName} } from "./catalogs";

export const ${entityCamel}CreateSchema = z.object({
  name: z.string().min(2),
  status: z.enum(${statusConstName})
  // TODO: Add entity-specific fields
});

export const ${entityCamel}PatchSchema = ${entityCamel}CreateSchema.partial().extend({
  id: z.string().min(3)
});
`;
}

function genColumns(): string {
  return `import type { ColumnDef } from "@/modules/_shared/types";
import type { ${entityPascal} } from "./types";
import { ${toConstCase(entityPascal)}_STATUS_LABELS } from "./catalogs";

export const ${entityCamel}Columns: ColumnDef<${entityPascal}>[] = [
  { key: "name", header: "Nombre", render: (item) => item.name, sortable: true },
  {
    key: "status",
    header: "Estado",
    render: (item) => ${toConstCase(entityPascal)}_STATUS_LABELS[item.status] ?? item.status,
    sortable: true
  }
  // TODO: Add more columns
];
`;
}

function genFormFields(): string {
  const labelsImport = `${toConstCase(entityPascal)}_STATUS_LABELS`;
  return `import type { FormFieldDef } from "@/modules/_shared/types";
import { ${labelsImport} } from "./catalogs";

export const ${entityCamel}FormFields: FormFieldDef[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  {
    name: "status",
    label: "Estado",
    type: "select",
    required: true,
    options: Object.entries(${labelsImport}).map(([value, label]) => ({ value, label }))
  }
  // TODO: Add more fields
];
`;
}

function genKpis(): string {
  return `import type { KpiDef } from "@/modules/_shared/types";
import type { ${entityPascal} } from "./types";

export const ${entityCamel}Kpis: KpiDef<${entityPascal}>[] = [
  {
    label: "Total",
    compute: (items) => items.length
  },
  {
    label: "Activos",
    compute: (items) => items.filter((i) => i.status === "active").length
  }
  // TODO: Add module-specific KPIs
];
`;
}

function genPage(): string {
  const labelsImport = `${toConstCase(entityPascal)}_STATUS_LABELS`;
  return `"use client";

import { ModulePageLayout } from "@/modules/_shared/ui/module-page-layout";
import { ${entityCamel}Columns } from "./columns";
import { ${entityCamel}FormFields } from "./form-fields";
import { ${entityCamel}Kpis } from "./kpis";
import { ${labelsImport} } from "./catalogs";
import type { ${entityPascal} } from "./types";

const defaultFormValues = {
  name: "",
  status: "${statuses[0]}"
  // TODO: Add default values for all fields
};

const statusOptions = Object.entries(${labelsImport}).map(([value, label]) => ({ value, label }));

export function ${toPascalCase(moduleKey)}Page() {
  return (
    <ModulePageLayout<${entityPascal}>
      title="${moduleLabel}"
      description="Gestion de ${moduleLabel.toLowerCase()}."
      endpoint="/api/${moduleKey}"
      columns={${entityCamel}Columns}
      formFields={${entityCamel}FormFields}
      kpis={${entityCamel}Kpis}
      defaultFormValues={defaultFormValues}
      createDrawerTitle="Agregar ${moduleLabel.toLowerCase()}"
      createButtonLabel="Agregar"
      emptyMessage="Aun no hay registros cargados."
      keyExtractor={(item) => item.id}
      statusField="status"
      statusOptions={statusOptions}
      searchableFields={["name"]}
      searchPlaceholder="Buscar por nombre..."
      filters={[
        {
          key: "status",
          label: "Estado",
          options: statusOptions
        }
      ]}
      allowDelete
    />
  );
}
`;
}

function genRegistry(): string {
  const navConfig = groupLabel
    ? `
  navigation: {
    label: "${moduleLabel}",
    href: "${moduleRoute}",
    order: 200,
    groupLabel: "${groupLabel}",
    groupHref: "${groupRoute || moduleRoute}",
    groupOrder: 190,
    visibleForRoles: ["platform_admin", "tenant_admin", "tenant_manager"]
  }`
    : `
  navigation: {
    label: "${moduleLabel}",
    href: "${moduleRoute}",
    order: 200,
    visibleForRoles: ["platform_admin", "tenant_admin", "tenant_manager"]
  }`;

  return `import type { ModuleDefinition } from "@/modules/_registry/types";
import { buildAccessPolicy } from "@/modules/_registry/helpers";

export const ${entityCamel}Module: ModuleDefinition = {
  moduleKey: "${moduleKey}",
  label: "${moduleLabel}",
  route: "${moduleRoute}",
  apiBase: "/api/${moduleKey}",
  collectionKeys: ["${collectionName}" as never],
  primaryCollection: "${collectionName}" as never,
  enabled: true,
  accessPolicy: buildAccessPolicy(
    ["platform_admin", "tenant_admin", "tenant_manager"],
    ["platform_admin", "tenant_admin", "tenant_manager"]
  ),
  relations: {
    default: []
  },${navConfig}
};
`;
}

function genApiRoute(): string {
  return `import { buildCrudHandlers } from "@/server/api/crud";
import { ${entityCamel}CreateSchema, ${entityCamel}PatchSchema } from "@/modules/${moduleKey}/schema";

const handlers = buildCrudHandlers({
  moduleKey: "${moduleKey}" as never,
  collectionKey: "${collectionName}" as never,
  createSchema: ${entityCamel}CreateSchema,
  patchSchema: ${entityCamel}PatchSchema,
  allowDelete: true
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
`;
}

function genAppPage(): string {
  const pagePascal = toPascalCase(moduleKey);
  return `import { ${pagePascal}Page } from "@/modules/${moduleKey}/page";

export default function Page() {
  return <${pagePascal}Page />;
}
`;
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

function writeFile(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(filePath)) {
    console.warn(`  SKIP (exists): ${path.relative(ROOT, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  CREATE: ${path.relative(ROOT, filePath)}`);
}

console.log(`\nGenerating module: ${moduleKey}`);
console.log(`  Entity: ${entityPascal}`);
console.log(`  Collection: ${collectionName}`);
console.log(`  Route: ${moduleRoute}`);
console.log(`  Statuses: ${statuses.join(", ")}\n`);

// Module files
writeFile(path.join(MODULE_DIR, "types.ts"), genTypes());
writeFile(path.join(MODULE_DIR, "catalogs.ts"), genCatalogs());
writeFile(path.join(MODULE_DIR, "schema.ts"), genSchema());
writeFile(path.join(MODULE_DIR, "columns.tsx"), genColumns());
writeFile(path.join(MODULE_DIR, "form-fields.ts"), genFormFields());
writeFile(path.join(MODULE_DIR, "kpis.ts"), genKpis());
writeFile(path.join(MODULE_DIR, "page.tsx"), genPage());
writeFile(path.join(MODULE_DIR, "registry.ts"), genRegistry());

// API route
writeFile(path.join(API_DIR, "route.ts"), genApiRoute());

// App page
writeFile(path.join(PAGE_DIR, "page.tsx"), genAppPage());

console.log(`
Done! Next steps:
  1. Add "${collectionName}" to ENTITY_COLLECTION_KEYS in src/types/collections.ts
  2. Add the entity interface to src/types/domain.ts (or use the one in src/modules/${moduleKey}/types.ts)
  3. Register the module in src/modules/_registry/index.ts (when ready)
  4. Customize the generated files (add fields, columns, KPIs, etc.)
  5. (Optional) Add audit trigger in functions/src/index.ts
`);
