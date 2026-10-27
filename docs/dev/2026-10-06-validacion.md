# Registro y escenarios de validación — 6 de octubre de 2026

> Registro histórico de la propuesta de sandbox, cancelada posteriormente. Los escenarios que dependen de sandbox no son instrucciones vigentes.

## Validación realizada

| Comando / comprobación | Resultado |
|---|---|
| git status, ramas y log local | Cambios preexistentes inventariados; main coincide con origin/main local, sin fetch |
| pnpm exec tsc --noEmit --incremental false | Salida 0, sin errores |
| pnpm exec eslint . --format json | Salida 1: 4 errores, 62 advertencias |
| pnpm audit --prod --json | Salida 1 por avisos: 53 entradas / 46 GHSA distintos |
| pnpm audit --json | Salida 1 por avisos: 71 entradas / 55 GHSA distintos |
| pnpm outdated --format json | Salida 1 por actualizaciones disponibles: 48 paquetes |
| pnpm build, entorno sintético | Compiló; fallo por OOM del worker de tipos con heap cercano a 2 GB |
| pnpm build, entorno sintético y NODE_OPTIONS=--max-old-space-size=4096 | Salida 0; compilación, tipos y generación de rutas aprobados |
| AST de src/actions | 66 funciones exportadas con guard directo; 13 con safeParse, 7 con limiter, 3 con transacción |
| Escaneo limitado de patrones de secretos | Solo ejemplo ficticio en README; no revisa historial ni certifica ausencia total |

El build usó DB ficticia en `127.0.0.1:1`, URLs locales, OAuth ficticio, Gmail token y carpeta Drive vacíos, emisor `example.invalid`, secreto de prueba y telemetría desactivada. Se neutralizaron en el entorno del proceso las claves declaradas en los archivos de variables antes de lanzar pnpm. Aunque Next informa que lee `.env.local`, las claves ya estaban definidas y dotenv no inyectó valores. No se inició servidor autenticado ni se operó sobre BD/Drive/Gmail.

El primer OOM fue una limitación reproducida en esta máquina, no evidencia de fallo del despliegue de Vercel. El segundo build valida compilación con 4 GB; no valida servicios reales ni recorridos de usuario. No se cambió tsconfig/next.config para ignorar errores.

### Errores de lint

| Ubicación | Regla |
|---|---|
| src/actions/tickets/create-ticket.ts:132 | @typescript-eslint/no-require-imports |
| src/components/admin/business-hours-management.tsx:118 | react-hooks/set-state-in-effect |
| src/components/agent/config-form.tsx:36 | react-hooks/set-state-in-effect |
| src/components/shared/file-upload.tsx:22 | react-hooks/refs |

Advertencias resumidas en evidencia JSON. El warning de React Hook Form/React Compiler no prueba que el compilador esté habilitado o exista una regresión: evaluar el consumidor antes de cambiar hooks.

### Reproducciones locales sin datos reales

Se importaron únicamente helpers puros mediante tsx; no se importó el cliente de BD ni las acciones.

| Entrada | TZ del proceso | Resultado |
|---|---|---|
| formatDateShort("2026-10-06") | UTC | 05/10/2026 |
| formatDateShort("2026-10-06") | America/Lima | 06/10/2026 |
| calculateBusinessHours(2026-10-05T13:30Z, 2026-10-05T23:30Z, 08:30, 18:30) | UTC | 5 horas |
| Mismo intervalo | America/Lima | 10 horas |

El calendario representa el 6 de octubre y debe conservar el día. El intervalo corresponde a lunes 08:30–18:30 en Lima. El helper de horas no tiene consumidores actuales; analytics calcula tiempo natural por otro camino.

Ejemplo de la ventana de cron, obtenido de condiciones/configuración: cierre el 4 de octubre a las 18 UTC; ejecución diaria del 5 a las 13 UTC = 19 h después, fuera de ventana; ejecución del 6 = 43 h, nuevamente fuera. La omisión no necesita un cron fallido.

## Preparación de escenarios pendientes

**Ninguno de los V00–V16 se declara aprobado por esta auditoría.** Son aceptación para las correcciones futuras. Preparar datos sintéticos y usuarios: creador, observador, usuario ajeno, agente TSI, agente DIF, agente sin área, admin y usuario desactivado con sesión previa. Tickets por área en todos los estados, adjuntos propios/ajenos y proveedores de áreas diferentes.

Usar acciones desde la UI y llamadas directas autenticadas con sus inputs válidos/alterados; no depender de que el botón esté visible. Anotar versión/commit, entorno, rol, entrada, resultado esperado/obtenido y efectos en BD/historial/correos/Drive. Guardar solo identificadores de prueba, no tokens/cookies. Sin framework nuevo de tests.

