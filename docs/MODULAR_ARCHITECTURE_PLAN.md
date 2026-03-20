# Plan de Arquitectura Modular - ERP CreaSistemaGestion

## Vision

Crear una arquitectura modular estandarizada donde agregar un nuevo modulo ERP sea rapido, consistente y predecible. Cada modulo vive en su propia carpeta con todos sus archivos, y un generador CLI crea el scaffolding automaticamente.

---

## 1. Estructura de Directorios Objetivo

### Por Modulo (estructura final)

```
src/modules/
  _shared/                          # Componentes compartidos entre modulos
    ui/
      data-table.tsx                # Tabla generica con ordenamiento
      form-field.tsx                # Campos de formulario tipados
      filter-bar.tsx                # Barra de busqueda y filtros
      confirm-dialog.tsx            # Dialogo de confirmacion (para DELETE)
      module-page-layout.tsx        # Layout estandar de pagina de modulo
    hooks/
      use-crud-module.ts            # Hook CRUD generico (ya existe, se mueve aqui)
      use-table-state.ts            # Estado de tabla (sort, filter, pagination)
    types.ts                        # Tipos compartidos (ColumnDef, FormFieldDef, etc.)

  _registry/                        # Registro central (se mantiene)
    index.ts                        # MODULE_REGISTRY (importa de cada modulo)
    types.ts                        # ModuleDefinition, AccessPolicy, etc.

  _templates/                       # Plantillas para el generador
    __module_key__/
      types.ts.template
      catalogs.ts.template
      schema.ts.template
      columns.tsx.template
      form-fields.tsx.template
      kpis.ts.template
      page.tsx.template
      registry.ts.template
      route.ts.template

  tenders/                          # Modulo de ejemplo (referencia)
    types.ts                        # Interface Tender, TenderStatus
    catalogs.ts                     # TENDER_STATUSES
    schema.ts                       # tenderCreateSchema, tenderPatchSchema
    columns.tsx                     # Definicion de columnas de la tabla
    form-fields.tsx                 # Definicion de campos del formulario
    kpis.ts                         # Definicion de KPIs del modulo
    page.tsx                        # Componente de pagina (usa shared components)
    registry.ts                     # ModuleDefinition de tenders

  contracts/
    ... (misma estructura)

  operations/
    ...

  finance/
    ...

  hr-recruiting/
    ...

  hr-people/
    types.ts
    catalogs.ts
    schema.ts
    columns.tsx
    form-fields.tsx
    kpis.ts
    page.tsx
    person-detail-page.tsx          # Paginas extra del modulo
    accreditation-panel.tsx
    registry.ts

  correspondence/
    ...

  admin-users/
    ...

  audit/
    ...

  platform/
    ...

  dashboard/
    ...
```

### API Routes (se mantienen en app/)

```
src/app/api/
  [moduleApiBase]/
    route.ts                        # GET/POST/PATCH/DELETE (3-15 lineas)
    [id]/route.ts                   # GET by ID, DELETE by ID (si aplica)
```

### Pages (se mantienen en app/, son thin wrappers)

```
src/app/(protected)/
  licitaciones/page.tsx             # import { TendersPage } from "@/modules/tenders/page"
  contratos/page.tsx
  ...
```

---

## 2. Componentes Compartidos a Crear

### 2.1 `DataTable<T>` - Tabla Generica

```typescript
// src/modules/_shared/ui/data-table.tsx

type ColumnDef<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
};
```

**Funcionalidades:**
- Renderizado declarativo de columnas
- Estado de carga (skeleton rows)
- Estado vacio
- Ordenamiento por columna (click en header)
- Row click handler (para navegacion a detalle)

### 2.2 `FormField` - Campo de Formulario

```typescript
// src/modules/_shared/ui/form-field.tsx

type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "money" | "percentage";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
};

// Renderiza el campo correcto segun tipo
function FormField({ field, value, onChange }: Props)
```

### 2.3 `FilterBar` - Barra de Filtros

