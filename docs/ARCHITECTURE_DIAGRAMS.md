# Diagramas de Arquitectura - CreaSistemaGestion ERP

## 1. Flujo General del Sistema Modular

```mermaid
flowchart TB
    subgraph USUARIO["👤 Usuario"]
        Browser["Navegador Web"]
    end

    subgraph FRONTEND["Frontend - Next.js 14 App Router"]
        direction TB
        AuthProvider["AuthProvider\n(Firebase Auth)"]
        AuthGuard["AuthGuard\n(Protege rutas)"]
        AppShell["AppShell\n(Layout + Nav)"]

        subgraph MODULOS_UI["Modulos UI (src/modules/)"]
            direction LR
            M1["tenders/\npage.tsx"]
            M2["contracts/\npage.tsx"]
            M3["operations/\npage.tsx"]
            M4["finance/\npage.tsx"]
            M5["hr-recruiting/\npage.tsx"]
            M6["hr-people/\npage.tsx"]
            M7["correspondence/\npage.tsx"]
        end

        subgraph SHARED["Componentes Compartidos (_shared/)"]
            direction LR
            MPL["ModulePageLayout"]
            DT["DataTable"]
            FF["FormFieldsGrid"]
            FB["FilterBar"]
            CD["ConfirmDialog"]
        end

        subgraph HOOKS["Hooks"]
            UCM["useCrudModule()"]
            UTS["useTableState()"]
            UAC["useApiClient()"]
        end
    end

    subgraph API["API Routes - Next.js (src/app/api/)"]
        direction TB
        CRUD["buildCrudHandlers()\nGET | POST | PATCH | DELETE"]
        CustomAPI["API Custom\n(HR docs, Correspondence)"]
        AuthCtx["getTenantContext()\n(Valida token + rol + tenant)"]
    end

    subgraph FIREBASE["Google Firebase"]
        direction TB
        FAuth["Firebase Auth\n(Google OAuth + Email)"]
        FStore["Cloud Firestore\n(Multi-tenant)"]
        FStorage["Cloud Storage\n(Archivos)"]
        FFunctions["Cloud Functions\n(Triggers + Scheduled)"]
    end

    Browser --> AuthProvider
    AuthProvider --> AuthGuard
    AuthGuard --> AppShell
    AppShell --> MODULOS_UI

    M1 & M2 & M3 & M4 & M5 & M6 & M7 --> MPL
    MPL --> DT & FF & FB & CD
    MPL --> UCM
    UCM --> UAC
    DT --> UTS

    UAC -->|"HTTP + Bearer Token"| CRUD
    UAC -->|"HTTP + Bearer Token"| CustomAPI
    CRUD --> AuthCtx
    CustomAPI --> AuthCtx
    AuthCtx -->|"Valida"| FAuth

    CRUD -->|"CRUD Operations"| FStore
    CustomAPI -->|"Queries"| FStore
    CustomAPI -->|"Upload/Download"| FStorage

    FStore -->|"Write Triggers"| FFunctions
    FFunctions -->|"Audit Logs"| FStore

    style SHARED fill:#e8f4fd,stroke:#0f5b9d
    style MODULOS_UI fill:#f0faf0,stroke:#227d43
    style FIREBASE fill:#fff3e0,stroke:#b06a10
```

---

## 2. Anatomia de un Modulo ERP

