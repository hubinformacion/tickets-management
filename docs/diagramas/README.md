# Diagramas del Sistema · Gestión de Tickets

Este directorio contiene los diagramas técnicos y de interacción del sistema, diseñados con la especificación y sistema de diseño editorial de **`diagram-design`** (ubicado en `~/.agents/skills/diagram-design`).

---

## 🏛️ 1. Diagrama de Arquitectura de Sistema

Modela la infraestructura integral dividida en 4 capas de confianza:

1. **Cliente & Presentación:** Next.js 16 App Router con React 19, componentes shadcn/ui, formularios tipados con Zod y control de acceso/rate limiting centralizado mediante `src/proxy.ts`.
2. **Next.js 16 Core Application (Punto Focal 1):** Orquestador de Server Actions (`src/actions/*`), motor de ciclo de vida de tickets `{AREA}-{YYYY}-{SEQ}`, módulo de proveedores, tareas en segundo plano (Crons y carga de archivos) y despachador de eventos asíncronos con `after()`.
3. **Persistencia & ORM (Punto Focal 2):** Drizzle ORM 0.45 en modo estricto y base de datos relacional Neon PostgreSQL con 16 tablas normalizadas y bitácora de auditoría inmutable.
4. **Servicios Cloud & APIs:** Integraciones transaccionales con Gmail API (threading RFC y 7 plantillas), Google Drive API (almacenamiento de adjuntos en carpeta institucional) y Google Cloud OAuth 2.0.

- **[arquitectura-sistema.html](./arquitectura-sistema.html):** Versión interactiva completa con SVG inline, selector de tema Claro/Oscuro y fichas descriptivas por componente.
- **[arquitectura-sistema.svg](./arquitectura-sistema.svg):** Diagrama vectorial SVG independiente apto para incrustación directa.

---

## 🔄 2. Diagrama de Proceso e Interacción (Swimlane)

Modela la interacción multi-actor y el flujo de estados a lo largo del ciclo de vida de los requerimientos:

- **Carril 1 (Usuario Solicitante):** Login con Google OAuth → Clasificación jerárquica (*classification-first*) → Envío de requerimiento y adjuntos → Diálogo en timeline → Validación de solución ([Aprobar] / [Rechazar]) → Encuesta CSAT (1-5 estrellas).
- **Carril 2 (Plataforma & Next.js 16):** Generación atómica de código con `ticket_sequence` → Notificaciones asíncronas vía Gmail API (`after()`) → Tareas programadas de auto-cierre tras 7 días de inactividad.
- **Carril 3 (Agente de Atención):** Diagnóstico y SLA → Atención directa o derivación externa → Informe de solución técnica y pase a `pending_validation`.
- **Carril 4 (Proveedor Externo):** Registro de `provider_ticket` con código manual → Ejecución especializada → Entrega y evaluación de satisfacción del proveedor (1-5).

- **[proceso-interaccion-swimlane.html](./proceso-interaccion-swimlane.html):** Versión interactiva completa con SVG inline, selector de tema Claro/Oscuro y tarjetas de detalle por etapa.
- **[proceso-interaccion-swimlane.svg](./proceso-interaccion-swimlane.svg):** Diagrama vectorial SVG independiente del flujo swimlane.

---

## 🎨 Especificaciones de Diseño Editorial (`diagram-design`)

- **Presupuesto Focal:** Máximo 1–2 puntos focales destacados con color de acento *Atomic Tangerine* (`#eb6c36` / `var(--color-accent)`).
- **Conectores Ortogonales Obligatorios:** Trazados ortogonales en ángulo recto con esquinas redondeadas de radio `r=8` y máscaras protectoras de texto para evitar cortes visuales.
- **Tipografía Editorial:** Encabezados en *Instrument Serif* y etiquetas/subetiquetas técnicas en *Geist* y *Geist Mono*.
- **Cero Dependencias en Runtime:** Archivos HTML y SVG completamente autónomos y listos para abrir en cualquier navegador o visor de markdown.
