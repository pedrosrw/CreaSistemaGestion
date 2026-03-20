# Analisis del Proyecto - CreaSistemaGestion

## Resumen Ejecutivo

Sistema de gestion integral (ERP) para empresas contratistas PyME, construido como SaaS multi-tenant con **Next.js 14** (App Router) + **Google Firebase** (Auth, Firestore, Storage, Cloud Functions).

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript 5.7 |
| Backend | Next.js API Routes (serverless) |
| Base de datos | Cloud Firestore (multi-tenant) |
| Autenticacion | Firebase Auth (email/password + Google OAuth) |
| Almacenamiento | Firebase Cloud Storage |
| Cloud Functions | Firebase Functions v2 (triggers + scheduled) |
| Validacion | Zod 3.23 |
| Testing | Vitest 2.1 |
| CSS | Custom CSS (sin framework) |

---

## Arquitectura Actual

### Multi-Tenancy

Todas las colecciones de datos viven bajo la ruta:
```
/tenants/{tenantId}/{collectionKey}/{documentId}
```

Resolucion de tenant: host del dominio → claims del token → membership del usuario.

### Roles (RBAC)

8 roles definidos en `src/types/auth.ts`:

| Rol | Nivel |
|-----|-------|
| `platform_admin` | Administra toda la plataforma SaaS |
| `tenant_admin` | Administra un tenant completo |
| `tenant_manager` | Gestion general del tenant |
| `tender_lead` | Lider de licitaciones |
| `contract_manager` | Gestion de contratos |
| `finance` | Finanzas |
| `hr` | Recursos humanos |
| `viewer` | Solo lectura |

### Modulos Existentes (11)

| # | Module Key | Label | Ruta | Colecciones |
|---|-----------|-------|------|-------------|
| 1 | `dashboard` | Dashboard | `/dashboard` | - |
| 2 | `tenders` | Licitaciones | `/licitaciones` | tenders |
| 3 | `contracts` | Contratos | `/contratos` | contracts |
| 4 | `operations` | Operaciones | `/operaciones` | operationTasks |
| 5 | `finance` | Finanzas | `/finanzas` | financeEntries |
| 6 | `hr_recruiting` | RRHH - Reclutamiento | `/rrhh/reclutamiento` | vacancies, candidates |
| 7 | `hr_people` | RRHH - Personas | `/rrhh/personas` | peopleRecords, personDocuments, personContractAssignments, accreditationTemplates |
| 8 | `correspondencia_cruzada` | Correspondencia | `/correspondencia-cruzada` | correspondenceTemplates, correspondenceDataSources, correspondenceJobs |
| 9 | `admin_users` | Admin Usuarios | `/configuraciones/usuarios` | - |
| 10 | `audit` | Auditoria | `/configuraciones/auditoria` | - |
| 11 | `platform` | Plataforma SaaS | `/configuraciones/plataforma` | - |

### Colecciones Firestore (15)

**Entidades principales (13):**
`tenders`, `contracts`, `operationTasks`, `financeEntries`, `vacancies`, `candidates`, `peopleRecords`, `personDocuments`, `personContractAssignments`, `accreditationTemplates`, `correspondenceTemplates`, `correspondenceDataSources`, `correspondenceJobs`

**Auxiliares (2):**
`alerts`, `auditLogs`

---

## Patrones Actuales

### 1. Registro de Modulos (`src/modules/registry.ts`)

Cada modulo se define declarativamente con:
- `moduleKey`, `label`, `route`, `apiBase`
- `collectionKeys[]`, `primaryCollection`
- `accessPolicy` (lectura/escritura por rol)
- `relations` (foreign keys a otras colecciones)
- `dashboardContributors` (metricas KPI)
- `navigation` (menu lateral)

### 2. CRUD Generico Server-Side (`src/server/api/crud.ts`)

`buildCrudHandlers({ moduleKey, createSchema, patchSchema })` genera:
- `GET` → lista entidades con `listEntities()`
- `POST` → crea con validacion Zod + relaciones + hooks
- `PATCH` → actualiza parcialmente con validacion

### 3. CRUD Generico Client-Side (`src/features/modules/use-crud-module.ts`)

`useCrudModule<T>(endpoint)` retorna:
- `items`, `error`, `pending`
- `create()`, `patch()`, `reload()`

