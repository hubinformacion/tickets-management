# Plan de ejecución de la estabilización

> Estado actual: los bloques de dependencias, permisos, integridad, scripts, sesión, fechas, proveedores y catálogos están desplegados en `d100754`. La validación de adjuntos se trabaja en una rama separada. El recorrido Google y la concurrencia real continúan pendientes. El [estado de estabilización](README.md) es el registro actualizado; el punto de partida siguiente conserva el contexto original.

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
- Compensar uploads si falla BD y conservar referencias de archivos hasta confirmar el borrado externo. Preparar recuperación y limpieza de huérfanos con plazo, límites y simulación.
- Sustituir el Map local de rate limiting por almacenamiento compartido en PostgreSQL, aprovechando la infraestructura existente sin contratar otro servicio. Usar claves por operación/usuario, conservar límites actuales y adaptar consumidores a una API async.
- Preparar migraciones aditivas para claims, recuperación y rate limiting; no aplicarlas a producción durante implementación.

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
