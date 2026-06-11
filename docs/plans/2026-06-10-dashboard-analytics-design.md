# Dashboard de Analytics — Design Doc

**Fecha:** 2026-06-10
**Rama:** `feature/dashboard-analytics`
**Estado:** Implementado

## Resumen

Dashboard completo de analytics con KPIs, gráficas, SLA compliance, y reportes por rol. Usa Server Components + Recharts para renderizar métricas en `/dashboard/analytics`.

## Decisiones

- **Approach:** Server Components + Recharts (nativo de App Router)
- **Librería de charts:** Recharts (40KB gzipped, declarativa)
- **SLA tracking:** Migración nueva `ticket_status_history` (sin borrar datos existentes)
- **Acceso:** Dashboard por rol (admin ve global, agente ve su área, usuario ve sus tickets)

## Archivos nuevos

### Base de datos
- `src/scripts/migrate-status-history.sql` — Migración SQL
- `src/scripts/backfill-status-history.ts` — Backfill desde datos existentes
- `src/lib/utils/status-history.ts` — Helper para registrar cambios de estado
- `src/db/schema.ts` — Tabla `ticket_status_history` + relations

### Queries
- `src/db/queries/analytics.ts` — 9 queries de agregación (volume, area, priority, trend, SLA, satisfaction, workload, categories, KPIs)

### Constants
- `src/lib/constants/analytics.ts` — Colores, labels, opciones de filtro

### Componentes
- `src/components/analytics/kpi-card.tsx` — Card de métrica con trend
- `src/components/analytics/chart-card.tsx` — Wrapper genérico para charts
- `src/components/analytics/dashboard-filters.tsx` — Filtros de fecha
- `src/components/analytics/charts/bar-chart.tsx` — Wrapper Recharts
- `src/components/analytics/charts/pie-chart.tsx` — Wrapper Recharts
- `src/components/analytics/charts/line-chart.tsx` — Wrapper Recharts
- `src/components/analytics/charts/area-chart.tsx` — Wrapper Recharts
- `src/components/analytics/ticket-volume-chart.tsx` — Tickets por estado
- `src/components/analytics/area-distribution-chart.tsx` — Distribución por área
- `src/components/analytics/priority-breakdown-chart.tsx` — Distribución por prioridad
- `src/components/analytics/resolution-trend-chart.tsx` — Tendencia semanal
- `src/components/analytics/sla-compliance-chart.tsx` — % SLA compliance
- `src/components/analytics/satisfaction-trend-chart.tsx` — Tendencia satisfacción
- `src/components/analytics/top-categories-chart.tsx` — Top categorías
- `src/components/analytics/agent-workload-table.tsx` — Carga por agente
- `src/components/analytics/admin-dashboard.tsx` — Dashboard admin (client)
- `src/components/analytics/agent-dashboard.tsx` — Dashboard agente (client)
- `src/components/analytics/user-dashboard.tsx` — Dashboard usuario (client)

### Páginas
- `src/app/dashboard/analytics/page.tsx` — Página unificada (detecta rol)

### Archivos modificados
- `src/actions/tickets/create-ticket.ts` — Inserta en historial al crear
- `src/actions/tickets/cancel-ticket.ts` — Inserta en historial al anular
- `src/actions/tickets/validation.ts` — Inserta en historial en approve/reject/request
- `src/actions/admin/ticket-management.ts` — Inserta en historial + borra en deep delete
- `src/app/api/cron/auto-close-tickets/route.ts` — Inserta en historial en auto-close
- `src/components/tickets/ticket-activity.tsx` — Muestra historial de estados en Bitácora
- `src/app/dashboard/(shared)/tickets/[code]/page.tsx` — Fetch status history
- `package.json` — Dependencia `recharts`

## KPIs por rol

### Admin (8 KPIs)
- Tickets abiertos, en progreso, resueltos, tasa de resolución
- Tiempo prom. resolución, SLA compliance, satisfacción, sin asignar

### Agent (4 KPIs)
- Tickets de mi área, en progreso, SLA compliance, satisfacción

### User (4 KPIs)
- Mis tickets, pendientes, resueltos, satisfacción

## Migración

```sql
-- Tabla nueva: ticket_status_history
-- Backfill: 175 registros desde tickets existentes
-- Seguro: no borra datos existentes
```

## Verificación

- `pnpm exec tsc --noEmit` — Sin errores
- `pnpm build` — Exitoso (con --max-old-space-size=4096)
- `pnpm exec eslint .` — Solo warnings pre-existentes
