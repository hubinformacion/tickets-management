# Advertencias de ESLint

## Cambios

El formulario de tickets usa `useWatch({ control: form.control })` para observar sus valores. Se conserva el formulario, sus valores iniciales, validaciones, resets y cálculo de progreso. La suscripción se declara antes de los manejadores de interacción y reemplaza `form.watch()`, que provocaba la advertencia de incompatibilidad con la memoización del compilador de React.

Los botones «Volver al inicio» de las pantallas de error son enlaces internos de Next.js con el estilo de Button mediante `asChild`. Conservan `/dashboard` y `/` como destinos y no hacen prefetch. La navegación pasa a usar el router de Next.js en lugar de asignar `window.location.href`; el botón «Intentar de nuevo» conserva `reset`.

No se desactivan reglas de ESLint ni se añaden excepciones. No cambian políticas de acceso, tokens de Google, carpeta de Drive, adjuntos, correos, tablas ni datos. El consentimiento de carpeta pendiente quedó cancelado por decisión del usuario; no forma parte de esta entrega.

## Validación

- TypeScript: `tsc --noEmit --incremental false`, aprobado.
- ESLint: ejecución completa con `--max-warnings 0`, sin errores ni advertencias.
- Build local completo: Next.js 16.4.3/Turbopack, tipos, generación de 23 páginas y optimización aprobados.

Las verificaciones se ejecutaron en copias temporales, sin `.env.local` ni credenciales de producción. Tipos/lint usaron red aislada y fuentes/dependencias de solo lectura. El build usó variables ficticias y acceso HTTPS para las fuentes públicas, con límites de memoria, CPU, procesos y espacio temporal. Las copias se eliminaron al terminar. No se añadieron tests ni un framework de pruebas; no se ejecutaron operaciones contra BD, Gmail o Drive para verificar estos cambios.

La compilación no certifica interacción de navegador: quedan por recorrer el progreso del formulario al cambiar de área y ambos botones de las pantallas de error con una sesión real. No se simulan esos resultados como aprobados.

## Entrega

La rama de calidad permanece local durante la validación. Se agrupa con el cierre documental anterior para publicar un único commit desde main, sin Preview y sin un despliegue separado de documentación. El último despliegue verificado antes de este bloque fue `e2e1596`.

## Referencias

- [Suscripción de valores con useWatch](https://react-hook-form.com/docs/usewatch).
- [Navegación mediante Link](https://nextjs.org/docs/app/api-reference/components/link).
