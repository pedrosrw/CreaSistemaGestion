#!/bin/bash
set -e
OUT="/home/user/CreaSistemaGestion/docs/diagrams"
MMDC="npx --yes @mermaid-js/mermaid-cli"

render() {
  local name="$1"
  local file="$OUT/$name.mmd"
  echo "Rendering $name..."
  $MMDC -i "$file" -o "$OUT/$name.png" -b white --width 1800 2>&1 | grep -v "deprecated\|npm warn" || true
}

# --- 1. Flujo General ---
cat > "$OUT/01-flujo-general.mmd" << 'EOF'
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
            M1["tenders/"]
            M2["contracts/"]
            M3["operations/"]
            M4["finance/"]
            M5["hr-recruiting/"]
            M6["hr-people/"]
            M7["correspondence/"]
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
    subgraph API["API Routes - Next.js"]
        CRUD["buildCrudHandlers()\nGET | POST | PATCH | DELETE"]
        AuthCtx["getTenantContext()"]
    end
    subgraph FIREBASE["Google Firebase"]
        direction TB
        FAuth["Firebase Auth"]
        FStore["Cloud Firestore\n(Multi-tenant)"]
        FStorage["Cloud Storage"]
        FFunctions["Cloud Functions"]
    end
    Browser --> AuthProvider --> AuthGuard --> AppShell --> MODULOS_UI
    M1 & M2 & M3 & M4 & M5 & M6 & M7 --> MPL
    MPL --> DT & FF & FB & CD
    MPL --> UCM
    UCM --> UAC
    UAC -->|"HTTP + Bearer Token"| CRUD
    CRUD --> AuthCtx
    AuthCtx -->|"Valida"| FAuth
    CRUD -->|"CRUD Operations"| FStore
    FStore -->|"Write Triggers"| FFunctions
    FFunctions -->|"Audit Logs"| FStore
    style SHARED fill:#e8f4fd,stroke:#0f5b9d
    style MODULOS_UI fill:#f0faf0,stroke:#227d43
    style FIREBASE fill:#fff3e0,stroke:#b06a10
EOF
render "01-flujo-general"

# --- 2. Anatomia de un modulo ---
cat > "$OUT/02-anatomia-modulo.mmd" << 'EOF'
flowchart LR
    subgraph MODULE["📦 src/modules/tenders/"]
        direction TB
        types["types.ts\n─────────────\ninterface Tender\nTenderStatus"]
        schema["schema.ts\n─────────────\ntenderCreateSchema\ntenderPatchSchema\n(Zod)"]
        columns["columns.tsx\n─────────────\nColumnDef[]\ntitulo, cliente\nmonto, estado"]
        formFields["form-fields.ts\n─────────────\nFormFieldDef[]"]
        kpis["kpis.ts\n─────────────\nKpiDef[]\nTotal, Abiertas\nWin Rate, Pipeline"]
        catalogs["catalogs.ts\n─────────────\nTENDER_STATUSES\nSTATUS_LABELS"]
        page["page.tsx\n─────────────\nTendersPage()\nusa ModulePageLayout"]
        registry["registry.ts\n─────────────\nModuleDefinition\nroles, rutas"]
    end
    subgraph API_ROUTE["src/app/api/tenders/"]
        route["route.ts\n─────────────\nbuildCrudHandlers()\nGET POST PATCH DELETE"]
    end
    subgraph APP_PAGE["src/app/(protected)/licitaciones/"]
        appPage["page.tsx\n(thin wrapper)"]
    end
    types & catalogs & columns & formFields & kpis --> page
    schema --> route
    page --> appPage
    style MODULE fill:#f0faf0,stroke:#227d43
EOF
render "02-anatomia-modulo"

