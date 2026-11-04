# Encuestas accesibles Implementation Plan

> **For agentic workers:** Ejecutar inline con executing-plans; revisión independiente al terminar. Las reglas del proyecto prevalecen: sin framework ni tests persistentes, sin pnpm test, rama local y validación con datos ficticios.

**Goal:** Calificar encuestas por teclado y lector, conservando respuestas/acciones y ajuste móvil.
**Architecture:** Un campo de valoración nativo reutilizado por encuesta flotante y cierre de proveedores. Ajustes acotados de ancho y estado accesible.
**Tech Stack:** React 19, TypeScript, Tailwind existente; sin dependencias nuevas.
**Spec:** [Diseño](2026-11-04-encuestas-accesibles-design.md).

## Restricciones

Escala/preguntas/payload y validaciones existentes; español, foco visible, IDs por instancia; no acceso a BD/servicios, no Preview. Checkout actual con rama local, sin worktree adicional: no hay trabajo concurrente de escritura que aislar.

## Atención en revisión

Valores no seleccionados, teclado sin ratón, múltiples instancias, bloqueo durante envío, anchura estrecha/altura reducida y error de servidor ficticio.

## Tareas

- [x] Crear src/components/surveys/survey-rating-field.tsx: fieldset/legend, radios 1–5, IDs únicos, extremos y colores/foco existentes, disabled nativo.
- [x] Integrar en pending-survey-banner.tsx y provider-tickets-list.tsx, sin modificar sus acciones/payload; ajustar panel móvil e ID de sugerencias y estado expandido.
- [x] Comprobar recorrido en navegador con fixtures: flechas/Tab, aislamiento, disabled, error/reintento, envío idéntico; dimensiones/temas y capturas visuales. Ejecutar tipos, ESLint y build ficticio; detector Impeccable una vez y contrastar resultados.
- [x] Revisión independiente, resolver defectos concretos, documentar evidencia/limitaciones y commit local con código y documentación.
