# Plan de estabilización — 6 de octubre de 2026

> **Estado:** borrador histórico. La propuesta de sandbox fue cancelada; la Fase 0 y cualquier verificación que dependa de una BD aislada requieren redefinirse antes de ejecutar este plan.

## Objetivo y reglas

Corregir los riesgos de [la auditoría](2026-10-06-auditoria.md) y disponer de un entorno reproducible para ampliar funcionalidades sin deteriorar producción. **Este documento es un plan pendiente de ejecución**, no un registro de correcciones hechas. El listado de features se incorporará después del criterio de salida de estabilización.

Trabajar por fase en rama independiente; validar en sandbox y obtener aprobación del usuario antes de merge a main. No mergear develop completo si contiene cambios ajenos a la fase. La auditoría está en `chore/auditoria-2026-10-06` y conserva los cambios preexistentes del usuario.

Sin framework nuevo de tests: usar comprobaciones existentes y los escenarios de [validación](2026-10-06-validacion.md). No ejecutar reset/drop/seed contra datos reales. Cambios de esquema mediante migraciones revisables, ensayo en copia aislada y respaldo restaurable; no db:push improvisado en producción.

Esfuerzo orientativo para una persona familiarizada con el proyecto: 10–19 días efectivos, más disponibilidad de accesos y observación de producción. Los rangos cubren implementación y validación, no son fechas comprometidas ni se basan en volumen real de datos. Un incidente crítico confirmado adelanta su parche a una rama de emergencia.

## Fase 0 — Entorno y capacidad de verificación

**Esfuerzo:** 0,5–1,5 días más accesos. **Dependencias:** administrador de Vercel, Neon y Google. **Hallazgos:** O01 y O05; diagnóstico de O04.

- Identificar commit/lockfile realmente desplegados, versiones de runtime y variables por entorno sin copiar valores secretos al repositorio.
- Crear/verificar BD aislada con usuarios y datos sintéticos; mantener local y preview separados de producción. Si se deriva de datos reales, anonimizar antes de uso cotidiano.
- Gmail desactivado por defecto fuera de producción; envío de prueba solo a destinatarios controlados. Drive usa carpeta/credenciales de prueba con permisos comprobados; no la carpeta de producción.
- Cron de preview deshabilitado por defecto. Para validarlo manualmente, habilitación explícita limitada al entorno aislado y secreto propio, no un guard de producción que vuelva imposible la prueba.
- Comprobar respaldo y restauración en instancia aislada; retirar los scripts destructivos del procedimiento de verificación habitual. Corregir sus guards antes de volver a utilizarlos.
- Fijar Node 24 y pnpm 11 compatibles con esta verificación; concretar versiones con las de producción. Preparar heap de 4 GB donde exista memoria suficiente, sin desactivar tipos; diagnóstico adicional si CI dispone de menos memoria.

**Salida:** V00 documentado; datos, correo, archivos y cron no afectan producción. Build con configuración de sandbox reproducible. Las guías históricas 01–03 no se usan como instrucciones vigentes.

## Fase 1 — Autorización, integridad inmediata y seguridad de paquetes

**Esfuerzo:** 3–5 días. **Dependencias:** Fase 0. **Hallazgos:** S01–S06, D01–D03, D06, O03; versiones prioritarias.

