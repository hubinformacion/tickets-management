# Manual técnico

Este manual describe la arquitectura, tecnologías y decisiones técnicas del sistema de gestión de tickets. Está dirigido a administradores del sistema y desarrolladores que necesiten comprender o mantener la plataforma.

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript (modo estricto) |
| Base de datos | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Autenticación | Better Auth (Google OAuth) |
| Estilos | Tailwind CSS + shadcn/ui + Radix UI |
| Formularios | React Hook Form + Zod |
| Correos | Gmail API (googleapis) |
| Almacenamiento | Google Drive API |
| Pantallas de Carga | Skeletons UI Nativos (Split-screen) |
| Editor de texto | TipTap |
| Gestor de paquetes | pnpm |

---

## Arquitectura y diagramas del sistema

El diseño estructural y los flujos de interacción del sistema se encuentran documentados visualmente bajo el estándar editorial de **Diagram Design** (`~/.agents/skills/diagram-design`):

- **Diagrama de Arquitectura (HTML):** [docs/diagramas/arquitectura-sistema.html](./diagramas/arquitectura-sistema.html) (incluye selector claro/oscuro y desglose por capas).
- **Diagrama de Arquitectura (SVG):** [docs/diagramas/arquitectura-sistema.svg](./diagramas/arquitectura-sistema.svg) (vectorial autónomo).
- **Diagrama de Flujo e Interacción Swimlane (HTML):** [docs/diagramas/proceso-interaccion-swimlane.html](./diagramas/proceso-interaccion-swimlane.html) (interacción usuario-plataforma-agente-proveedor).
- **Diagrama de Flujo e Interacción Swimlane (SVG):** [docs/diagramas/proceso-interaccion-swimlane.svg](./diagramas/proceso-interaccion-swimlane.svg) (vectorial autónomo).
- **Índice de Diagramas:** [docs/diagramas/README.md](./diagramas/README.md).

---

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Páginas del dashboard
│   │   ├── (admin)/      # Solo admin (requireAdmin)
│   │   ├── (agent)/      # Agentes + admin (requireAgent)
│   │   └── (shared)/     # Todos los autenticados
│   ├── login/            # Página de login
│   └── layout.tsx        # Layout raíz
├── actions/               # Server Actions
│   ├── admin/            # Acciones de administrador
│   ├── agent/            # Acciones de agente
│   ├── tickets/          # Acciones de tickets
│   ├── surveys/          # Acciones de encuestas
│   └── config/           # Configuración
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── shared/           # Componentes compartidos
│   ├── admin/            # Componentes de admin
│   ├── agent/            # Componentes de agente
│   ├── tickets/          # Componentes de tickets
│   └── surveys/          # Componentes de encuestas
├── db/                    # Base de datos
│   ├── schema.ts         # Esquema Drizzle ORM
│   └── index.ts          # Cliente de BD
├── lib/                   # Utilidades
│   ├── auth/             # Autenticación
│   ├── email/            # Sistema de correos
│   ├── utils/            # Utilidades generales
│   ├── validation/       # Esquemas Zod
│   └── constants/        # Constantes
├── scripts/               # Scripts de utilidad
└── types/                 # Tipos TypeScript
```

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|---|---|
| `user` | Usuarios del sistema (gestionada por Better Auth) |
| `session` / `account` / `verification` | Tablas de autenticación (Better Auth) |
| `attention_area` | Áreas de atención: TSI, Difusión, Fondo Editorial |
| `category` | Categorías de tickets por área |
| `subcategory` | Subcategorías dentro de cada categoría |
| `ticket` | Tickets principales del sistema |
| `ticket_sequence` | Contador atómico por área y año para códigos |
| `comment` | Actividad: comentarios, derivaciones y eventos del sistema |
| `ticket_attachment` | Archivos adjuntos (referencia a Google Drive) |
| `ticket_view` | Registro de última visualización por usuario |
| `priority_config` | Configuración de SLA por área y nivel de prioridad |
| `provider` | Proveedores externos por área |
| `provider_ticket` | Tickets de seguimiento a proveedores |
| `satisfaction_survey` | Encuestas de satisfacción (1 por ticket, solo TSI) |
| `app_settings` | Configuración general clave-valor |

### Códigos de ticket

Los códigos siguen el formato `{SLUG}-{AÑO}-{SECUENCIA}`:

- **SLUG**: 3 letras del área (TSI, DIF, FED).
- **AÑO**: Año actual en 4 dígitos.
- **SECUENCIA**: Contador de 4 dígitos con ceros a la izquierda, nunca decrementa.

La tabla `ticket_sequence` almacena el último número por área y año. La generación es atómica para evitar duplicados.

### Estados del ticket

```
open → in_progress → pending_validation → resolved
                  ↘ resolved (cierre directo)
                  ↘ voided