# --- 3. CRUD Sequence ---
cat > "$OUT/03-flujo-crud.mmd" << 'EOF'
sequenceDiagram
    actor U as Usuario
    participant P as ModulePageLayout
    participant H as useCrudModule
    participant A as useApiClient
    participant R as API Route POST
    participant V as Zod Validation
    participant FR as Firestore Repository
    participant FS as Cloud Firestore
    participant CF as Cloud Functions

    U->>P: Click "Agregar" → Abre FormDrawer
    U->>P: Completa formulario → Submit
    P->>H: create(formData)
    H->>A: post("/api/tenders", formData)
    A->>R: HTTP POST + Bearer Token
    R->>R: getTenantContext() - Valida token y rol
    R->>V: createSchema.parse(body)
    V-->>R: Datos validados
    R->>FR: createEntity(tenantId, "tenders", data)
    FR->>FS: SET /tenants/{tid}/tenders/{uuid}
    FS-->>FR: OK
    FR-->>R: Tender creado
    R-->>A: 201 OK
    A-->>H: Response
    H->>A: get("/api/tenders") - Recarga lista
    H-->>P: items actualizados
    P->>U: Toast "Licitacion creada"
    Note over FS,CF: Async trigger
    FS->>CF: onDocumentWritten
    CF->>FS: Crea AuditLogEntry
EOF
render "03-flujo-crud"

# --- 4. DELETE sequence ---
cat > "$OUT/04-flujo-delete.mmd" << 'EOF'
sequenceDiagram
    actor U as Usuario
    participant P as ModulePageLayout
    participant CD as ConfirmDialog
    participant H as useCrudModule
    participant A as useApiClient
    participant R as API Route DELETE
    participant FR as Firestore Repository
    participant FS as Cloud Firestore

    U->>P: Click "✕" en fila
    P->>CD: Abre ConfirmDialog
    CD->>U: "Seguro que desea eliminar?"
    alt Confirma
        U->>CD: Click "Eliminar"
        CD->>P: onConfirm()
        P->>H: remove(id)
        H->>A: delete("/api/tenders?id=xxx")
        A->>R: HTTP DELETE + Bearer Token
        R->>R: getTenantContext()
        R->>FR: deleteEntity(tenantId, "tenders", id)
        FR->>FS: DELETE doc
        FS-->>FR: OK
        FR-->>R: void
        R-->>A: 200 OK
        H->>H: reload()
        P->>U: Toast "Eliminado exitosamente"
    else Cancela
        U->>CD: Click "Cancelar"
        P->>U: Cierra dialogo
    end
EOF
render "04-flujo-delete"

# --- 5. Generador de modulos ---
cat > "$OUT/05-generador-modulos.mmd" << 'EOF'
flowchart TB
    CMD["npm run generate:module --\n--key inventory\n--label 'Inventario'\n--route '/inventario'\n--collection 'inventoryItems'"]
    PARSE["Parsea argumentos CLI"]
    DERIVE["Deriva nombres:\nPascal: InventoryItem\nCamel: inventoryItem\nConst: INVENTORY_ITEM"]
    GEN["Genera 10 archivos"]
    subgraph FILES["Archivos Generados"]
        direction TB
        F1["src/modules/inventory/types.ts"]
        F2["src/modules/inventory/catalogs.ts"]
        F3["src/modules/inventory/schema.ts"]
        F4["src/modules/inventory/columns.tsx"]
        F5["src/modules/inventory/form-fields.ts"]
        F6["src/modules/inventory/kpis.ts"]
        F7["src/modules/inventory/page.tsx"]
        F8["src/modules/inventory/registry.ts"]
        F9["src/app/api/inventory/route.ts"]
        F10["src/app/(protected)/inventario/page.tsx"]
    end
    MANUAL["Pasos manuales:\n1. Agregar collection a collections.ts\n2. Personalizar campos y columnas\n3. Registrar en _registry/index.ts"]
    READY["Modulo listo para usar"]

    CMD --> PARSE --> DERIVE --> GEN --> FILES --> MANUAL --> READY
    style CMD fill:#e8f4fd,stroke:#0f5b9d
    style FILES fill:#f0faf0,stroke:#227d43
    style READY fill:#e8fce8,stroke:#1a7a35
EOF
render "05-generador-modulos"

# --- 6. Multi-tenant ---
cat > "$OUT/06-multi-tenant.mmd" << 'EOF'
flowchart TB
    subgraph FIRESTORE["Cloud Firestore"]
        ROOT["/ root"]
        subgraph T1["tenants/tenant-crea/"]
            direction TB
            T1_TEND["tenders/\n(Licitaciones)"]
            T1_CONT["contracts/\n(Contratos)"]
            T1_OPS["operationTasks/\n(Tareas)"]
            T1_FIN["financeEntries/\n(Finanzas)"]
            T1_PEOPLE["peopleRecords/\n(Personas)"]
            T1_DOCS["personDocuments/\n(Documentos)"]
            T1_AUDIT["auditLogs/\n(Auditoria)"]
        end
        subgraph T2["tenants/tenant-otro/"]
            T2_DATA["(misma estructura)\nDatos aislados"]
        end
        ROOT --> T1 & T2
    end
    style T1 fill:#e8f4fd,stroke:#0f5b9d
    style T2 fill:#fff3e0,stroke:#b06a10
