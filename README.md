# 🎫 Sistema de Gestión de Tickets

[![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.7-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green.svg)](https://orm.drizzle.team/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

Plataforma integral de gestión, trazabilidad y resolución de requerimientos institucionales construida con **Next.js 16 (App Router)**, **React 19**, **PostgreSQL (Neon Serverless)**, **Drizzle ORM** y **Better Auth**.

Diseñada con un estándar editorial moderno, flujos *classification-first*, soporte multi-área fija, derivaciones a proveedores externos, auditoría inmutable y encuestas de satisfacción.

---

## ✨ Características Principales

- 🔐 **Autenticación Federada**: Better Auth integrado con Google Cloud OAuth 2.0 y control de sesiones seguro.
- 👥 **Roles y Permisos**: Roles `user`, `agent` y `admin` con navegación y acciones aisladas por permisos.
- 🏢 **Áreas de Atención Especializadas**:
  - **TSI** (Tecnologías y Sistemas de Información): Soporte técnico, infraestructura, encuestas de satisfacción.
  - **DIF** (Difusión): Requerimientos de comunicación con fechas de inicio de actividad y público objetivo.
  - **FED** (Fondo Editorial): Solicitudes de publicación y cotización con metadatos dinámicos.
- 🎫 **Generación Atómica de Códigos**: Formato `{AREA}-{YYYY}-{SEQ}` (ej: `TSI-2026-0001`) gestionado por la tabla `ticket_sequence` para prevenir colisiones concurrentes.
- 📋 **Formularios Classification-First**: Flujo de selección en cascada (Área → Categoría → Subcategoría) antes de renderizar campos específicos con animaciones fluidas.
- 💬 **Línea de Tiempo de Actividad**: Distinción visual entre comentarios de usuarios, derivaciones a terceros (banner ámbar) y eventos del sistema.
- 🔀 **Módulo de Proveedores y Derivaciones**: Seguimiento a terceros vía `provider_tickets` con evaluación de desempeño (calidad, plazos, atención).
- ⭐ **Encuestas de Satisfacción (CSAT)**: Calificación de 1 a 5 estrellas en tiempo de respuesta, comunicación, solución y calidad general.
- 📧 **Notificaciones Asíncronas (Gmail API)**: Despacho no bloqueante mediante `Next.js after()` con threading RFC (`In-Reply-To`, `References`) y 7 plantillas transaccionales.
- 📎 **Almacenamiento en Google Drive**: Carga en streaming de archivos adjuntos directamente a carpetas institucionales con enlaces seguros de visualización.
- 🛡️ **Seguridad y Control de Borde**: Proxy moderno (`src/proxy.ts`) para protección de rutas y *Rate Limiting* en memoria contra abusos (10 a 30 req/min).
- 🎨 **UI de Alto Rendimiento**: Tailwind CSS v4, componentes accesibles shadcn/ui + Radix UI, editor TipTap, modo claro/oscuro y *skeletons* nativos split-screen.

---

## 🏛️ Arquitectura y Diagramas del Sistema

El sistema cuenta con diagramas interactivos y vectoriales diseñados bajo la especificación editorial de la skill **Diagram Design**:

- **[Diagrama de Arquitectura (HTML Interactivo)](./public/diagramas/arquitectura-sistema.html):** Desglose de las 4 capas estructurales (Cliente, Next.js 16 Application, Persistencia PostgreSQL y Servicios Cloud).
- **[Diagrama de Arquitectura (SVG)](./docs/diagramas/arquitectura-sistema.svg):** Vectorial autónomo.
- **[Diagrama Swimlane de Interacción (HTML Interactivo)](./public/diagramas/proceso-interaccion-swimlane.html):** Flujo multi-actor (Usuario → Plataforma → Agente → Proveedor Externo).
- **[Diagrama Swimlane de Interacción (SVG)](./docs/diagramas/proceso-interaccion-swimlane.svg):** Vectorial autónomo.
- **[Índice Completo de Diagramas](./docs/diagramas/README.md):** Documentación técnica de diagramas.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Framework Fullstack** | Next.js 16.2.7 (App Router + Turbopack) |
| **Librería UI & Core** | React 19.2.7 + TypeScript 5.9 (Strict Mode) |
| **Base de Datos** | PostgreSQL (Neon Serverless) |
| **ORM & Tipado** | Drizzle ORM 0.45 + Drizzle Kit |
| **Autenticación** | Better Auth 1.6 + Google OAuth 2.0 |
| **Estilos & Componentes** | Tailwind CSS v4 + shadcn/ui + Radix UI + Lucide Icons |
| **Formularios & Validación** | React Hook Form 7 + Zod 4 |
| **Editor Enriquecido** | TipTap 3.26 StarterKit |
| **Servicios Externos** | Google APIs (Gmail API v1 & Google Drive API v3) |
| **Gestor de Paquetes** | pnpm |

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js v20+
- pnpm v9+
- Base de datos PostgreSQL (local o Neon)
- Credenciales en Google Cloud Console (OAuth 2.0 y Gmail API activada)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/r3-fresh/tickets-management.git
cd tickets-management

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
```

### Variables de Entorno (`.env.local`)

```env
# Conexión a Base de Datos (Neon / PostgreSQL)
DATABASE_URL="postgresql://usuario:password@ep-sample.us-east-2.aws.neon.tech/tickets_db?sslmode=require"

# Better Auth & URL de la App
BETTER_AUTH_SECRET="tu-secreto-generado-con-openssl"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google Cloud OAuth 2.0 (Autenticación)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# Gmail API & Notificaciones (OAuth2 Refresh Token)
GMAIL_REFRESH_TOKEN="tu-gmail-refresh-token"
EMAIL_FROM="mesa-de-ayuda@institucion.edu.pe"

# Google Drive (Almacenamiento de Adjuntos)
GOOGLE_DRIVE_FOLDER_ID="id-de-carpeta-institucional-en-drive"

# Cron Jobs de Mantenimiento
CRON_SECRET="secret-para-endpoints-cron"
```

### Inicialización de Base de Datos

```bash
# Ejecutar sincronización de esquema y carga de seeds
pnpm setup
```

### Servidor de Desarrollo

```bash
# Iniciar servidor local con Turbopack
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 📦 Scripts Disponibles

```bash
# Desarrollo y Compilación
pnpm dev              # Iniciar servidor de desarrollo en puerto 3000
pnpm build            # Compilar bundle de producción
pnpm start            # Iniciar servidor compilado en producción
pnpm lint             # Ejecutar análisis estático con ESLint

# Gestión de Base de Datos (Drizzle)
pnpm setup            # Setup completo: install + db:push + db:seed
pnpm db:push          # Sincronizar esquema de TypeScript con la BD
pnpm db:seed          # Cargar catálogo de áreas, prioridades y categorías
pnpm db:studio        # Abrir Drizzle Studio (interfaz gráfica de BD)
pnpm db:reset         # Reset completo (⚠️ destructivo: drop + push + seed)
pnpm db:drop          # Eliminar todas las tablas de la BD
```

---

## 🔐 Roles y Accesos

| Rol | Alcance y Funcionalidades |
|---|---|
| **`user` (Usuario)** | Crear requerimientos, consultar historial propio, interactuar en timeline, validar resolución y responder encuestas CSAT. |
| **`agent` (Agente)** | Gestión del tablero de su área asignada (`TSI`, `DIF` o `FED`), derivación a proveedores externos, asignación y cierre técnico. |
| **`admin` (Administrador)** | Acceso global irrestricto, configuración de catálogos, ajuste de SLAs y horarios hábiles, gestión de usuarios y métricas avanzadas. |

---

## 📚 Documentación Técnica y Manuales

| Documento | Enlace | Descripción |
|---|---|---|
| **Manual de Usuario** | [docs/manual-usuario.md](./docs/manual-usuario.md) | Guía para usuarios solicitantes |
| **Manual de Agente** | [docs/manual-agente.md](./docs/manual-agente.md) | Guía de atención, derivaciones y estados |
| **Manual de Administrador** | [docs/manual-admin.md](./docs/manual-admin.md) | Configuración de áreas, SLAs y gobernanza |
| **Manual Técnico** | [docs/manual-tecnico.md](./docs/manual-tecnico.md) | Arquitectura, proxy, server actions y base de datos |
| **Índice de Diagramas** | [docs/diagramas/README.md](./docs/diagramas/README.md) | Documentación editorial de diagramas |
| **Guía para Agentes AI** | [AGENTS.md](./AGENTS.md) | Reglas estrictas y arquitectura para agentes |

---

## 📝 Licencia

Este proyecto está bajo una **Licencia Propietaria**. Consulte [LICENSE](./LICENSE) para más detalles.

---

## 👤 Autor

**r3-fresh** · © 2026. Todos los derechos reservados.