```typescript
// src/modules/_shared/ui/filter-bar.tsx

type FilterBarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterDef[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
};

type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string; // "Todos" por defecto
};
```

### 2.4 `ConfirmDialog` - Confirmacion de Eliminacion

```typescript
// src/modules/_shared/ui/confirm-dialog.tsx

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;  // "Eliminar" por defecto
  tone?: "danger" | "warn";
  onConfirm: () => void;
  onCancel: () => void;
};
```

### 2.5 `useTableState` - Hook de Estado de Tabla

```typescript
// src/modules/_shared/hooks/use-table-state.ts

function useTableState<T>(items: T[]) {
  // Busqueda por texto (match en cualquier campo string)
  // Filtros por campo (ej: status === "active")
  // Ordenamiento por columna (asc/desc)
  // Retorna: filteredItems, searchValue, setSearch, sortKey, sortDir, setSort, etc.
}
```

---

## 3. Definicion Declarativa de Modulos

### 3.1 Columns (columnas.tsx)

```typescript
// src/modules/tenders/columns.tsx
import type { ColumnDef } from "@/modules/_shared/types";
import type { Tender } from "./types";
import { formatCurrency, formatDate } from "@/lib/format";

export const tenderColumns: ColumnDef<Tender>[] = [
  { key: "title", header: "Titulo", render: (t) => t.title, sortable: true },
  { key: "client", header: "Cliente", render: (t) => t.client, sortable: true },
  { key: "amount", header: "Monto", render: (t) => formatCurrency(t.amount), sortable: true },
  { key: "closeDate", header: "Cierre", render: (t) => formatDate(t.closeDate), sortable: true },
  { key: "probability", header: "Prob.", render: (t) => `${t.probability}%` },
  { key: "responsible", header: "Responsable", render: (t) => t.responsible },
  { key: "status", header: "Estado", render: (t) => t.status, sortable: true },
];
```

### 3.2 Form Fields (form-fields.tsx)

```typescript
// src/modules/tenders/form-fields.tsx
import type { FormFieldDef } from "@/modules/_shared/types";

export const tenderFormFields: FormFieldDef[] = [
  { name: "title", label: "Nombre", type: "text", required: true },
  { name: "client", label: "Cliente", type: "text", required: true },
  { name: "amount", label: "Monto", type: "money", required: true },
  { name: "closeDate", label: "Cierre", type: "date", required: true },
  { name: "probability", label: "Probabilidad", type: "percentage", required: true, min: 0, max: 100 },
  { name: "responsible", label: "Responsable", type: "text", required: true },
  {
    name: "status", label: "Estado", type: "select", required: true,
    options: [
      { value: "draft", label: "Borrador" },
      { value: "submitted", label: "Presentada" },
      { value: "won", label: "Ganada" },
      { value: "lost", label: "Perdida" },
    ]
  },
];
```

### 3.3 KPIs (kpis.ts)

```typescript
// src/modules/tenders/kpis.ts
import type { KpiDef } from "@/modules/_shared/types";
import type { Tender } from "./types";

export const tenderKpis: KpiDef<Tender>[] = [
  { label: "Total", compute: (items) => items.length },
  { label: "Abiertas", compute: (items) => items.filter(i => i.status === "draft" || i.status === "submitted").length },
  {
    label: "Win rate",
    compute: (items) => {
      const won = items.filter(i => i.status === "won").length;
      const decided = items.filter(i => i.status === "won" || i.status === "lost").length;
      return decided ? `${((won / decided) * 100).toFixed(1)}%` : "0.0%";
    }
  },
];
```

### 3.4 Pagina del Modulo (page.tsx)

