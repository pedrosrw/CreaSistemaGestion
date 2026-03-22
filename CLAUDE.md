# CreaSistemaGestion - MVP 2.1 SaaS

## Stack Tecnológico
- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Firebase (Auth, Firestore, Cloud Storage, Cloud Functions v2)
- **Autenticación**: Firebase Auth con Google OAuth
- **Base de Datos**: Firestore (tenant-aware, colecciones por módulo)
- **Hosting**: Firebase App Hosting (preparado para servir)
- **Lenguaje**: TypeScript (todo el proyecto)

## Arquitectura
- **Modular**: Sistema de módulos registrados en `src/modules/registry.ts`
- **Multi-tenant**: Cada empresa (tenant) tiene datos aislados
- **RBAC**: Control de acceso basado en roles (platform_admin, tenant_admin, tenant_manager, tender_lead, contract_manager, finance, hr)
- **Colecciones Firestore principales**:
  - `tenders`, `contracts`, `operationTasks`, `financeEntries`
  - `vacancies`, `candidates` (HR)
  - `peopleRecords`, `personDocuments`, `accreditationTemplates`
  - `correspondenceTemplates`, `correspondenceDataSources`
  - `users`, `auditLogs`

## Módulos Implementados
1. **Dashboard** - Métricas agregadas de todos los módulos
2. **Licitaciones** - Gestión de procesos de compra
3. **Contratos** - Ciclo de vida de contratos
4. **Operaciones** - Tareas operacionales
5. **Finanzas** - Registro de movimientos financieros
6. **RRHH** - Reclutamiento, personas, documentos, acreditaciones
7. **Correspondencia Cruzada** - Templates de documentos con data sources
8. **Configuraciones** - Admin (usuarios, roles, auditoría, plataforma)

## Estructura de Carpetas
```
src/
├── app/                          # Next.js App Router (rutas protegidas + públicas)
├── features/
│   ├── layout/                  # AppShell, navegación, auth guard
│   ├── dashboard/               # Página principal con métricas
│   └── [módulo]/                # Carpetas para cada módulo
├── modules/
│   ├── registry.ts              # Source of truth de módulos
│   └── [módulo]/                # Lógica específica por módulo
├── lib/
│   ├── firebase.ts              # Configuración Firebase
│   ├── auth.ts                  # Hooks y funciones de autenticación
│   └── db.ts                    # Queries y mutations Firestore
└── components/                  # Componentes reutilizables (shadcn)
```

## Convenciones de Código
- **Componentes**: PascalCase, funciones React (no clases)
- **Funciones/variables**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: kebab-case
- **Rutas API**: `/api/[módulo]/[recurso]`
- **Tipos**: Definidos con `interface` o `type`, sufijo `-Schema` para Firestore

## Patrones Clave
- **Module Registry**: Configuración centralizada de módulos (rutas, colecciones, permisos)
- **useAuth() hook**: Para acceder a usuario actual, tenant, permisos
- **Dynamic Navigation**: Sidebar generada desde registry basada en permisos
- **Form Handling**: React Hook Form + Zod para validación
- **Data Fetching**: API routes Next.js + Firestore queries
- **Error Handling**: Try-catch con notificaciones al usuario

## Cómo Agregar un Nuevo Módulo
1. Registrarlo en `src/modules/registry.ts`
2. Crear carpeta `src/features/[módulo]` con componentes
3. Crear carpeta `src/modules/[módulo]` con lógica
4. Crear rutas en `src/app/(protected)/[módulo]`
5. Crear endpoints en `src/app/api/[módulo]`

## Testing
- Unit tests con Jest
- Integration tests para Firebase
- Ubicación: `tests/unit/` y `tests/integration/`

## Variables de Entorno
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_SDK_KEY=...
NEXT_PUBLIC_APP_URL=...
```

## Notas Importantes
- Todo en TypeScript, sin excepciones
- Usar componentes de shadcn/ui para consistencia visual
- Firestore queries SIEMPRE filtradas por tenant actual
- Roles y permisos verificados tanto en frontend como en API
- Auditoría automática de cambios en colecciones críticas