### 4. Componentes UI Compartidos (`src/features/modules/module-ui.tsx`)

`ModulePage`, `Panel`, `ModuleActionBar`, `KpiGrid`, `FormDrawer`, `Toast`, `InlineError`, `StatusBadge`, `EmptyState`, `SkeletonRows`

### 5. API Route Pattern (Ejemplo: Tenders)

```typescript
// src/app/api/tenders/route.ts (12 lineas)
const handlers = buildCrudHandlers({
  moduleKey: "tenders",
  createSchema: tenderCreateSchema,
  patchSchema: tenderPatchSchema
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
```

### 6. Feature Component Pattern (Ejemplo: Tenders)

```
~200 lineas monoliticas que incluyen:
- Estado del formulario (useState)
- KPIs calculados inline
- FormDrawer con inputs HTML raw
- Tabla con columnas hardcoded
- Select inline para cambio de estado
```

---

## Diagrama de Relaciones entre Colecciones

```
tenders ──────────────────────────────┐
  │                                    │
  └──(tenderId)──→ contracts ◄────────┘
                      │
          ┌───────────┼───────────────────┐
          │           │                   │
          ▼           ▼                   ▼
    operationTasks  financeEntries    vacancies
    (contractId)    (contractId)      (contractId?)
                                          │
                                          ▼
                                      candidates
                                      (vacancyId)
                                          │
                                          ▼
                                    peopleRecords
                                      (contractId?)
                                          │
                              ┌───────────┤
                              ▼           ▼
                    personDocuments  personContractAssignments
                    (personId,       (personId, contractId)
                     contractId?)

accreditationTemplates (contractId?)

correspondenceTemplates → correspondenceJobs ← correspondenceDataSources
```

---

## Firebase - Integraciones

### Authentication
- Email/password + Google OAuth
- Custom claims: `tenantId`, `role`, `platformRole`
- ID token validation server-side

### Firestore
- Multi-tenant document structure
- Collection groups para queries cross-tenant
- Write triggers para audit trail automatico

### Cloud Storage
- Templates DOCX (correspondencia)
- Documentos HR (upload intents)
- Archivos de salida (ZIP)

### Cloud Functions (`functions/src/index.ts`)
- **Scheduled:** `syncDocumentStatuses` (diario 06:00 Chile)
- **Write Triggers:** 10 triggers de auditoria (uno por coleccion principal)
- **Callable:** `assignUserRole` (asignar claims)

---

## Metricas del Codigo

| Metrica | Valor |
|---------|-------|
| Modulos registrados | 11 |
| Colecciones Firestore | 15 |
| API Routes | ~20 |
| Feature Components | ~15 |
| Protected Pages | 25 |
| Zod Schemas | 28 (14 create + 14 patch) |
| Cloud Functions | 12 |
| Roles RBAC | 8 |

---

## Problemas Identificados / Oportunidades

### Inconsistencias

1. **Paginas monoliticas**: Cada modulo mezcla formularios, tablas y KPIs en un solo archivo de ~200 lineas
2. **Sin componente de tabla reutilizable**: Cada pagina construye su propia `<table>`
3. **Sin campos de formulario compartidos**: Inputs HTML raw sin abstraccion
4. **Sin DELETE en CRUD generico**: Solo GET/POST/PATCH
5. **Sin paginacion ni busqueda**: Listas cargan todo de una vez
6. **Modulos custom saltan el patron**: HR y Correspondencia tienen API routes custom que no usan `buildCrudHandlers`
7. **Crear modulo nuevo = tocar 6-8 archivos**: No hay generador ni plantilla

### Archivos Dispersos

Para agregar un modulo nuevo actualmente hay que editar:
1. `src/types/collections.ts` - Agregar collection key
2. `src/types/catalogs.ts` - Agregar status enum
3. `src/types/domain.ts` - Agregar interface
4. `src/server/validation/schemas.ts` - Agregar Zod schemas
5. `src/modules/registry.ts` - Agregar definicion del modulo
6. `src/app/api/{module}/route.ts` - Crear API route
7. `src/app/(protected)/{ruta}/page.tsx` - Crear pagina
8. `src/features/modules/{module}-page.tsx` - Crear componente
9. `functions/src/index.ts` - Agregar audit trigger (opcional)
