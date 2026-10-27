# Auditoría integral — 6 de octubre de 2026

## Dictamen

El proyecto compila y supera la comprobación estricta de tipos, pero necesita una fase de estabilización antes de ampliar funcionalidades. Las prioridades son autorización por ticket y área, integridad de transiciones, HTML de reportes, dependencias vulnerables y un entorno de validación aislado. La interfaz tiene una base reutilizable; no hay evidencia que justifique reescribir el sistema.

Este informe audita el código de `90676d9` y los paquetes del lockfile local. El usuario confirmó que el sistema está en producción con usuarios y que el entorno de pruebas todavía no está listo. No se ha comprobado que ese commit y ese lockfile sean exactamente los desplegados.

**Trabajo realizado:** revisión estática, comprobaciones locales, consultas al registro de paquetes y documentación oficial. **Pendiente:** flujos autenticados en sandbox, revisión visual en navegador, datos y configuración efectiva de Vercel/Neon/Google. No se modificó código de aplicación, dependencias ni bases de datos.

## Estado y evidencia

| Comprobación | Resultado |
|---|---|
| Git al comenzar | `main`, commit `90676d9`, coincidente con la referencia local `origin/main`; sin `fetch` remoto |
| Cambios previos del usuario | Eliminación preparada de `docs/plans/2026-06-10-dashboard-analytics-design.md`; `docs/dev/` sin seguimiento. Conservados |
| Rama de esta auditoría | `chore/auditoria-2026-10-06`; sin merge ni publicación |
| Fuente | 236 archivos TypeScript/TSX; 66 funciones exportadas en acciones |
| Autenticación de acciones | Las 66 contienen una llamada directa a `requireAuth`, `requireAgent` o `requireAdmin`; esto no demuestra autorización sobre el recurso |
| Validación de acciones | 13 contienen `safeParse`; 7 contienen llamada directa a un limitador; 3 contienen transacción. Conteos sintácticos, no puntuaciones de seguridad |
| Tipos | `pnpm exec tsc --noEmit --incremental false`: aprobado |
| Lint | ESLint: 4 errores y 62 advertencias; salida 1 |
| Build estándar | Código compilado; comprobación de tipos agotó el heap de Node, cercano a 2 GB |
| Build con heap de 4 GB | `pnpm build`: aprobado, usando variables ficticias y credenciales externas vacías |
| Dependencias de producción | 53 entradas de audit: 3 críticas, 29 altas, 19 moderadas y 2 bajas; 46 GHSA distintos |
| Dependencias completas | 71 entradas: 3 críticas, 41 altas, 25 moderadas y 2 bajas; 55 GHSA distintos |
| Actualizaciones disponibles | 48 paquetes directos con versión más reciente; no equivale a 48 actualizaciones necesarias |
| Entorno local | Node `24.16.0`, pnpm `11.3.0`; versiones no fijadas mediante `engines`/`packageManager` |

Evidencia resumida y sin credenciales: [evidencias/2026-10-06.json](evidencias/2026-10-06.json). Procedimientos y límites: [validación](2026-10-06-validacion.md).

**Prioridad:** P0 = respuesta inmediata ante exposición crítica confirmada; P1 = resolver antes de nuevas features; P2 = siguiente estabilización; P3 = mejora opcional. **Estado:** confirmado = evidencia en código o comando; condicionado = impacto depende de configuración/datos; pendiente = requiere entorno o acceso externo. Los escenarios de reproducción de la validación son pruebas propuestas, salvo los resultados locales registrados.

## Seguridad y autorización

### S01 — P1 · Escrituras sin autorización sobre el ticket · Confirmado

**Evidencia:** `src/actions/comments/add-comment.ts:16`, `src/actions/tickets/add-attachments.ts:13`, `src/actions/admin/ticket-management.ts:15,96,124`, `src/actions/tickets/validation.ts:217` y `src/actions/comments/add-derivation.ts:18`. Los guards comprueban sesión/rol; las operaciones no comprueban creador, observador autorizado o área del agente, según la operación. Ocultar controles en la página no protege estas acciones.

**Impacto:** un usuario autenticado puede comentar o vincular archivos propios a tickets ajenos; un agente puede gestionar tickets de otra área. La autoasignación escribe `in_progress` sin comprobar estado y puede reabrir un ticket cerrado dejando sus campos de cierre intactos.