- Crear política compartida del servidor para lectura/participación/gestión del ticket. Admin global; agente limitado al área; creador y observador autorizado participan; solo creador/admin/agente del área gestionan observadores. Revalidar usuario activo y área en endpoints pertinentes.
- Aplicarla a comentar, vincular/borrar adjuntos, asignar/desasignar, cambiar estado, solicitar validación y derivar. Comparar attachment.ticketId; hacer cumplir restricciones DIF/FED aunque se invoque la acción directamente.
- Definir inputs Zod para acciones expuestas: IDs positivos enteros, estados permitidos, mensajes acotados, observadores deduplicados de usuarios activos existentes. Comprobar clasificación activa, relaciones entre área/categoría/subcategoría y pausa global/de área en el servidor.
- Transiciones con estado/asignación esperados en WHERE y RETURNING; retorno de conflicto sin efectos secundarios cuando otro proceso ganó. Estado, historial y comentario en una transacción; helper de historial acepta executor tx. Creación confirma ticket/código/historial/vinculación juntos.
- Asignación solo desde abierto sin asignación; no reabrir cerrados mediante autoasignación. Rechazo de validación solo desde pending_validation; historial conserva actor y estado real. Cron cierra solo filas todavía elegibles e inserta historial en lote dentro de la transacción.
- Separar calendario YYYY-MM-DD e instantes; Lima explícita para visualización temporal y año de secuencia. No cambiar la exclusión atómica del contador.
- Escapar valores de reportes HTML; filtros validados. Upload verifica activo, formato, firma aplicable, tamaño y cantidad. Instalar limitador compartido con namespace de operación: conservar límites actuales, validar presupuesto del proveedor antes de contratarlo.
- Actualizar Next + eslint-config-next a 16.3.8 y familia Tiptap a 3.31.4 en cambios separados y revisables; verificar versiones resueltas de ProseMirror/sharp. Analizar avisos restantes del lockfile para exposición real. Better Auth primero a 1.6.x compatible >=1.6.22, revisando transitivas; no activar nuevos plugins.
- Cambiar script lint a eslint . y corregir los cuatro errores existentes conservando comportamiento, para permitir comprobar la fase sin desactivar reglas globales. La limpieza completa de advertencias y CI quedan en Fase 3.

**Interfaces:** conservar nombres/consumidores actuales de acciones y forma de errores `{ error: string }`; añadir conflicto y validación con mensaje en español. Política compartida server-only. El limiter compartido requiere await en sus consumidores. No eliminar guards al extraer servicios. Esquema solo cuando lo requiera la solución de rate limiting o el ensayo seguro, mediante migración explícita.

**Salida:** V01–V05, V07, V10 y V12 aprobados; tipos/lint/build del cambio pasan. Ningún permiso se apoya solo en la UI. Avisos críticos/altos alcanzables corregidos o mitigados con evidencia; condiciones no aplicables documentadas.

## Fase 2 — Recuperación, datos y operación confiable

**Esfuerzo:** 3–5 días. **Dependencias:** Fase 1. **Hallazgos:** S07–S09, D02, D04–D05, D09, O02 y O05.

- Recordatorios: backlog de vencidos no enviados, orden estable y lote acotado; claim/lease persistente para ejecución concurrente. Marcar enviado solo cuando Gmail devuelve success; reintentar fallo. Registrar fallos, pendientes y recuperaciones sin contenido sensible. Admitir explícitamente posibilidad de duplicado ante crash entre aceptación de Gmail y persistencia.
- Upload con compensación si falla BD; borrados con referencia conservada y estado pendiente/reintentos hasta confirmar Drive. Limpieza de archivos sin ticket tras 24 h solo en el entorno identificado, excluyendo uploads activos; alertar fallos, no borrar referencias de fallos silenciosos.
- Proveedores: referencia al ticket del área autorizada, fechas ISO reales y orden contra requestDate nuevo; cierre/reapertura condicional. Encuesta completa o ausente, parcial devuelve validación. Mantener los dos estados actuales.
- Ordenación con transacción y bloqueo del grupo; orden calculado desde BD y scope de área/categoría. Dos inserciones concurrentes no dejan órdenes duplicados.
- Metadata usa lector autorizado; actividad de sistema renderiza texto/estructura, nunca HTML arbitrario; comentarios internos solo para admin/agente del área. Login pide identidad básica, credenciales institucionales separadas.
- Revisar datos antes de constraints: dominios de estado/rol/prioridad/tipo, rating entero 1–5, SLA positivo e índices para filtros/joins reales. Preferir CHECK a convertir masivamente columnas en enums. No añadir cascadas generales sin revisar retención y dependencias.
- Scripts de borrado requieren destino sandbox, IDs explícitos y dry-run; limpieza FED no selecciona todos los tickets como si fueran datos de prueba.

