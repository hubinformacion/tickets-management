# Plan de ejecución de la estabilización

> Estado actual: los bloques de dependencias, permisos, integridad, scripts, sesión, fechas, proveedores, catálogos, validación de adjuntos, encuestas, recordatorios recuperables de 48 horas y coordinación de adjuntos pendientes y registro de cargas están desplegados en `87d1930`, junto con la corrección de las tres advertencias de ESLint. El rate limiting compartido también está desplegado. La vinculación de cargas tardías también está desplegada; la conservación de la cola del widget está desplegada y la eliminación individual de adjuntos con recuperación está implementada en una rama local, pendiente de integrar. La eliminación administrativa definitiva del ticket mantiene su comportamiento destructivo por instrucción expresa del usuario. Las tablas aditivas se crearon vacías con la autorización vigente. La revisión de permisos y carpeta de Drive quedó cerrada por decisión del usuario; se conserva la carga mediante el refresh token institucional y no se certificó una carga real. Las tablas adicionales fueron aplicadas con autorización del usuario y snapshot confirmado, sin modificar datos históricos. La entrega más reciente usó validación local y un único Production, sin Preview. El [estado de estabilización](README.md) recoge los pendientes por prioridad; el punto de partida siguiente conserva el contexto original.

## Punto de partida

Rama: `fix/auditoria-estabilizacion`. Dependencias actualizadas en `bde1a8f`; límites de validación registrados en `46199fd`. Tipos y lint aprobados; quedan 64 advertencias, cuatro entradas de auditoría de dependencias y comprobaciones incompletas de build/React Doctor. El informe del 6 de octubre queda como evidencia histórica; este documento sustituye su secuencia de ejecución.

La propuesta de sandbox de demos está cancelada. Las comprobaciones locales usarán variables ficticias y aislamiento del proceso cuando ejecuten código; no se conectarán a producción. No se crearán frameworks de tests ni se ejecutarán reset/drop/seed como verificación.

## 1. Compilación, autenticación y operación segura

- Resolver la compilación reproducible con variables ficticias: diferenciar descarga de fuentes de problemas de memoria, revisar el consumo con recursos suficientes y conservar la comprobación de tipos. No introducir un aumento permanente de heap sin diagnóstico.
- Revisar Better Auth 1.7 contra el esquema y la configuración actuales. Preparar consultas de solo lectura para detectar identidades duplicadas y cualquier requisito de esquema antes de desplegar; no ejecutarlas contra producción en esta etapa.
- Revisar los cuatro avisos transitivos restantes por camino real de uso. Corregir los que tengan parche compatible; documentar condición y mitigación de los restantes, sin overrides mayores no comprobados.
- Volver a ejecutar React Doctor por archivos modificados con recursos acotados; conservar su salida detallada y distinguir fallos de herramienta de defectos de código.
- Proteger scripts destructivos sin depender de un sandbox: bloqueo predeterminado, confirmación explícita del destino y modo de simulación. La limpieza FED debe exigir IDs concretos y nunca seleccionar toda el área como datos de prueba.

**Cierre:** tipos, lint y build aprobados o bloqueo específico documentado; actualización de autenticación revisada; scripts no borran nada por defecto. Ningún despliegue mientras build o compatibilidad de autenticación estén pendientes.

## 2. Permisos y entradas del servidor

- Centralizar política de tickets: admin global; agente únicamente de su área y con área válida; creador y observador autorizado con lectura y participación. Gestión de observadores reservada a creador, admin o agente del área.
- Aplicar la política en acciones, endpoints, detalle y metadata antes de devolver información o producir efectos. Cubrir comentarios, asignación, derivación, validación, adjuntos, encuestas y exportaciones.
- Validar inputs con Zod: IDs enteros positivos, mensajes acotados y observadores deduplicados, máximo diez, activos y existentes. Mantener IDs de usuario como texto.
- Comprobar pertenencia real del adjunto al ticket, uploader y permisos del área. Hacer cumplir restricciones DIF/FED en el servidor.
- Validar clasificación activa y coherente entre área/categoría/subcategoría y pausa global/de área antes de crear tickets.
- Escapar todos los valores variables en informes HTML; validar filtros de URL. Filtrar actividad interna por rol y sustituir HTML arbitrario de actividad del sistema por texto o estructura tipada.
- Definir formatos de archivo a partir de los formularios existentes y aplicar la misma lista en cliente y servidor, con controles de contenido, tamaño, cantidad, token y usuario activo.