EOF
render "06-multi-tenant"

# --- 7. Autenticacion RBAC ---
cat > "$OUT/07-auth-rbac.mmd" << 'EOF'
flowchart TB
    subgraph LOGIN["Login"]
        U["Usuario"] -->|"Email o Google"| FA["Firebase Auth"]
        FA -->|"ID Token + Claims"| TOKEN["Token JWT\n{uid, tenantId, role}"]
    end
    subgraph REQUEST["Cada Request API"]
        TOKEN -->|"Bearer Token"| CTX["getAuthContext(req)"]
        CTX -->|"Verifica firma"| FA
        CTX --> TENANT["getTenantContext()\n1. Resuelve tenantId\n2. Verifica membership\n3. Resuelve rol efectivo"]
    end
    subgraph POLICY["Politica de Acceso"]
        TENANT --> CHECK{"accessPolicy\nrole + action?"}
        CHECK -->|"SI"| ALLOW["✓ Permite operacion"]
        CHECK -->|"NO"| DENY["✗ 403 Forbidden"]
    end
    subgraph ROLES["Jerarquia de Roles"]
        R1["platform_admin (Todo)"]
        R2["tenant_admin (Todo en su tenant)"]
        R3["tenant_manager (Modulos operativos)"]
        R4["tender_lead / contract_manager\nfinance / hr (Su modulo)"]
        R5["viewer (Solo lectura)"]
        R1 --> R2 --> R3 --> R4 --> R5
    end
    style LOGIN fill:#e8f4fd,stroke:#0f5b9d
    style POLICY fill:#f0faf0,stroke:#227d43
    style ROLES fill:#fff3e0,stroke:#b06a10
EOF
render "07-auth-rbac"

# --- 8. ER Diagram ---
cat > "$OUT/08-entity-relations.mmd" << 'EOF'
erDiagram
    TENDERS ||--o{ CONTRACTS : "tenderId"
    CONTRACTS ||--o{ OPERATION_TASKS : "contractId"
    CONTRACTS ||--o{ FINANCE_ENTRIES : "contractId"
    CONTRACTS ||--o{ VACANCIES : "contractId"
    VACANCIES ||--o{ CANDIDATES : "vacancyId"
    CANDIDATES ||--o| PEOPLE_RECORDS : "personRecordId"
    PEOPLE_RECORDS ||--o{ PERSON_DOCUMENTS : "personId"
    PEOPLE_RECORDS ||--o{ PERSON_CONTRACT_ASSIGNMENTS : "personId"
    CONTRACTS ||--o{ PERSON_CONTRACT_ASSIGNMENTS : "contractId"
    CORRESPONDENCE_TEMPLATES ||--o{ CORRESPONDENCE_JOBS : "templateId"
    CORRESPONDENCE_DATA_SOURCES ||--o{ CORRESPONDENCE_JOBS : "dataSourceId"

    TENDERS { string title; string client; number amount; string status }
    CONTRACTS { string tenderId; string name; number totalValue; string status }
    OPERATION_TASKS { string contractId; string title; string priority; string status }
    FINANCE_ENTRIES { string contractId; string type; number amount; string status }
    VACANCIES { string title; string contractId; number openings; string status }
    CANDIDATES { string vacancyId; string name; number salary; string stage }
    PEOPLE_RECORDS { string fullName; string idNumber; string position; string contractId }
    PERSON_DOCUMENTS { string personId; string docType; string contractId; string status }
    PERSON_CONTRACT_ASSIGNMENTS { string personId; string contractId; string startDate; string status }
    CORRESPONDENCE_TEMPLATES { string name; string fileName; string delimiter }
    CORRESPONDENCE_DATA_SOURCES { string name; string sourceType }
    CORRESPONDENCE_JOBS { string templateId; string dataSourceId; string status }
EOF
render "08-entity-relations"

echo ""
echo "✅ Todos los diagramas generados en: $OUT"
ls -lh "$OUT"/*.png 2>/dev/null || echo "No se generaron PNGs"