**Corrección:** centralizar política de lectura, participación y gestión; cargar el recurso y aplicar autorización en cada entrada del servidor. Gestión: admin o agente del área. Participación: creador, observador permitido, admin o agente del área. Validar estado y restricciones de adjuntos en el servidor. **Aceptación:** V01–V03; llamadas directas no autorizadas no producen escritura, historial ni correo.

### S02 — P1 · Borrado de adjuntos demasiado permisivo · Confirmado

**Evidencia:** `src/actions/tickets/delete-attachment.ts:30` trata a cualquier agente como admin; no compara `attachment.ticketId` con el `ticketId` recibido. La UI sí distingue agente del área.

**Impacto:** un agente puede borrar archivos de otra área; el ID de ticket sirve para revalidación, no para vincular el permiso al recurso. **Corrección:** validar ambos identificadores, pertenencia real y permisos de uploader/admin/agente del área autorizado; definir también la política de adjuntos todavía sin ticket. **Aceptación:** V03, incluyendo IDs cruzados.

### S03 — P1 · Observadores pueden redistribuir acceso · Confirmado

**Evidencia:** `src/actions/tickets/watchers.ts:37` autoriza a un observador a reemplazar toda la lista; no valida usuarios existentes ni la forma de la lista. `create-ticket.ts:180` acepta el resultado de `JSON.parse` sin un schema para observadores.

**Impacto:** un observador puede conceder lectura y notificaciones a otros usuarios; una lista malformada puede provocar fallos o referencias inválidas. **Corrección:** observadores con lectura/participación, sin administrar membresía; esa gestión queda a creador/admin/agente del área. Validar lista, deduplicar, limitar a 10 usuarios activos existentes. Los IDs de usuarios son `text`: no imponer UUID sin comprobar su formato real. **Aceptación:** V04.

### S04 — P1 · Agente sin área obtiene alcance global · Confirmado

**Evidencia:** `src/actions/surveys/index.ts:124,269`, `src/actions/surveys/provider-surveys.ts:19,111` y `src/app/dashboard/(agent)/proveedores/export/route.ts:23` omiten el filtro cuando `areaId` falta. `requireAgent` admite agentes sin área.

**Impacto:** un agente mal configurado puede consultar resultados o exportar tickets de todas las áreas, aunque la página principal le niegue acceso. **Corrección:** devolver error/403 antes de consultar cuando un agente no tiene área; alcance global solo para admin. Filtrar también encuestas cargadas para la exportación. **Aceptación:** V01 y V09.

### S05 — P1 · Upload sin controles completos · Confirmado

**Evidencia:** `src/app/api/upload/route.ts:17,81` usa `getSession` sin comprobar `isActive`. Solo limita el archivo a 5 MB; acepta MIME/nombre/token del cliente sin schema, verificación de contenido o rate limiting. El multipart se procesa antes de esa comprobación de tamaño.

**Impacto:** una sesión de usuario desactivado puede subir/eliminar archivos; abuso de almacenamiento y contenido arbitrario. **Corrección:** guard de API con 401/403, validación de token/nombre y tipos permitidos, comprobación de firma donde sea aplicable, límites de archivo/cantidad y solicitud en la plataforma, y limitador compartido. La UI tampoco declara una whitelist: inventariar formatos usados, definirla y aplicarla en cliente/servidor, documentando excepciones como CSV. **Aceptación:** V03 y V10.

### S06 — P1 · HTML sin escapar en reportes imprimibles · Confirmado

**Evidencia:** `src/app/dashboard/(agent)/encuestas/usuarios/download/route.ts:32` interpola nombres y `improvementSuggestion` en HTML; el reporte de proveedores interpola títulos/códigos/nombres de la misma manera. `filterLabel` contiene fechas de la URL sin validación/escape.

**Impacto:** contenido almacenado o parámetros manipulados pueden convertirse en HTML ejecutable al abrir el reporte autenticado. La sugerencia es texto libre validado solo por longitud. **Corrección:** escapar todos los valores de texto con el helper existente y validar filtros; mantener HTML fijo de la plantilla. **Aceptación:** V05; texto con etiquetas permanece literal y no crea nodos activos.

### S07 — P2 · Lectura de metadata sin política de acceso · Confirmado; exposición HTTP pendiente

**Evidencia:** `src/app/dashboard/(shared)/tickets/[code]/page.tsx:26` obtiene título/código para `generateMetadata` sin comprobar permisos. El detalle comprueba autorización después de cargar relaciones e historial.