open → voided
resolved → in_progress (reapertura)
```

El cierre se registra con `closedBy` (`user` | `admin` | `system`), `closedAt` y `closedByUserId`.

---

## Autenticación y autorización

### Better Auth

El sistema usa Better Auth con proveedor Google OAuth. La configuración se encuentra en `src/lib/auth/`.

### Roles

3 roles almacenados en la columna `role` de la tabla `user`:

- **user**: Acceso básico (crear tickets, ver los propios).
- **agent**: Acceso a su área + gestión de tickets y proveedores.
- **admin**: Acceso global + configuración del sistema.

### Helpers de autorización

Todas las server actions usan helpers ubicados en `src/lib/auth/helpers.ts`:

- `requireAuth()` — Requiere sesión activa, redirige a login si no.
- `requireAgent()` — Requiere rol `agent` o `admin`.
- `requireAdmin()` — Requiere rol `admin`.
- `getSession()` — Obtiene sesión sin redirigir.

### Proxy

El proyecto usa `src/proxy.ts` (Next.js 16) en lugar de `middleware.ts` para interceptar y proteger de forma centralizada. Posee protecciones contra *Redirect Loops* al delegar la verificación fuerte a las páginas (Server Components) para cookies caducas.

---

## Server actions

Las acciones del servidor se ubican en `src/actions/` organizadas por dominio:

- **admin/**: Gestión de usuarios, configuración del sistema, settings.
- **agent/**: Tickets de proveedores, configuración de área.
- **tickets/**: CRUD de tickets, asignación, validación, comentarios, adjuntos.
- **surveys/**: Encuesta de satisfacción (enviar, consultar, resultados).
- **config/**: Categorías, subcategorías, prioridades.

### Rate limiting

Las acciones críticas tienen protección contra abuso mediante `createRateLimiter()` en `src/lib/utils/rate-limit.ts`:

| Acción | Límite |
|---|---|
| Creación de tickets | 10 por minuto por usuario |
| Comentarios | 10 por minuto por usuario |
| Derivaciones | 10 por minuto por agente |
| Acciones de admin | 30 por minuto por admin |
| Encuestas | 10 por minuto por usuario |

---

## Sistema de correos

### Gmail API

El envío de correos usa la Gmail API (no SMTP). La configuración se encuentra en `src/lib/email/gmail-client.ts`.

### Threading

Cada ticket mantiene un hilo de correo mediante:

- `emailThreadId`: ID del hilo de Gmail.
- `initialMessageId`: Message-ID RFC del primer correo.
- Headers `In-Reply-To` y `References` para mantener el threading.

### Envío asíncrono

Todos los correos se envían con `after()` de Next.js para no bloquear la respuesta HTTP al usuario.

### Plantillas

Las plantillas de correo se encuentran en `src/lib/email/templates/`. Hay 7 tipos de notificación:

1. Ticket creado
2. Comentario agregado
3. Validación solicitada
4. Ticket asignado
5. Ticket resuelto
6. Validación rechazada
7. Derivación registrada

---

## Almacenamiento de archivos

Los archivos adjuntos se almacenan en **Google Drive** mediante la API. El flujo es:

1. El usuario sube el archivo mediante FilePond en el formulario.
2. Se genera un token temporal y el archivo se sube a Drive.
3. Al guardar el ticket, se vincula el archivo con el `driveFileId` y `driveViewLink`.
4. Los archivos se pueden visualizar directamente desde el enlace de Drive.

Límite: 5 MB por archivo. El área de Difusión no admite adjuntos.

---

## Encuestas de satisfacción

### Tabla `satisfaction_survey`

Almacena 4 calificaciones (1-5) y una sugerencia opcional por ticket:

- `responseTimeRating`: Tiempo de respuesta.
- `communicationRating`: Comunicación y orientación.
- `solutionRating`: Solución recibida.
- `overallRating`: Satisfacción general.
- `improvementSuggestion`: Texto libre opcional.

Constraint `UNIQUE` en `ticketId` garantiza una sola respuesta por ticket.

### Flujo

1. El ticket TSI se resuelve (el usuario confirma).
2. Aparece un panel flotante con la encuesta.
3. Si el usuario omite la encuesta, puede completarla después al visitar el ticket.
4. Los resultados se visualizan en `/dashboard/encuestas` con KPIs y gráficos (recharts).

---

## Comandos de desarrollo

```bash
pnpm dev              # Servidor de desarrollo (puerto 3000)
pnpm build            # Compilar para producción
pnpm start            # Servidor de producción
pnpm lint             # ESLint
pnpm db:push          # Sincronizar esquema con BD
pnpm db:seed          # Cargar datos iniciales
pnpm db:reset         # Borrar todo y recrear BD
pnpm db:studio        # Interfaz visual Drizzle Studio
```

### Verificación

```bash
pnpm exec tsc --noEmit    # Verificar tipos sin compilar
pnpm db:reset             # Verificar que schema + seed funcionan
```

---

## Variables de entorno

El archivo `.env.local` contiene las siguientes variables (nunca se commitea):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de conexión a PostgreSQL (Neon) |
| `BETTER_AUTH_SECRET` | Secreto para Better Auth |
| `GOOGLE_CLIENT_ID` | OAuth Client ID de Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `GMAIL_*` | Credenciales para Gmail API |
| `GOOGLE_DRIVE_*` | Credenciales para Google Drive API |
| `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación |

---

## Decisiones de arquitectura

### Route groups

- `(admin)`: Solo accesible por administradores. Usa `requireAdmin()`.
- `(agent)`: Accesible por agentes y administradores. Usa `requireAgent()`.
- `(shared)`: Accesible por todos los usuarios autenticados. Usa `requireAuth()`.

### Sidebar como client component

El layout del dashboard (`src/app/dashboard/layout.tsx`) es un client component (`"use client"`) para manejar el estado de colapso/expansión del sidebar. Los datos que necesita (como la URL de la base de conocimiento) se cargan mediante server actions en `useEffect`.

### Componentes flotantes

Los paneles flotantes (validación, encuesta) se renderizan **fuera** del contenedor con animación CSS (`animate-in`) para evitar que la propiedad `transform` de la animación afecte el posicionamiento `fixed`.

### Settings clave-valor

La tabla `app_settings` usa un patrón clave-valor simple con upsert para la actualización. Las claves actuales son:

- `allow_new_tickets` — Habilitar/deshabilitar creación de tickets.
- `ticket_disabled_message` — Mensaje cuando la creación está deshabilitada.
- `ticket_disabled_title` — Título del mensaje de deshabilitación.
- `knowledge_base_url` — URL configurable de la base de conocimiento.
