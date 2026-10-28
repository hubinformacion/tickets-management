# AGENTS.md - Guía para Agentes de Código

Este documento reúne las convenciones técnicas y reglas de trabajo del repositorio.

## 📋 Información del Proyecto

**Stack Principal:**
- Next.js 16 (App Router) con TypeScript
- PostgreSQL + Drizzle ORM
- Better Auth para autenticación
- Tailwind CSS + shadcn/ui + Radix UI
- React Hook Form + Zod para validación
- pnpm como gestor de paquetes

**Idioma:** Español (UI, mensajes, comentarios)

🧰 **Comandos Principales**

### Desarrollo
```bash
pnpm dev              # Iniciar servidor de desarrollo (puerto 3000)
pnpm build            # Compilar para producción
pnpm start            # Iniciar servidor de producción
pnpm lint             # Ejecutar ESLint
```

### Base de Datos
```bash
pnpm setup --dry-run  # Simulación sin conexión; instalación separada
pnpm db:push --dry-run # Simular sincronización local del esquema
pnpm db:seed --dry-run # Simular carga de datos en BD local nueva
pnpm db:studio --dry-run # Solo BD local con confirmación explícita
pnpm db:reset         # Retirado; no borra ni recrea la BD
pnpm db:drop          # Retirado; no elimina tablas
```

Ver [Mantenimiento seguro de BD](docs/mantenimiento-bd.md). Los comandos con escritura exigen `MAINTENANCE_DATABASE_URL` local y confirmación por operación/destino; no usar túneles hacia producción.