**Impacto:** posible filtración de título/existencia y consultas innecesarias; falta comprobar la respuesta efectiva cuando la página redirige. **Corrección:** usar el mismo lector autorizado para metadata y detalle, con metadata genérica para quien no puede leer el ticket. **Aceptación:** V01, inspeccionando HTML, metadata y respuesta navegable.

### S08 — P2 · Scopes de Gmail en login de usuarios · Confirmado

**Evidencia:** `src/lib/auth/server.ts:23` solicita `gmail.send` y `gmail.readonly` a quien inicia sesión con Google. El envío institucional usa un refresh token del entorno en otro cliente.

**Impacto:** consentimiento y permisos sobre el buzón del usuario mayores a los necesarios para identificarlo. **Corrección:** login con identidad básica; autorización institucional separada y documentada. **Aceptación:** V11; login y correo institucional funcionan sin scopes de Gmail en el login ordinario.

### S09 — P2 · HTML de sistema y comentarios internos · Condicionado

**Evidencia:** `ticket-activity.tsx:174` renderiza `entry.content` con `dangerouslySetInnerHTML` para `type='system'`. No se encontró un productor actual de esa clase en las acciones revisadas. La derivación usa una rama distinta que muestra texto de metadata. El detalle obtiene todos los comentarios sin filtrar `isInternal`; `migrate-data.ts` preserva ese campo.

**Impacto:** sink inseguro si hay contenido controlable de sistema; exposición de comentarios internos si existen registros migrados. **Corrección:** texto o estructura tipada para actividad de sistema; filtrar internos según rol antes de enviar al cliente. **Aceptación:** V05; revisar datos de sandbox, sin asumir que estas condiciones existen en producción.

## Lógica, datos y rendimiento

| ID / prioridad | Evidencia y efecto | Corrección y aceptación |
|---|---|---|
| D01 / P1 | `validation.ts:52,146,251`, `cancel-ticket.ts:35`, `admin/ticket-management.ts:24,151` y cron de cierre `:62`: UPDATE por ID tras leer, sin condición de estado esperado. Dos solicitudes pueden sobrescribirse. `recordStatusChange` usa siempre `db`, incluso en la transacción de rechazo `:149`. Creación confirma ticket antes de historial/adjuntos | UPDATE condicional con `returning`, comprobar filas afectadas, transacción para estado/historial/comentario y permitir al helper usar `tx`. La creación debe confirmar ticket, historial y vinculación conjuntamente. V02: una operación gana, la otra devuelve conflicto; rollback sin historial suelto |
| D02 / P1 | `survey-reminder/route.ts:24,25,87,103`: ventana 23–25 h con cron diario a las 13 UTC. Puede omitir tickets incluso sin fallos del cron. No comprueba `{success:false}` de Gmail y marca recordatorio enviado igualmente | Seleccionar vencidos no enviados, comprobar resultado de envío y usar claim/lease para impedir ejecuciones concurrentes. Recuperación ante fallo sin marcar éxito. V06; documentar posible duplicado si Gmail acepta y el proceso muere antes de persistir |
| D03 / P1 | `create-ticket.ts` valida IDs individualmente pero no comprueba que subcategoría pertenezca a categoría, categoría a área, ni que estén activas; tampoco rechaza área inactiva si sigue aceptando tickets. La pausa global `allow_new_tickets` solo se aplica al formulario, no a la acción | Validar cadena de clasificación y disponibilidad global/del área antes de insertar, incluida configuración FED. V07: combinaciones cruzadas/inactivas y creación durante pausa rechazadas sin ticket ni adjuntos vinculados |
| D04 / P2 | `agent/provider-tickets.ts:14,75`: enlace opcional a ticket del sistema sin comprobar área. Update compara cierre con `existing.requestDate` aunque cambia `requestDate`. Cierre/reapertura hacen check-then-act; encuesta parcial se ignora | Validar referencias del área, fechas reales y orden frente a la fecha nueva; transición condicional y reglas claras para encuesta completa o ausente. V08 |
| D05 / P2 | `admin/categories.ts:113,146` y `admin/subcategories.ts:114,149`: swaps con dos UPDATE; órdenes del cliente sin comprobar. `max+1` separado del INSERT puede repetir orden; categorías admin se ordenan globalmente | Transacción con bloqueo del grupo de ordenación, leer orden real y delimitar área/categoría. Una subquery MAX+1 o transacción sin bloqueo por sí solas no garantizan exclusividad. V07 |
| D06 / P1 | `lib/utils/date.ts:19` convierte fechas puras a zona de Lima. Con TZ=UTC, `2026-10-06` se muestra `05/10/2026`; con Lima, `06/10/2026`. `ticket-code.ts:17` toma año local del servidor. `business-hours.ts:112` usa métodos locales de Date | Separar fechas de calendario de instantes; calendario conserva YYYY-MM-DD, instantes se muestran en Lima y año del código usa Lima explícitamente. V12. El helper de horas hábiles no tiene consumidores actuales |
| D07 / P2 | `db/queries/analytics.ts:230,259`: tiempo natural entre estados, sin usar horarios hábiles; busca último `in_progress` sin limitarlo al cierre evaluado. Hay una consulta por ticket `:302`. KPIs `:430,482` ejecutan consultas independientes en serie | Limitar evento inicial al cierre correspondiente, documentar métrica y alinearla con horarios configurados; resolver historial en lote y paralelizar queries independientes. V13 |
| D08 / P2 | `surveys/index.ts:210`: tasa de respuesta divide encuestas filtradas por fecha/agente entre resueltos sin esos mismos filtros. Analytics aplica rango a unas tarjetas y no a satisfacción/SLA/tendencias. Proveedores y encuestas cargan colecciones completas | Denominador de la misma cohorte de tickets resueltos y etiquetas de periodo explícitas. Paginación y agregación en BD para listados grandes. V09 y V13; no afirmar latencias sin medición |
| D09 / P2 | `db/schema.ts`: no declara índices de consulta para tickets/comentarios/historial, CHECK de ratings o dominios de estado/rol/prioridad. Ratings Zod no exigen enteros para encuesta de usuario. FKs separadas no garantizan clasificación consistente | Revisar datos y planes en sandbox; añadir índices según queries y CHECK de dominios/rating entero 1–5. Preferir CHECK compatible con columnas existentes antes de una migración general a pgEnum. Catálogo efectivo de producción pendiente. V14 |