```typescript
// src/modules/tenders/page.tsx
"use client";

import { ModulePageLayout } from "@/modules/_shared/ui/module-page-layout";
import { tenderColumns } from "./columns";
import { tenderFormFields } from "./form-fields";
import { tenderKpis } from "./kpis";
import type { Tender } from "./types";

const defaultValues = {
  title: "", client: "", amount: 0, closeDate: "",
  probability: 50, responsible: "", status: "draft"
};

export function TendersPage() {
  return (
    <ModulePageLayout<Tender>
      title="Licitaciones"
      description="Pipeline de oportunidades y adjudicaciones."
      endpoint="/api/tenders"
      columns={tenderColumns}
      formFields={tenderFormFields}
      kpis={tenderKpis}
      defaultFormValues={defaultValues}
      createDrawerTitle="Agregar licitacion"
      createDrawerDescription="Completa los datos base para crear una oportunidad."
      emptyMessage="Aun no hay licitaciones cargadas."
      keyExtractor={(t) => t.id}
      statusField="status"
      statusOptions={[
        { value: "draft", label: "Borrador" },
        { value: "submitted", label: "Presentada" },
        { value: "won", label: "Ganada" },
        { value: "lost", label: "Perdida" },
      ]}
    />
  );
}
```

---

## 4. Cambios a Infraestructura Existente

### 4.1 Agregar DELETE al CRUD generico

```typescript
// src/server/api/crud.ts - agregar:

async function DELETE(req: NextRequest) {
  try {
    const context = await getTenantContext(req, config.moduleKey, "write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new ApiError(400, "Missing id parameter");

    if (config.beforeDelete) {
      await config.beforeDelete({ tenantId: context.tenantId, id });
    }

    await deleteEntity(context.tenantId, collectionKey, id, {
      uid: context.uid, email: context.email, role: context.role
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
```

### 4.2 Agregar `deleteEntity` al repositorio Firestore

```typescript
// src/server/repositories/firestore-repository.ts - agregar:

export async function deleteEntity(
  tenantId: string,
  collectionKey: CollectionKey | AuxiliaryCollectionKey,
  id: string,
  actor: WriteActor
): Promise<void> {
  const docRef = adminDb.collection("tenants").doc(tenantId)
    .collection(collectionKey).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw new ApiError(404, "Entity not found");
  await docRef.delete();
}
```

### 4.3 Agregar `delete` al hook `useCrudModule`

```typescript
// use-crud-module.ts - agregar:

const remove = useCallback(
  async (id: string): Promise<boolean> => {
    setState("saving");
    setError(null);
    try {
      await api.delete(`${endpoint}?id=${id}`);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      return false;
    } finally {
      setState("idle");
    }
  },
  [api, endpoint, load]
);
```

### 4.4 Actualizar el Registro de Modulos

El `registry.ts` central importara las definiciones desde cada modulo:

```typescript
// src/modules/_registry/index.ts
import { tendersModule } from "@/modules/tenders/registry";
import { contractsModule } from "@/modules/contracts/registry";
// ...

export const MODULE_REGISTRY = {
  tenders: tendersModule,
  contracts: contractsModule,
  // ...
} satisfies Record<string, ModuleDefinition>;
```

---

## 5. Generador CLI

### Uso

```bash
npm run generate:module -- --key inventory --label "Inventario" --route "/inventario" --collection "inventoryItems"
```

### Que genera

```
src/modules/inventory/
  types.ts              # Interface InventoryItem + status type
  catalogs.ts           # INVENTORY_ITEM_STATUSES
  schema.ts             # inventoryItemCreateSchema, inventoryItemPatchSchema
  columns.tsx           # Columnas placeholder
  form-fields.tsx       # Campos placeholder
  kpis.ts               # KPIs placeholder
  page.tsx              # Pagina usando ModulePageLayout
  registry.ts           # ModuleDefinition

src/app/api/inventory/
  route.ts              # GET/POST/PATCH/DELETE

src/app/(protected)/inventario/
  page.tsx              # Thin wrapper
```

### Que actualiza automaticamente

1. `src/modules/_registry/index.ts` - Agrega import + entry
2. `src/types/collections.ts` - Agrega collection key (si se mantiene centralizado)

### Script Location

```
scripts/generate-module.ts
```

---