```mermaid
flowchart LR
    subgraph MODULE["📦 src/modules/tenders/"]
        direction TB
        types["types.ts\n─────────────\ninterface Tender\ntype TenderStatus"]
        catalogs["catalogs.ts\n─────────────\nTENDER_STATUSES\nSTATUS_LABELS"]
        schema["schema.ts\n─────────────\ntenderCreateSchema\ntenderPatchSchema\n(Zod validation)"]
        columns["columns.tsx\n─────────────\nColumnDef[]\n(titulo, cliente,\nmonto, estado...)"]
        formFields["form-fields.ts\n─────────────\nFormFieldDef[]\n(inputs del\nformulario)"]
        kpis["kpis.ts\n─────────────\nKpiDef[]\n(Total, Abiertas,\nWin Rate, Pipeline)"]
        page["page.tsx\n─────────────\nTendersPage()\nusa ModulePageLayout"]
        registry["registry.ts\n─────────────\nModuleDefinition\n(roles, rutas,\ncolecciones)"]
    end

    subgraph USES["Usa Componentes Compartidos"]
        MPL2["ModulePageLayout<Tender>"]
    end

    subgraph API_ROUTE["src/app/api/tenders/"]
        route["route.ts\n─────────────\nbuildCrudHandlers()\nGET POST PATCH DELETE"]
    end

    subgraph APP_PAGE["src/app/(protected)/licitaciones/"]
        appPage["page.tsx\n─────────────\nimport TendersPage\n(thin wrapper)"]
    end

    types --> page
    catalogs --> columns & formFields & page
    columns --> page
    formFields --> page
    kpis --> page
    page --> MPL2
    schema --> route
    registry -.->|"Registra en\nMODULE_REGISTRY"| route
    appPage -->|"renderiza"| page

    style MODULE fill:#f0faf0,stroke:#227d43
    style USES fill:#e8f4fd,stroke:#0f5b9d
```

---

## 3. Flujo CRUD Completo (Crear → Firebase → Respuesta)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as ModulePageLayout
    participant H as useCrudModule()
    participant A as useApiClient()
    participant R as API Route (POST)
    participant V as Zod Validation
    participant RL as Relation Validator
    participant FR as Firestore Repository
    participant FS as Cloud Firestore
    participant CF as Cloud Functions

    U->>P: Click "Agregar" → Abre FormDrawer
    U->>P: Completa formulario → Submit
    P->>H: create(formData)
    H->>A: post("/api/tenders", formData)
    A->>R: HTTP POST + Bearer Token

    R->>R: getTenantContext() → Valida token + rol
    R->>V: createSchema.parse(body)
    V-->>R: Datos validados (o error 400)

    R->>RL: validateModuleRelations()
    RL->>FS: Verifica FK existen
    FS-->>RL: OK

    R->>FR: createEntity(tenantId, "tenders", data, actor)
    FR->>FS: SET /tenants/{tid}/tenders/{uuid}
    FS-->>FR: OK
    FR-->>R: { id, ...data, createdAt, updatedAt }

    R-->>A: 201 { data: Tender }
    A-->>H: Response
    H->>A: get("/api/tenders") → Recarga lista
    H-->>P: items actualizados

    P->>U: Toast "Licitacion creada" + Cierra drawer

    Note over FS,CF: Async (trigger)
    FS->>CF: onDocumentWritten trigger
    CF->>FS: Crea AuditLogEntry
```

---

## 4. Flujo DELETE (con Confirmacion)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as ModulePageLayout
    participant CD as ConfirmDialog
    participant H as useCrudModule()
    participant A as useApiClient()
    participant R as API Route (DELETE)
    participant FR as Firestore Repository
    participant FS as Cloud Firestore

    U->>P: Click boton "✕" en fila
    P->>CD: Abre ConfirmDialog
    CD->>U: "Esta seguro que desea eliminar?"

    alt Confirma
        U->>CD: Click "Eliminar"
        CD->>P: onConfirm()
        P->>H: remove(id)
        H->>A: delete("/api/tenders?id=xxx")
        A->>R: HTTP DELETE + Bearer Token

        R->>R: getTenantContext() → write access
        R->>FR: deleteEntity(tenantId, "tenders", id)
        FR->>FS: Verifica existencia
        FR->>FS: DELETE doc
        FS-->>FR: OK
        FR-->>R: void
        R-->>A: 200 { ok: true }
        A-->>H: OK
        H->>H: reload() → Recarga lista
        H-->>P: items actualizados
        P->>U: Toast "Eliminado exitosamente"
    else Cancela
        U->>CD: Click "Cancelar"
        CD->>P: onCancel()
        P->>U: Cierra dialogo
    end
```

---

## 5. Flujo del Generador de Modulos

