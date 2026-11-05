# Reportes de encuestas por lotes y validación de acceso

## Estado

Excel de proveedores integrado en main y publicado como `761d67f3229cd7b1149b4eb470fb39635e729c16`, deployment Production 7575233636 aprobado. La ruta independiente de estado devuelve 200, SHA coincidente, cola disponible y corte `2026-10-28T17:00:00.000Z`. Se verificó sin ejecutar el worker. Se eliminó la rama integrada; no se generó Preview ni se reactivó CI.

El responsable confirmó en su navegador que pudo acceder en producción y ver un ticket propio. No identificó rol ni confirmó expresamente recarga, otras áreas o cuentas inactivas: no se extrapola esa evidencia.

Este bloque queda en `fix/reportes-encuestas`, pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-reportes-encuestas-plan.md).

## Reportes

Los reportes HTML de encuestas de usuarios y evaluaciones de proveedores ya no solicitan todos los detalles ni concatenan el documento completo en el servidor. Comparten las cohortes/agregados con las tablas existentes; mantienen los KPIs completos y las tablas paginadas a 25. Las descargas consultan hasta 500 respuestas por lote, con cursor descendente por fecha/ID que conserva el timestamp de PostgreSQL como texto, sin truncar microsegundos con Date.

Resumen y lotes viven dentro de una única transacción repeatable read/read only. Se envían encabezado, filas y cierre mediante TransformStream con contrapresión. Un consumidor que cancela detiene nuevos lotes y un fallo de consulta interrumpe el cuerpo; no se emite el cierre con la orden de impresión. La página muestra que la generación sigue en curso hasta finalizar, para no presentar una impresión parcial como completa.

Se conservan columnas, filtros, escape HTML, avisos de datos históricos inválidos, estados vacíos y documento imprimible completo, sin cuotas. Los días del reporte de proveedores se muestran en Lima, coherentes con sus filtros y tabla. Ambos reportes tienen private/no-store y denegaciones en español.

## Acceso

La revisión paralela reprodujo con una misma sesión ficticia de administrador inactivo dos comportamientos: requireAuth la rechazaba, pero la raíz del dashboard, basada solo en getSession, devolvía AdminDashboard. Ese componente consulta datos globales directamente. La página raíz ahora reutiliza requireAuth antes de elegir el panel; no cambia el encaminamiento válido por rol ni la restricción de agente sin área.

La revisión no utiliza cookies fabricadas de producción, sesiones personales, cuentas reales desactivadas ni contenido de terceros como pruebas. No hay navegador conectado con sesión Google autorizada para la herramienta; la comprobación básica real es la confirmada por el responsable.

## Verificación

- Tipos estrictos sin incremental, ESLint completo sin advertencias y build de producción aprobados (exit 0). Copia sin .env, configuración ficticia, dependencias existentes de solo lectura, recursos locales acotados y lockfile intacto. Sin instalaciones ni frameworks de tests.
- Comprobación efímera de los handlers y helpers reales, con datos/sesión/consultas ficticios y red aislada: ambos reportes con 1.001 filas, 500 exactas y cero filas. Códigos completos y ordenados, empate de timestamp atravesando lotes, microsegundos, contenido escapado y fecha de Lima 31/10 para un instante UTC del 01/11.
- Encabezados, cierre y único disparador de impresión; ausencia de ese disparador ante fallo del segundo lote. Cancelaciones por lector y AbortSignal, señal ya cancelada antes de abrir transacción y consumidor lento comprobados; no se consultan lotes por adelantado sin límite.
- Las consultas se limitan a 500; tablas existentes mantienen 25 filas, segunda página/offset y KPIs sobre las 1.001 respuestas completas. Se inspeccionaron SQL/parametrización del cursor con el dialecto real de Drizzle y construcción real de la subconsulta de cohorte. Las respuestas de BD son ficticias: esto no certifica concurrencia ni planes del motor PostgreSQL.
- Se verificaron denegaciones para anónimos, inactivos, usuarios comunes y agentes sin área, sin alcanzar lectores; filtros de fecha imposible, intervalo invertido y agente vacío devuelven 400. Un agente no puede ampliar el ámbito pasando areaId=999.
- La revisión paralela ejecutó 97 comprobaciones aisladas de permisos de tickets, tres exportaciones, login y proxy antes del arreglo de la raíz, y 12 después: anónimo e inactivos user/agent/admin rechazados; activos encaminados por rol y agente sin área restringido. No se invocaron los componentes que consultan BD como parte de esas pruebas.
- Revisión independiente del diff final sin bloqueantes. Se consultó Context7 para extras tipados y opciones de transacción de Drizzle. El material de validación efímero se elimina al cerrar el bloque.

## Límites y pendientes

Un cliente lento mantiene abierta la conexión y el snapshot mientras recibe el reporte. Cancelar no interrumpe una consulta ya iniciada; impide las siguientes. El navegador necesita conservar y renderizar el documento completo, por lo que los límites del alojamiento y del navegador siguen aplicando a volúmenes muy grandes. No se certifican tiempos o memoria de producción a partir de fixtures.

El envío progresivo empieza con HTTP 200; si una consulta falla después, el cuerpo se interrumpe y no puede reemplazarse retroactivamente por un JSON 500. El aviso de generación y la impresión solo al finalizar evitan presentar ese documento incompleto como una exportación terminada.

Sin cambios de tablas/índices/datos, credenciales, permisos de Drive, dependencias o servicios. Quedan las comprobaciones reales con varios roles/áreas y sesiones caducadas/inactivas, lector/dispositivos físicos, contenido exportado real, concurrencia PostgreSQL, observación de recordatorios/Google y respaldos/restauración fuera de producción.