## Operación, mantenimiento e interfaz

| ID / prioridad | Evidencia y efecto | Corrección y aceptación |
|---|---|---|
| O01 / P1 | Sandbox no listo según usuario; `docs/dev/01…03` se contradicen sobre credenciales reales/neutras, crons y correos. Código no impone aislamiento de Gmail/Drive/cron | BD aislada, carpeta de Drive de prueba y correo desactivado/controlado; ningún reset hasta identificar destino. Accesos y configuración efectiva pendientes. V00 |
| O02 / P2 | `upload/route.ts:50,53,115,121`, `delete-attachment.ts:37` y `deepDeleteTicketAction`: operaciones de Drive y BD no tienen recuperación coordinada. Si falla BD tras upload queda archivo suelto; si falla Drive tras delete se pierde la referencia; deep-delete borra Drive antes de transacción | Compensación de upload y borrado pendiente/reintentable conservando fileId; limpieza de huérfanos con plazo y autorización. Google Drive efectivo pendiente, no presumir archivos públicos. V03 y V10 |
| O03 / P1 | `lib/utils/rate-limit.ts`: Map por proceso y clave sin namespace automático; creación, prioridad y proveedor pueden compartir userId. Algoritmo es ventana fija aunque el comentario diga sliding window | Almacén compartido y claves por usuario/operación; mantener API del limiter mediante adaptación async. No usarlo como sustituto de autorización. V10 |
| O04 / P1 | `package.json:10` usa `next lint`; ESLint falla; build necesita más heap en esta máquina. Sin `.github/` ni migraciones versionadas en `drizzle/`. No hay evidencia de alertas/restauración real | `eslint .`, corregir cuatro errores sin desactivar reglas globales; CI de tipos/lint/build con recursos adecuados; migraciones revisables, logging de fallos y ejercicio de restauración. V14–V15 |
| O05 / P1 | `src/scripts/clean-fed-tickets.ts:46` selecciona todos los tickets FED, pese a anunciar limpieza de pruebas; `drop-db.ts` elimina schema completo sin guard. No hay comprobación de destino | Limpieza solo por IDs explícitos de sandbox, dry-run y guard de entorno para scripts destructivos. Procedimiento de respaldo/restauración antes de migraciones. V14; no ejecutar estos scripts durante auditoría |
| Q01 / P2 | Helpers auth redirigen a `/auth/signin` (`helpers.ts:29,34`), pero ruta existente es `/login`. Varias acciones revalidan `/dashboard/admin/...` aunque rutas visibles son `/dashboard/sistema`, `/dashboard/usuarios`, etc. | Corregir rutas e inventariar revalidaciones contra App Router. V11 y V15: sesión vencida/inactiva llega a login; configuración se actualiza sin recarga manual |
| Q02 / P2 | Menú móvil permanece en DOM desplazado, sin `inert` ni control de foco; botón abrir menú elimina outline (`dashboard/layout.tsx:524`). Toggles del editor tienen solo icono sin nombre accesible | Controlar foco/inert del menú cerrado, devolver foco al cerrar, foco visible y nombres de herramientas. V16; contraste/tamaño táctil requieren navegador |
| Q03 / P3 | Flujos admin/agent similares, schemas de horario/proveedor duplicados, imports y funciones sin uso señalados por lint; `doctor.config.ts` silencia clases amplias de avisos por afirmaciones genéricas | Consolidar después de corregir permisos, preservando scope de cada rol; limpiar advertencias y revisar supresiones caso por caso. No atribuir autoría de IA a partir del estilo |
| Q04 / P3 | Colores y sombras fuera de tokens en timeline/dashboard; Suspense de analytics rodea componentes después de esperar las queries; falta loading específico de analytics | Refinar tokens y estados de carga a partir del recorrido visual; preservar estructura y componentes existentes. V16. No se emitió una certificación visual/accessibility |