```mermaid
flowchart TB
    CMD["npm run generate:module --\n--key inventory\n--label 'Inventario'\n--route '/inventario'\n--collection 'inventoryItems'\n--statuses 'active,inactive'"]

    CMD --> PARSE["Parsea argumentos CLI"]
    PARSE --> DERIVE["Deriva nombres:\nPascal: InventoryItem\nCamel: inventoryItem\nConst: INVENTORY_ITEM"]

    DERIVE --> GEN["Genera 10 archivos"]

    subgraph FILES["Archivos Generados"]
        direction TB
        F1["src/modules/inventory/\ntypes.ts"]
        F2["src/modules/inventory/\ncatalogs.ts"]
        F3["src/modules/inventory/\nschema.ts"]
        F4["src/modules/inventory/\ncolumns.tsx"]
        F5["src/modules/inventory/\nform-fields.ts"]
        F6["src/modules/inventory/\nkpis.ts"]
        F7["src/modules/inventory/\npage.tsx"]
        F8["src/modules/inventory/\nregistry.ts"]
        F9["src/app/api/inventory/\nroute.ts"]
        F10["src/app/(protected)/inventario/\npage.tsx"]
    end

    GEN --> FILES

    FILES --> MANUAL["Pasos manuales:\n1. Agregar collection a collections.ts\n2. Personalizar campos y columnas\n3. Registrar en _registry/index.ts"]

    MANUAL --> READY["Modulo listo para usar"]

    style CMD fill:#e8f4fd,stroke:#0f5b9d
    style FILES fill:#f0faf0,stroke:#227d43
    style READY fill:#e8fce8,stroke:#1a7a35
```

---

## 6. Arquitectura Multi-Tenant (Firestore)

```mermaid
flowchart TB
    subgraph FIRESTORE["Cloud Firestore"]
        direction TB
        ROOT["/ (root)"]

        subgraph T1["tenants/tenant-crea/"]
            direction TB
            T1_TEND["tenders/\n├─ {id1} Licitacion A\n└─ {id2} Licitacion B"]
            T1_CONT["contracts/\n├─ {id3} Contrato X\n└─ {id4} Contrato Y"]
            T1_OPS["operationTasks/\n└─ {id5} Tarea 1"]
            T1_FIN["financeEntries/\n└─ {id6} Pago proveedor"]
            T1_PEOPLE["peopleRecords/\n├─ {id7} Juan Perez\n└─ {id8} Maria Lopez"]
            T1_DOCS["personDocuments/\n└─ {id9} Contrato Juan"]
            T1_AUDIT["auditLogs/\n└─ {id10} Cambio estado"]
            T1_ALERTS["alerts/\n└─ {id11} Doc vencido"]
        end

        subgraph T2["tenants/tenant-otro/"]
            direction TB
            T2_DATA["(misma estructura)\nDatos completamente\naislados"]
        end

        ROOT --> T1 & T2
    end

    subgraph STORAGE["Cloud Storage"]
        S1["tenants/tenant-crea/\n├─ people/{personId}/documents/\n├─ correspondence/templates/\n└─ correspondence/jobs/output/"]
    end

    style T1 fill:#e8f4fd,stroke:#0f5b9d
    style T2 fill:#fff3e0,stroke:#b06a10
```

---

## 7. Mapa de Relaciones entre Entidades