**Cierre:** matriz de creador, observador, usuario ajeno, agentes de áreas distintas, agente sin área, admin e inactivo revisada sobre datos ficticios. Las solicitudes denegadas no devuelven contenido protegido ni generan escrituras, correo o cambios en Drive.

## 3. Integridad de tickets, fechas y catálogos

- Transiciones con estado/asignación esperados en el UPDATE y comprobación de filas afectadas. Retornar conflicto cuando otra operación ganó.
- Confirmar estado, historial, comentarios y vinculación de adjuntos en transacciones; permitir que el helper de historial reciba el executor de la transacción.
- Conservar el contador atómico por área/año. Impedir que la autoasignación reabra tickets cerrados.
- Separar fechas de calendario de instantes; preservar YYYY-MM-DD y usar Lima explícitamente para visualización temporal y año del código.
- Validar área y fechas de tickets de proveedores, encuesta completa o ausente y cierres/reaperturas condicionales.
- Ordenar categorías/subcategorías con transacción y bloqueo del grupo, leyendo el orden real desde BD.

**Cierre:** escenarios de conflicto y rollback definidos y comprobados con fixtures locales; una transición ganadora y un historial consistente. Fechas invariantes entre UTC y Lima.

## 4. Recordatorios, archivos y protección contra abuso

- Seleccionar todos los recordatorios vencidos no enviados, sin ventana estrecha de 23–25 horas. Procesar lotes con claim/lease persistente y recuperación de fallos.
- Marcar envío únicamente ante éxito; documentar el posible duplicado si el proveedor acepta el correo y el proceso termina antes de persistir el resultado.
- Registrar intentos antes de subir contenido y persistir el ID remoto antes de Drive. Reutilizar el mismo ID al reintentar, conservar referencias ante confirmaciones inciertas y evitar borrados compensatorios ciegos. La reconciliación de huérfanos se prepara por separado sin borrar historia.
- Decisión actual del usuario: cantidad ilimitada de archivos y máximo de 4 MB por carga. No incorporar cuotas propias de cantidad o almacenamiento.
- Sustituir el Map local de rate limiting por almacenamiento compartido en PostgreSQL, aprovechando la infraestructura existente sin contratar otro servicio. Usar claves por operación/usuario, conservar límites actuales y adaptar consumidores a una API async.
- Preparar migraciones aditivas para claims, recuperación y rate limiting. La autorización expresa posterior del usuario permite crear estas tablas compatibles con snapshot confirmado; no autoriza borrados, backfills ni cambios históricos.

**Cierre:** fallos de Gmail/Drive no se registran como éxito; reintentos y ejecuciones concurrentes conservan estado recuperable. Migraciones y rollback revisables por separado.

## 5. Métricas, esquema, calidad y accesibilidad

- Corregir cohortes y periodos de encuestas/KPIs; resolver historial SLA en lote y vincular cada inicio al cierre correspondiente. Documentar tiempo natural frente a tiempo hábil.
- Paralelizar consultas independientes y paginar listados grandes; justificar índices con las consultas reales.
- Preparar índices y CHECK de dominios/ratings mediante migraciones revisables, con consultas previas de compatibilidad de datos. No añadir cascadas generales ni convertir todos los campos a enums.
- Corregir revalidaciones contra rutas existentes, limpiar advertencias útiles y revisar supresiones de Doctor una por una.
- Incorporar CI con lockfile congelado, tipos, lint y build usando configuración ficticia; revisar el tratamiento de scripts de instalación y cachés.
- Corregir foco y tabulación del menú móvil, nombres accesibles del editor, estados de carga y desbordamientos a 360, 768 y 1440 px, en claro y oscuro.

**Cierre:** métricas verificables con un dataset conocido; CI aprobado; rutas coherentes y recorrido de teclado revisado. No se exige actualizar todos los paquetes a su última versión mayor.

## Entregas y aprobación de producción

Cada bloque se entrega con commit propio, hallazgos cubiertos, cambios de interfaces/esquema, comprobaciones y pendientes concretos. Las acciones conservan su contrato de errores en español; los cambios de esquema son aditivos siempre que sea posible.

Antes del despliegue: revisar diffs y migraciones, confirmar commit/runtime desplegados, respaldos y procedimiento de recuperación. La aplicación de migraciones, el merge a main y el despliegue requieren aprobación del usuario sobre el resultado concreto. No ejecutar cambios de datos por considerar que una aprobación de código los incluye.

Después de un despliegue autorizado: comprobar los flujos acordados y observar errores, crons y correo durante 24–48 horas. El rollback de código y la recuperación de datos se documentan por separado. Eliminar las ramas una vez integradas según las reglas del repositorio.