## 6. Estrategia de Migracion

### Fase 1: Infraestructura (sin romper nada)

1. Crear `src/modules/_shared/` con componentes UI compartidos
2. Crear `src/modules/_shared/types.ts` con ColumnDef, FormFieldDef, KpiDef
3. Agregar DELETE a `crud.ts` y `firestore-repository.ts`
4. Agregar `delete` method al `useApiClient`

### Fase 2: Modulo Referencia (tenders)

1. Crear `src/modules/tenders/` con la nueva estructura
2. Migrar types, catalogs, schema desde archivos centralizados
3. Crear columns.tsx, form-fields.tsx, kpis.ts
4. Crear page.tsx usando `ModulePageLayout`
5. Actualizar import en `src/app/(protected)/licitaciones/page.tsx`
6. Verificar que funciona identico al original

### Fase 3: Migrar modulos simples

Orden sugerido (de menor a mayor complejidad):
1. `operations` (una coleccion, CRUD simple)
2. `finance` (una coleccion, CRUD simple)
3. `contracts` (una coleccion, con detail page)
4. `hr_recruiting` (dos colecciones, relacion vacancy→candidate)

### Fase 4: Migrar modulos complejos

5. `hr_people` (4 colecciones, uploads, accreditation matrix)
6. `correspondencia_cruzada` (API custom, file processing)
7. `admin_users` (Firebase Auth integration)
8. `audit` (read-only, custom queries)
9. `platform` (cross-tenant)
10. `dashboard` (aggregation)

### Fase 5: Generador CLI + Documentacion

1. Crear script `generate-module.ts`
2. Crear plantillas en `src/modules/_templates/`
3. Documentar el proceso completo

### Fase 6: Nuevos modulos ERP

Con la infraestructura lista, agregar:
- Inventario y Bodega
- Compras y Proveedores
- Facturacion y Cobros

---

## 7. Tipos Compartidos para la Arquitectura

```typescript
// src/modules/_shared/types.ts

import type { ReactNode } from "react";

export type ColumnDef<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
};

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

export type KpiDef<T> = {
  label: string;
  compute: (items: T[]) => string | number;
};

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
};

export type StatusOption = {
  value: string;
  label: string;
  tone?: "good" | "warn" | "risk";
};

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
```

---

## 8. Compatibilidad

### Backward Compatibility

- Los archivos centralizados (`types/domain.ts`, `server/validation/schemas.ts`, etc.) se mantienen durante la migracion
- Cada modulo re-exporta sus tipos para que imports existentes no se rompan
- La migracion es incremental: modulos nuevos usan la estructura nueva, los existentes migran uno a uno

### API Compatibility

- Las API routes no cambian de URL
- Los endpoints mantienen su contrato (request/response)
- DELETE es una adicion, no un cambio

---

## 9. Checklist para Crear un Modulo Nuevo

Con el generador CLI:

```bash
npm run generate:module -- --key purchase_orders --label "Ordenes de Compra" \
  --route "/compras/ordenes" --collection "purchaseOrders" \
  --group "Compras" --groupRoute "/compras"
```

Sin generador (manual):

- [ ] Crear `src/modules/{key}/types.ts`
- [ ] Crear `src/modules/{key}/catalogs.ts`
- [ ] Crear `src/modules/{key}/schema.ts`
- [ ] Crear `src/modules/{key}/columns.tsx`
- [ ] Crear `src/modules/{key}/form-fields.tsx`
- [ ] Crear `src/modules/{key}/kpis.ts`
- [ ] Crear `src/modules/{key}/page.tsx`
- [ ] Crear `src/modules/{key}/registry.ts`
- [ ] Crear `src/app/api/{apiBase}/route.ts`
- [ ] Crear `src/app/(protected)/{route}/page.tsx`
- [ ] Registrar en `src/modules/_registry/index.ts`
- [ ] Agregar collection key a `src/types/collections.ts`
- [ ] (Opcional) Agregar audit trigger en `functions/src/index.ts`