```mermaid
erDiagram
    TENDERS ||--o{ CONTRACTS : "tenderId"
    CONTRACTS ||--o{ OPERATION_TASKS : "contractId"
    CONTRACTS ||--o{ FINANCE_ENTRIES : "contractId"
    CONTRACTS ||--o{ VACANCIES : "contractId (opcional)"
    VACANCIES ||--o{ CANDIDATES : "vacancyId"
    CANDIDATES ||--o| PEOPLE_RECORDS : "personRecordId"
    CONTRACTS ||--o{ PEOPLE_RECORDS : "contractId (opcional)"
    PEOPLE_RECORDS ||--o{ PERSON_DOCUMENTS : "personId"
    CONTRACTS ||--o{ PERSON_DOCUMENTS : "contractId (opcional)"
    PEOPLE_RECORDS ||--o{ PERSON_CONTRACT_ASSIGNMENTS : "personId"
    CONTRACTS ||--o{ PERSON_CONTRACT_ASSIGNMENTS : "contractId"
    CONTRACTS ||--o{ ACCREDITATION_TEMPLATES : "contractId (opcional)"
    CORRESPONDENCE_TEMPLATES ||--o{ CORRESPONDENCE_JOBS : "templateId"
    CORRESPONDENCE_DATA_SOURCES ||--o{ CORRESPONDENCE_JOBS : "dataSourceId"

    TENDERS {
        string title
        string client
        number amount
        string closeDate
        number probability
        string responsible
        enum status "draft|submitted|won|lost"
    }

    CONTRACTS {
        string tenderId FK
        string name
        string client
        number totalValue
        number costEstimate
        string manager
        enum status "planning|active|at_risk|closed"
        number progress
    }

    OPERATION_TASKS {
        string contractId FK
        string title
        string owner
        enum priority "low|medium|high"
        enum status "todo|doing|blocked|done"
    }

    FINANCE_ENTRIES {
        string contractId FK
        enum type "income|expense"
        string concept
        number amount
        enum status "pending|paid"
    }

    VACANCIES {
        string title
        string area
        string contractId FK
        number openings
        enum status "open|paused|closed"
    }

    CANDIDATES {
        string vacancyId FK
        string name
        number salary
        enum stage "intake|screening|interview|offer|hired|rejected"
    }

    PEOPLE_RECORDS {
        string fullName
        string idNumber
        string position
        string contractId FK
        enum employmentStatus "active|on_leave|inactive"
    }

    PERSON_DOCUMENTS {
        string personId FK
        string docType
        string fileName
        string contractId FK
        enum status "uploaded|pending|expiring|expired"
    }

    PERSON_CONTRACT_ASSIGNMENTS {
        string personId FK
        string contractId FK
        string startDate
        enum status "active|inactive"
    }

    ACCREDITATION_TEMPLATES {
        string code
        string name
        enum scope "global|client|contract"
        boolean required
    }

    CORRESPONDENCE_TEMPLATES {
        string name
        string fileName
        string delimiter
    }

    CORRESPONDENCE_DATA_SOURCES {
        string name
        enum sourceType "csv|xlsx|json"
    }

    CORRESPONDENCE_JOBS {
        string templateId FK
        string dataSourceId FK
        enum status "queued|processing|completed|failed"
    }
```

---

## 8. Flujo de Autenticacion y Control de Acceso

```mermaid
flowchart TB
    subgraph LOGIN["Login"]
        U["Usuario"] -->|"Email o Google"| FA["Firebase Auth"]
        FA -->|"ID Token + Custom Claims"| TOKEN["Token JWT\n{uid, tenantId, role}"]
    end

    subgraph REQUEST["Cada Request API"]
        TOKEN -->|"Bearer Token"| CTX["getAuthContext(req)"]
        CTX -->|"Verifica firma"| FA
        CTX --> TENANT["getTenantContext()\n1. Resuelve tenantId\n2. Verifica membership\n3. Resuelve rol efectivo"]
    end

    subgraph POLICY["Politica de Acceso"]
        TENANT --> CHECK{"accessPolicy\n[role][action]?"}
        CHECK -->|"SI"| ALLOW["✓ Permite operacion"]
        CHECK -->|"NO"| DENY["✗ 403 Forbidden"]
    end

    subgraph ROLES["Jerarquia de Roles"]
        R1["platform_admin\n(Todo)"]
        R2["tenant_admin\n(Todo en su tenant)"]
        R3["tenant_manager\n(Modulos operativos)"]
        R4["tender_lead / contract_manager\n/ finance / hr\n(Su modulo)"]
        R5["viewer\n(Solo lectura)"]
        R1 --> R2 --> R3 --> R4 --> R5
    end

    style LOGIN fill:#e8f4fd,stroke:#0f5b9d
    style POLICY fill:#f0faf0,stroke:#227d43
    style ROLES fill:#fff3e0,stroke:#b06a10
```

---