**Interfaces/esquema:** campos de claim y recuperación o cola equivalente en migración versionada; preservar datos y compatibilidad durante despliegue. Nuevos jobs protegidos por secreto y entorno propio. Aplicar cambios aditivos antes del código que los usa; constraints después del saneamiento de datos. Registrar rollback de código y recuperación de datos por separado.

**Salida:** V03, V05–V08, V11 y V14 aprobados, incluyendo fallos de terceros y reintentos. Copia de respaldo restaurada en aislamiento y migración ensayada antes de producción.

## Fase 3 — Calidad, métricas y entrega repetible

**Esfuerzo:** 2–4 días. **Dependencias:** Fase 2. **Hallazgos:** D07–D08, O04, Q01 y Q03.

- Limpiar advertencias útiles sin supresión global y conservar lint aprobado desde Fase 1. Agregar CI de tipos, lint y build con lockfile congelado, entorno sintético y sin servicios de producción. No crear Vitest/Testing Library.
- Resolver historial SLA en lote; evento in_progress debe preceder al cierre evaluado. Usar horario hábil configurado para métricas de atención y etiquetar claramente otras métricas que midan tiempo natural. KPI de respuesta usa misma cohorte/filtros; periodos fijos se muestran explícitos.
- Paralelizar consultas independientes; paginar resultados de encuestas/proveedores y reducir columnas de usuarios/autores enviadas al cliente. Medir queries y duración en sandbox representativo; no hacer cambios de índices por intuición.
- Corregir login y revalidaciones contra rutas visibles; consolidar servicios/schemas admin-agent preservando controles de área. Retirar lectores/helpers sin consumidores solo tras confirmar usos.
- Aplicar parches de mantenimiento por familias. React y React DOM juntos, tipos compatibles. Migraciones TypeScript/ESLint/Google/Lucide mayores quedan fuera del requisito de estabilización y con evaluación separada.
- Actualizar instrucciones operativas, versiones y manuales según comportamiento final; registrar manejo de fallos de correo/cron y responsables de alertas.

**Salida:** V09, V11, V13–V15 aprobados; CI verde, rutas consistentes y métricas reproducibles. Avisos restantes clasificados con condición y justificación, sin excepciones genéricas.

## Fase 4 — Accesibilidad y refinamiento visual

**Esfuerzo:** 1–3 días. **Dependencias:** estabilidad de Fase 3. **Hallazgos:** Q02 y Q04.

- Menú móvil fuera de tabulación cuando cerrado, foco visible/confinado al abrir y devuelto al cerrar; nombres accesibles en herramientas del editor y tamaño táctil adecuado.
- Recorrido de flujos principales a 360, 768 y 1440 px, claro/oscuro, teclado y estados de carga/error. Corregir desbordamientos y contraste detectados.
- Reusar tokens, badges y estructura existentes; agregar loading adecuado de analytics y colocar Suspense donde pueda cubrir trabajo pendiente. No rediseñar por estilo ni inventar primitivas compartidas sin usos reales.

**Salida:** V16 aprobado con registro del recorrido; defects de acceso a herramientas corregidos. Mejoras decorativas P3 pueden quedar en backlog sin impedir nuevas funcionalidades.

## Despliegue, seguimiento y salida global

Cada fase se presenta con diff, cambios de interfaces/esquema, resultado de validación, configuración necesaria y rollback. Tras aprobación del usuario: aplicar migración compatible si corresponde, desplegar código y comprobar login, creación, adjuntos, transición e informes. Revisar errores, recordatorios y tareas pendientes durante 24–48 h antes de la siguiente fase; eliminar rama después del merge siguiendo AGENTS.md.

**Listo para features:** ningún riesgo crítico/alto aplicable sin resolver; operaciones no autorizadas bloqueadas; transiciones/historial consistentes; recordatorios recuperables; tipos/lint/build aprobados; sandbox y restauración verificados. Las limitaciones y P2/P3 pendientes tienen registro concreto. No se exige llevar todos los paquetes a latest ni eliminar todos los avisos de audit sin evaluar aplicabilidad.