### Tests
**IMPORTANTE:** Este proyecto actualmente NO tiene tests configurados. No intentes ejecutar `pnpm test` o comandos similares.

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Páginas del dashboard
│   ├── login/             # Página de login
│   └── layout.tsx         # Layout raíz
├── actions/               # Server Actions
│   ├── admin/            # Acciones de administrador
│   ├── agent/            # Acciones de agente
│   ├── tickets/          # Acciones de tickets
│   └── config/           # Configuración
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── shared/           # Componentes compartidos
│   ├── admin/            # Componentes específicos de admin
│   ├── agent/            # Componentes específicos de agente
│   └── tickets/          # Componentes de tickets
├── db/                    # Base de datos
│   ├── schema.ts         # Esquema Drizzle ORM
│   └── index.ts          # Cliente de base de datos
├── lib/                   # Utilidades y helpers
│   ├── auth/             # Helpers de autenticación
│   ├── email/            # Sistema de correos
│   ├── utils/            # Utilidades generales
│   ├── validation/       # Esquemas Zod
│   └── constants/        # Constantes de la app
├── scripts/               # Scripts de utilidad
└── types/                 # Definiciones de tipos TypeScript
```

## 🎨 Guías de Estilo de Código

### Indentación
- **2 espacios** para toda indentación (TypeScript, TSX, JSON, CSS)
- NO usar tabs ni 4 espacios

### Imports
- Usar alias `@/*` para imports desde `src/*`
- Orden: externos → internos → relativos → tipos
```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createTicketAction } from "@/actions/tickets";
import type { Ticket } from "@/types";
```

### TypeScript
- `strict: true` - El modo estricto está habilitado
- Definir interfaces para props de componentes
- Usar `type` para tipos simples, `interface` para objetos con propiedades
- Inferir tipos de la BD con Drizzle: `typeof table.$inferSelect`
- Tipos personalizados en `src/types/index.ts`

### Componentes React
```typescript
// Definir props interface antes del componente
interface MyComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  isDisabled?: boolean;
}

// Client components: agregar "use client" si usan hooks
export function MyComponent({ title, onSubmit, isDisabled = false }: MyComponentProps) {
  // ...
}
```

### Server Actions
- Ubicar en `src/actions/`
- Siempre usar `"use server"` al inicio del archivo
- Validar con Zod schemas
- Usar `requireAuth()`, `requireAdmin()`, `requireAgent()` para autenticación
- Retornar `{ error: string }` para errores, datos para éxito
```typescript
"use server";

import { db } from "@/db";
import { mySchema } from "@/lib/validation/schemas";
import { requireAuth } from "@/lib/auth/helpers";

export async function myAction(formData: FormData) {
  const session = await requireAuth();

  const result = mySchema.safeParse({
    field: formData.get("field"),
  });

  if (!result.success) {
    return { error: "Datos inválidos" };
  }

  // Lógica de la acción...
  return { success: true, data: result.data };
}
```

### Validación con Zod
- Schemas en `src/lib/validation/schemas.ts`
- Usar `z.coerce.number()` para IDs de formularios
- Exportar tipos inferidos: `export type MySchema = z.infer<typeof mySchema>;`

### Base de Datos
- Esquema en `src/db/schema.ts`
- Usar Drizzle ORM para todas las queries
- Cliente de BD: `import { db } from "@/db"`
- Tipos: `typeof table.$inferSelect` para SELECT, `typeof table.$inferInsert` para INSERT
```typescript
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { eq } from "drizzle-orm";

const ticket = await db.query.tickets.findFirst({
  where: eq(tickets.id, ticketId),
});
```

### Autenticación
- Usar helpers de `@/lib/auth/helpers`
- `requireAuth()` - Requiere usuario autenticado
- `requireAdmin()` - Requiere rol admin
- `requireAgent()` - Requiere rol agent o admin
- `getSession()` - Obtiene sesión sin redireccionar
- Roles disponibles: `'user' | 'admin' | 'agent'`

### Estilos
- Tailwind CSS para todos los estilos
- Usar utilidad `cn()` de `@/lib/utils/cn` para combinar clases
- Componentes base de shadcn/ui en `src/components/ui/`
```typescript
import { cn } from "@/lib/utils/cn";

<div className={cn("base-class", variant === "primary" && "primary-class", className)} />
```

### Constantes
- Definir en `src/lib/constants/`
- Usar objetos `as const` para enums
```typescript
export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  // ...
} as const;
```

### Naming Conventions
- Archivos: kebab-case (`my-component.tsx`, `user-management.ts`)
- Componentes: PascalCase (`MyComponent`)
- Funciones/variables: camelCase (`handleSubmit`, `userData`)
- Constantes: SCREAMING_SNAKE_CASE (`TICKET_STATUS`, `MAX_LENGTH`)
- Server Actions: camelCase con sufijo `Action` (`createTicketAction`)
- Tipos/Interfaces: PascalCase (`UserRole`, `TicketStatus`)

### Manejo de Errores
- Server Actions: retornar `{ error: string }`
- Cliente: usar `toast.error()` de sonner para mostrar errores
- Validación: usar Zod y retornar errores específicos
```typescript
if (!result.success) {
  return { error: "Mensaje de error", details: result.error.flatten() };
}
```

## 🔐 Seguridad

- **Producción contiene datos reales:** no ejecutar `db:reset`, `db:drop`, `db:seed` ni `setup` contra producción ni usarlos como verificación.
- **Migraciones compatibles:** preparar por defecto cambios aditivos. Las columnas nuevas deben admitir `null` o tener un valor predeterminado compatible con los registros existentes cuando corresponda. Revisar compatibilidad antes de añadir constraints.
- **Preservar historia:** no eliminar ni reescribir registros históricos en migraciones, backfills o limpiezas. No ejecutar cambios destructivos de esquema o datos como parte de un despliegue de código.
- Cualquier operación excepcional sobre datos o esquema de producción requiere una propuesta concreta, respaldo y autorización específica del usuario; un permiso de merge o despliegue de código no la incluye.
- En la estabilización actual, el usuario autorizó expresamente cambios aditivos y nuevas tablas compatibles, con snapshot confirmado el 28 de octubre de 2026. Continuar dentro de ese alcance sin repetir la solicitud de permiso; no cubre borrados, backfills ni cambios destructivos.
- NUNCA commitear `.env.local` o archivos con secretos
- Usar variables de entorno para configuración sensible
- Validar SIEMPRE inputs del usuario con Zod
- Usar helpers de autenticación en TODAS las server actions
- Usar consultas parametrizadas con Drizzle; no interpolar entradas del usuario en SQL

## 📦 Dependencias Importantes

- `better-auth` - Sistema de autenticación
- `drizzle-orm` + `drizzle-kit` - ORM y migraciones
- `zod` - Validación de schemas
- `react-hook-form` - Manejo de formularios
- `@radix-ui/*` - Componentes primitivos accesibles
- `sonner` - Notificaciones toast
- `lucide-react` - Iconos
- `dayjs` - Manejo de fechas
- `tiptap` - Editor de texto enriquecido
- `filepond` - Gestión de archivos

## 🚨 Notas Importantes

1. **NO crear tests**: El proyecto no tiene framework de testing configurado
2. **Usar pnpm**: NO usar npm o yarn
3. **Mensajes en español**: Todos los mensajes de error, UI, y comentarios deben estar en español
4. **Strict mode**: TypeScript está en modo estricto, no usar `any`
5. **Server/Client separation**: Marcar client components con `"use client"`
6. **Path alias**: Siempre usar `@/*` en vez de rutas relativas complicadas
7. **Proxy vs Middleware**: El proyecto usa `proxy.ts` (Next.js 16) en vez de `middleware.ts`
8. **Rate Limiting**: Las server actions críticas tienen rate limiting implementado (ver `src/lib/utils/rate-limit.ts`)
9. **Error Handling**: Todas las rutas principales tienen `error.tsx` y `not-found.tsx` para mejor UX
10. **Capitalización**: Seguir la convención de "Solo capitalizar la primera letra de la frase" en todos los textos UI

## 🔐 Seguridad y Rate Limiting

- **Rate Limiting implementado**: Las acciones críticas tienen protección contra abuso
  - Creación de tickets: 10 por minuto por usuario
  - Comentarios: 10 por minuto por usuario
  - Derivaciones: 10 por minuto por agente
  - Acciones de admin: 30 por minuto por admin
- Rate limiter ubicado en: `src/lib/utils/rate-limit.ts`
- Para crear nuevos limiters: `createRateLimiter('MODERATE')` o `createRateLimiter('STRICT')`

## 📧 Sistema de Correos

- Se utiliza **Gmail API** (googleapis) para el envío de correos
- Configuración en `src/lib/email/gmail-client.ts`
- Plantillas de correo en `src/lib/email/templates/`
- El envío de correos usa `after()` para no bloquear respuestas

## 🏛️ Decisiones de Arquitectura

### Tickets y Códigos
- **Códigos de ticket:** `{SLUG}-{year}-{sequence}` con tabla `ticket_sequence` (contador nunca decrementa)
- **Slugs:** Uppercase de 3 letras: `TSI`, `DIF`, `FED`
- **URLs:** `/dashboard/tickets/{ticketCode}` (no ID numérico) — ej: `/dashboard/tickets/TSI-2026-0001`
- **Email subjects:** `Ticket #2026-0001 | Título` (sin slug de área, helper `getDisplayCode()`)

### Áreas de Atención
- Solo 3 áreas fijas (TSI, Difusión, Fondo Editorial), no crecerán
- **Campos de Difusión:** Columnas nullable en tabla `tickets` (no JSON): `activityStartDate`, `desiredDiffusionDate`, `targetAudience`
- **Archivos adjuntos:** No disponibles para Difusión (ni en formulario ni en detalle)
- **Política de cargas:** Cantidad ilimitada de adjuntos; máximo 4 MB decimales (4.000.000 bytes) por archivo/carga. No introducir cuotas por ticket, usuario, lote ni almacenamiento global (decisión expresa del usuario). Se conservan los controles existentes contra abuso por frecuencia.

### Formulario de Tickets
- Flujo **classification-first** — el usuario primero elige área/categoría/subcategoría, luego aparece el resto del formulario con animación
- **Prioridad:** Requerida para TODAS las áreas (incluyendo Difusión). Campo nullable en BD para compatibilidad
- **Fechas:** Calendar date pickers (react-day-picker con locale `es`), no inputs nativos

### Prioridades
- Tabla `priority_config` con 4 filas por área (descripción + SLA editables)
- Las 4 prioridades (baja, media, alta, urgente) son hardcoded en constantes; solo `description` y `slaHours` son configurables por área

### Proveedores y Tickets de Proveedores
- Tabla `providers` configurable por área
- Tabla `provider_tickets` como módulo independiente con enlace opcional a ticket del sistema
- Página `/dashboard/proveedores` para agentes con tabla, filtros por proveedor/estado, formulario con date picker
- Solo 2 estados: `en_proceso` y `cerrado`

### Actividad (Comments)
- Sección "Actividad" (no "Comentarios") en detalle de ticket
- Tabla `comments` con columnas `type` (`comment` | `derivation` | `system`) y `metadata` (jsonb nullable)
- Timeline diferenciada: comentarios (burbujas), derivaciones (banner ámbar), sistema (texto gris)
- Conteo de no leídos solo cuenta `type='comment'`

### Email
- 7 funciones de email: ticketCreated, userComment, validationRequest, ticketAssigned, ticketResolved, ticketRejected, derivation
- Interfaz `TicketContext` unificada con threading (`inReplyTo`/`references`)
- Gmail API (googleapis) con `after()` para no bloquear respuestas

### Infraestructura y UI
- **Proxy:** El proyecto usa `src/proxy.ts` (Next.js 16), NO `middleware.ts`. Permanece dentro de `src/` por buenas prácticas de App Router. Evitar redirecciones ciegas para prevenir loops con cookies caducas.
- **Base de datos:** Neon PostgreSQL con Drizzle ORM.
- **Rate limiting:** `createRateLimiter('MODERATE')` o `createRateLimiter('STRICT')` (función síncrona).
- **Rendimiento (Vercel Best Practices):** El renderizado del dashboard está optimizado. Para nuevas integraciones se exige usar `Promise.all()` en queries simultáneas para abolir *waterfalls*. Reemplazar condicionales inestables (`&&`) con renderizados estrictos (`? : null`).
- **Aspecto Premium:** Uso extendido de barras nativas con Tailwind (ej. `<MiniBar>`) y *Skeletons* de carga que emulan exactamente el diseño subyacente (ej. diseño *split-screen* del Login y 404 globales). Jamás usar componentes genéricos descuidados.

## 🔄 Reglas de Desarrollo

- Cada nueva funcionalidad se implementa en una **branch independiente**
- Se requiere **aprobación del usuario** antes de merge a main
- Después del merge se elimina la branch
- No generar ni usar Preview: mantener las ramas de trabajo locales, validar localmente y publicar únicamente desde `main`. Agrupar documentación y código para evitar despliegues adicionales de solo documentación (petición del usuario del 28 de octubre de 2026).
### Verificación de Estabilidad 🛡️

```bash
pnpm exec tsc --noEmit    # Verificar tipos de forma estricta
pnpm exec eslint .        # Comprobar variables sin uso
```
```