## 9. Flujo de Componentes Compartidos

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ModulePageLayout<T>                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ModulePage (titulo + descripcion)                             │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  Toast (mensajes de exito/error)                              │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  KpiGrid                                                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │ Total    │ │ Abiertas │ │ Win Rate │ │ Pipeline         │ │  │
│  │  │   12     │ │    5     │ │  71.4%   │ │ $45.000.000      │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  ModuleActionBar                  [Agregar licitacion]        │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  Panel "Listado"                                              │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  FilterBar                                               │ │  │
│  │  │  [🔍 Buscar por titulo, cliente...] [Estado ▼ Todos]     │ │  │
│  │  ├──────────────────────────────────────────────────────────┤ │  │
│  │  │  DataTable<Tender>                                       │ │  │
│  │  │  ┌────────┬─────────┬──────────┬────────┬──────┬──────┐ │ │  │
│  │  │  │Titulo ↑│ Cliente │  Monto   │ Cierre │Estado│  ✕   │ │ │  │
│  │  │  ├────────┼─────────┼──────────┼────────┼──────┼──────┤ │ │  │
│  │  │  │Obra A  │ Minera X│$12.000.0 │ 15-abr │[▼Won]│ [✕] │ │ │  │
│  │  │  │Obra B  │ Const Y │ $8.500.0 │ 22-may │[▼Sub]│ [✕] │ │ │  │
│  │  │  │Puente  │ MOP     │$25.000.0 │ 01-jun │[▼Dra]│ [✕] │ │ │  │
│  │  │  └────────┴─────────┴──────────┴────────┴──────┴──────┘ │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  FormDrawer (se abre al click "Agregar")                      │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  FormFieldsGrid                                          │ │  │
│  │  │  ┌─────────────────┐ ┌─────────────────┐                │ │  │
│  │  │  │ Nombre          │ │ Cliente          │                │ │  │
│  │  │  │ [____________] │ │ [____________]   │                │ │  │
│  │  │  ├─────────────────┤ ├─────────────────┤                │ │  │
│  │  │  │ Monto ($)       │ │ Cierre           │                │ │  │
│  │  │  │ [____0_______] │ │ [__/__/____]     │                │ │  │
│  │  │  ├─────────────────┤ ├─────────────────┤                │ │  │
│  │  │  │ Probabilidad %  │ │ Responsable      │                │ │  │
│  │  │  │ [____50______] │ │ [____________]   │                │ │  │
│  │  │  ├─────────────────┤                                     │ │  │
│  │  │  │ Estado          │                                     │ │  │
│  │  │  │ [▼ Borrador   ]│                                     │ │  │
│  │  │  └─────────────────┘                                     │ │  │
│  │  │  [Guardar]  [Cancelar]                                   │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ConfirmDialog (se abre al click "✕")                         │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  Confirmar eliminacion                                   │ │  │
│  │  │  Esta seguro que desea eliminar "Obra A"?                │ │  │
│  │  │                           [Cancelar]  [Eliminar]         │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 10. Mapa de Modulos ERP Actuales y Futuros

```mermaid
mindmap
  root((ERP\nCreaSistema\nGestion))
    Comercial
      Licitaciones
        Pipeline
        Probabilidades
        Win Rate
      Contratos
        Detalle contrato
        Progreso
        Documentos
    Operaciones
      Tareas
        Kanban board
        Prioridades
        Bloqueos
    Finanzas
      Ingresos
      Gastos
      Flujo neto mensual
    RRHH
      Reclutamiento
        Vacantes
        Candidatos
        Pipeline hiring
      Personas
        Ficha personal
        Documentos
        Asignaciones
        Acreditaciones
    Correspondencia
      Templates DOCX
      Data sources
      Mail merge jobs
    **FUTUROS**
      Inventario y Bodega
        Stock
        Entradas/Salidas
        Materiales
      Compras
        Ordenes de compra
        Proveedores
        Cotizaciones
      Facturacion
        Emision facturas
        Cobros
        Integracion SII
    Administracion
      Usuarios
      Roles
      Configuracion empresa
      Auditoria
    Plataforma SaaS
      Tenants
      Planes
      Dominios
```

---

## Como Ver Estos Diagramas

### Opcion 1: GitHub
Simplemente abre este archivo en GitHub — renderiza Mermaid automaticamente.

### Opcion 2: VS Code
Instala la extension "Markdown Preview Mermaid Support".

### Opcion 3: Online
Copia el codigo Mermaid en [mermaid.live](https://mermaid.live) para editar y exportar como PNG/SVG.

### Opcion 4: Los diagramas ASCII
Los diagramas en formato ASCII (secciones 9) se ven directamente en cualquier editor de texto.