| Caso | Escenario | Resultado esperado tras corrección |
|---|---|---|
| V00 | Verificar destinos local/preview, almacenamiento, correo y cron; restaurar respaldo en instancia aislada | Ninguna operación alcanza producción; recuperación comprobada y destinos documentados |
| V01 | Leer/gestionar ticket con todos los roles, incluido agente sin área y otro usuario; inspeccionar metadata y exportaciones | Denegación antes de devolver información protegida o escribir; admin global y agente del área según política |
| V02 | Dos agentes asignan a la vez; usuario rechaza mientras cron cierra; repetir aprobación/cancelación; forzar fallo al insertar historial | Una transición válida, conflicto para perdedor, historial único y consistente; rollback completo; autoasignación no reabre cerrado |
| V03 | Upload, vincular y borrar con IDs de tickets cruzados, uploader ajeno, agente otra área, usuario inactivo y ticket cerrado; DIF/FED restringido | Sin escritura/borrado no autorizado; permisos y restricciones del área se cumplen en servidor; fallos externos recuperables |
| V04 | Observador reemplaza lista; IDs inexistentes/duplicados/inactivos, tipo no-array y más de 10; creador/agente autorizado agrega observador válido | Observador no redistribuye acceso; lista inválida rechazada; formato real de user.id admitido |
| V05 | Texto de encuesta con caracteres <, >, &, comillas y etiquetas; fechas manipuladas en URL; comentario interno y sistema sintéticos | Texto escapado, sin HTML activo; filtros inválidos rechazados; internos inaccesibles al usuario/observador; actividad sin sink arbitrario |
| V06 | Recordatorio con cierres de hace 19/24/43/72 h; dos crons simultáneos; Gmail devuelve success:false; crash tras aceptación; reinicio | Todos los vencidos elegibles se recuperan; sin marcador de éxito en fallo; un claim por ejecución; duplicado residual documentado |
| V07 | Categoría/subcategoría/área cruzadas o inactivas; pausa global/de área; creación/reordenación simultánea; rollback a mitad de swap | No ticket con clasificación inválida ni durante pausa; orden consistente dentro del scope y transacción sin estado parcial |
| V08 | Proveedor de otra área; enlace a ticket ajeno; fecha imposible; requestDate nuevo posterior al cierre; encuesta parcial; cierre/reapertura simultáneos | Validación específica en español; referencias y cronología coherentes; cambios atómicos; encuesta completa o ausente |
| V09 | Encuestas con filtro de agente/fecha/área y agente sin área; paginación; exportación | Mismo alcance en UI y endpoint; tasa de respuesta usa cohortes comparables; listados acotados |
| V10 | MIME falseado, archivo fuera de límite, excesiva cantidad, token inválido; requests repartidos entre instancias; fallos de Drive/BD y limpieza | Límites efectivos por usuario/operación, rechazo antes de efectos cuando corresponda; compensación o tarea pendiente con fileId conservado |
| V11 | Login normal, cookie caducada, usuario inactivo, cambios de rol/área; autorización institucional separada | Redirect a /login; permisos efectivos revocados; login no pide Gmail; envío institucional validado solo a destinatarios controlados |
| V12 | Fecha pura y fecha-hora en UTC/Lima; 31/12 23:30 Lima; fin de semana y horario configurado | Día de calendario invariable, instantes bien convertidos, código con año Lima y métrica correcta |
| V13 | Dataset pequeño con tiempos/ratings conocidos, cierre-reapertura-cierre, filtros; medir consultas con dataset grande sintético | Sin tiempos negativos ni cohortes mezcladas; resultados manualmente verificables; consultas SLA en lote; comparación documentada antes/después |
| V14 | Migración en copia aislada con datos antiguos/invalidaciones; scripts en dry-run; restore; rollback compatible | Saneamiento antes de constraints; índices justificados; scripts rechazan producción; esquema/datos recuperables; nunca reset de producción |
| V15 | CI con lockfile congelado, tipos/lint/build; cambios de configuración y navegación por rutas actuales | Verificaciones verdes sin credenciales reales; contenido actualizado por revalidación; ninguna ruta obsoleta |
| V16 | Claro/oscuro, 360/768/1440 px, Tab/Shift+Tab/Escape, menú móvil, herramientas editor, errores y loading | Foco visible, menú cerrado fuera de tabulación, foco devuelto al disparador, herramientas con nombre, sin desbordamientos relevantes |

## Pendientes de infraestructura y producción

- Commit/lockfile desplegados, runtime, límites de memoria/duración y configuración real de CI/Vercel.
- BD de producción: índices/constraints efectivos, tamaño, conexiones, planes de consultas, datos internos/migrados y estado del contador.
- Backups, retención, permisos y restauración real; historial/versionado de migraciones.
- Permisos heredados/individuales de Drive y apertura efectiva con cuentas de cada rol. El código no crea permisos públicos.
- Scopes concedidos en Google, credenciales institucionales y configuración de acceso por dominio.
- Logs/alertas, ejecuciones reales de cron y entrega de correo; sin envío de prueba a usuarios reales.
- Auditoría visual y pruebas de permisos/concurrencia de V00–V16 en sandbox.

Los pendientes externos no invalidan los defectos estáticos confirmados. Sí impiden certificar seguridad operativa, accesibilidad, rendimiento y preparación del sistema para nuevas funcionalidades.