## Dependencias y actualizaciones

Los conteos de audit son entradas por paquete/rango afectado y pueden repetir GHSA. No equivalen a incidentes ni a vulnerabilidades explotables confirmadas. `--prod` también incluye herramientas alcanzadas por dependencias/peers: revisar la ruta y ejecución real. El JSON adjunto incluye todos los avisos y las 48 versiones consultadas.

| Grupo | Estado / prioridad | Acción propuesta |
|---|---|---|
| Next.js 16.2.7 | P1; versión dentro de rangos afectados. Última consultada: 16.3.8 | Actualizar Next y eslint-config-next juntos a 16.3.8, validar cambios y lockfile. No basta 16.2.11 para todos los avisos actuales |
| RCE Windows | Condicionado al sistema operativo; esta auditoría corre en Linux, producción no inspeccionada | [Aviso del mantenedor](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36): parche 16.3.3. P0 si despliegue Windows afectado confirmado |
| RCE next/og | No se encontraron consumidores de ImageResponse/next/og en src | [Aviso del mantenedor](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j): requiere valores controlables en SVG de ImageResponse Node; parche 16.3.6. No afirmar exposición aquí |
| RCE AVIF / sharp | Optimizador de imágenes habilitado; avatares remotos limitados a Google. Exposición efectiva a AVIF pendiente | [Aviso Next](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4): parche Next 16.3.3. Revalidar versión efectiva de sharp y sus avisos adicionales al actualizar |
| Tiptap / ProseMirror | P1; editor editable presente y prosemirror-view 1.41.x en lockfile | Actualizar todos los paquetes @tiptap juntos a 3.31.4; verificar core >=3.30.5 y view >=1.42.3. [XSS al pegar HTML, mantenedor](https://github.com/ProseMirror/prosemirror-view/security/advisories/GHSA-c8x8-7fp4-3x9w) |
| Better Auth 1.6.15 | Aviso de magic-link/email-OTP no aplicable a configuración actual, que solo habilita Google | [Mantenedor](https://github.com/better-auth/better-auth/security/advisories/GHSA-qq9h-g4jm-xgf3): parche 1.6.22; actualizar primero a release compatible 1.6.x >=1.6.22 y revisar transitivas. 1.7.7 queda como actualización menor evaluable, no obligatoria por ese aviso |
| Transitivas de ExcelJS/Google/Auth/build | Hay avisos de defu, qs, brace-expansion, postcss, sharp, etc. Aplicabilidad no acreditada para cada camino | Actualizar padres y lockfile por grupos; analizar cada GHSA del JSON y las rutas restantes. Overrides solo con compatibilidad demostrada, sin audit --fix automático |
| Drizzle, fechas, FilePond, Sonner, Radix, Tailwind | Mantenimiento compatible; versiones detalladas en evidencia | Parches agrupados después de seguridad, validar calendarios, formularios y estilos; no cambiar behavior por perseguir latest |
| React 19.3, tipos, RHF, Recharts | Actualizaciones menores disponibles | Mantener react/react-dom y tipos compatibles; revisar regresiones por grupo en Fase 3 |
| TypeScript 7, ESLint 10, dotenv 18, googleapis 183, Lucide 1 | Saltos mayores respecto al manifiesto actual | Posponer a tareas separadas; no son requisito automático para nuevas features. Alinear @types/node con runtime elegido |

El comando `next lint` está retirado y `next build` no ejecuta lint en Next 16: [documentación oficial](https://nextjs.org/docs/app/guides/upgrading/version-16), contrastada con Context7. Memoria de build: [guía oficial](https://nextjs.org/docs/app/guides/memory-usage). Nunca desactivar la comprobación de tipos como remedio al OOM.

## Contraste con la auditoría anterior

Se conserva `00-auditoria.md` como antecedente, no como resultado vigente. El nuevo informe reemplaza sus conclusiones para priorizar trabajo.

| Afirmación anterior | Verificación actual |
|---|---|
| C1: carreras y helper fuera de tx | Confirmado y ampliado a asignación, historial y creación (D01) |
| C2: agentes borran adjuntos ajenos | Confirmado (S02) |
| C3: updateDisabledMessage expuesto como RPC | Incorrecto: función privada sin export; no invocable como acción pública por esa declaración |
| C3: lectores no usados son críticos | Cuatro lectores de configuración no tienen consumidores encontrados; todos tienen requireAuth. Deuda/superficie innecesaria, no prueba de filtración crítica |
| C4: swaps admin y agent | Swaps presentes en admin; los archivos agent revisados no exportan swaps. MAX+1 y transacción solos no solucionan exclusividad |
| C5: upload incompleto | Confirmado (S05); límite de 5 MB ya existe |
| C6: Drive crea permisos anyone with link | Incorrecto para este código: upload no llama permissions.create. Comentario desactualizado; herencia/permisos efectivos pendientes |
| XSS en actividad probado | Sink confirmado, exploit no probado: type system sin productor actual encontrado; derivación renderiza texto (S09) |
| Watchers deben ser UUID | No sustentado: user.id es text y no hay política UUID explícita |
| Retry de ticket-code es código muerto | No demostrado. Contador atómico correcto; revisar coherencia de contador/códigos migrados antes de retirar retry |
| Admin/agent priority idénticos | No: agent valida pertenencia al área; consolidar sin perder esa restricción |
| No SQL crudo | Incorrecto literalmente: hay SQL parametrizado en queries y secuencia. No se encontró interpolación de entrada como texto SQL; SQL parametrizado no implica inyección |
| pgEnum y cascadas como arreglo general | Propuesta excesiva: CHECK e índices permiten evolución gradual; cascadas dependen de política de retención/borrado |
| Vitest obligatorio | Incompatible con AGENTS.md vigente: no crear tests ni framework en esta etapa |
| Normalización del código | Priorizar consistencia, deuda concreta y comportamiento verificable |
| tsc aprobado; frontend listo | Tipos aprobados; lint fallido; build requiere más memoria local. Validación visual pendiente |

## Aspectos correctos y límites

- Contador por área/año con UPSERT atómico dentro de transacción y código único; no reemplazar su mecanismo de exclusión.
- Encuesta de usuario y proveedor con vínculo único por ticket; prioridad única por área. Duplicados concurrentes de encuesta de usuario aún producen error genérico.
- Campos `role`, `isActive` y `attentionAreaId` no aceptan input de alta en Better Auth.
- Cron rechaza secreto ausente/incorrecto. Comparación timing-safe es mejora secundaria respecto de carreras y pérdidas de recordatorios.
- Detalle de ticket aplica política de lectura; acciones deben aplicar la misma política por separado. Paginación de tickets ya existe y ejecuta datos/conteo en paralelo.
- `.env.local` ignorado y no seguido por Git. Escaneo limitado de patrones en fuente/README/.env.example encontró solo una URL ficticia en README; no certifica historial Git ni ausencia total de secretos.
- No se inspeccionaron logs reales, permisos heredados de Drive, scopes concedidos, dominios admitidos, políticas de Neon, respaldo, branch protection, despliegue exacto o métricas reales. No hay diagnóstico de compromiso.

## Próximo paso

Ejecutar [plan de estabilización por fases](2026-10-06-plan-estabilizacion.md). La auditoría está entregada; el sistema todavía no cumple el criterio de preparación para nuevas funcionalidades. Los cambios sugeridos siguen pendientes.