## Avance del 30 de octubre: purga administrativa

La [purga administrativa completa](2026-10-30-purga-administrativa.md) y la eliminación individual recuperable están preparadas en ramas locales apiladas, pendientes de merge/despliegue. La excepción administrativa elimina todo el historial y registros operativos atribuibles, según corrección del usuario, sin permitir borrados reales como verificación. No requiere migración. El último main/Production verificado sigue siendo `87d1930`.

## Avance del 30 de octubre: despliegue y ciclos SLA

La purga administrativa y el borrado individual se integraron y desplegaron como `00d9490`; Production y SHA público confirmados, sin Preview ni operaciones destructivas de validación. Las ramas integradas se eliminaron. La [corrección SLA por ciclo](2026-10-30-metricas-sla-ciclos.md) está preparada en una rama local independiente y pendiente de aprobación de merge/despliegue. El resto de periodos, tendencias, paginación y calidad continúa pendiente.

## Avance del 30 de octubre: periodos de analytics

SLA por ciclo integrado/desplegado en `5453fd1`, Production y SHA público confirmados. La rama integrada se eliminó. La [corrección de periodos y tendencias](2026-10-30-periodos-analytics.md) está preparada en `fix/periodos-analytics`, pendiente de aprobación de merge/despliegue. No requiere migraciones ni escrituras en BD. Continúan métricas personales restantes, paginación, validación real y calidad.

## Avance del 30 de octubre: estadísticas personales

Periodos/tendencias integrados y desplegados en `3c46c0b`, Production y SHA público confirmados, rama integrada eliminada. La [corrección de estadísticas personales](2026-10-30-estadisticas-personales.md) está preparada en `fix/estadisticas-personales`, pendiente de aprobación de merge/despliegue. Corrige la distribución por estado y sustituye cuatro consultas en serie por dos paralelas, sin migraciones o escrituras. Continúan paginación, otros indicadores, validación real y calidad.

## Avance del 30 de octubre: paginación de encuestas

Estadísticas personales integradas y desplegadas en `28fadb6`, Production y SHA público confirmados, rama integrada eliminada. La [paginación de encuestas de usuarios](2026-10-30-paginacion-encuestas-usuarios.md) está preparada en una rama local independiente, pendiente de aprobación de merge/despliegue. Los indicadores consideran toda la cohorte y la descarga sigue completa. Sin migraciones o escrituras. Continúan proveedores/otros listados, volumen e índices, validación real y calidad.

## Avance del 30 de octubre: proveedores e índices en paralelo

Paginación de encuestas integrada/desplegada en `e8c46e7`, Production y SHA público confirmados, rama integrada eliminada. La [paginación de tickets de proveedores](2026-10-30-paginacion-proveedores.md) está preparada en rama local, pendiente de aprobación de merge/despliegue. La [revisión de índices](2026-10-30-revision-indices.md), realizada en paralelo por petición del usuario, deja tres candidatos sin aplicar y propuesta SQL comentada. No hubo DDL/DML. Continúan selector remoto, otros listados, volumen/constraints, validación real y calidad.

## Aplicación autorizada de índices

Tras la revisión y explicación de costes, el usuario autorizó la [aplicación aditiva de tres índices](2026-10-30-aplicacion-indices.md). Se crearon concurrentemente uno por vez, con catálogo validado antes/después y declaración Drizzle sincronizada; no hubo cambios de datos, DROP, REINDEX ni backfills. Se agrupa esta sincronización con la paginación aprobada para un único despliegue desde main.

## Avance: publicación e inicio del selector remoto

Paginación de proveedores e índices declarados se integraron/desplegaron en `d214f41`, con Production/SHA públicos confirmados y rama integrada eliminada. La [búsqueda remota de tickets vinculados](2026-10-30-busqueda-tickets-proveedores.md) está preparada en una nueva rama local, pendiente de aprobación de merge/despliegue. Retira la carga completa por render sin truncar la selección existente. Continúan encuestas de proveedores/otros listados, exportaciones, validación real y calidad.

## Avance: evaluaciones de proveedores

Búsqueda remota integrada/desplegada en `a7bdd2e`, Production/SHA públicos confirmados y rama integrada eliminada. La [paginación de evaluaciones de proveedores](2026-10-30-paginacion-encuestas-proveedores.md) se incorpora con la autorización actual de todos los despliegues necesarios, tras tipos/lint/build y comprobaciones READ ONLY aprobadas. Conserva indicadores/reporte completos y corrige fechas a Lima, sin DDL/DML. Continúan validación real, otros listados, exports grandes y calidad.
