# Exportación progresiva de tickets de proveedores

## Estado

Producción verificada en `0ed4583ec6f60493e7f59dc05c51c74718eebf01`: deployment 7552182347 aprobado, versión pública coincidente y estado de recordatorios 200 con cola disponible y corte fijo `2026-10-28T17:00:00.000Z`. Adjuntos accesibles y retirada de CI publicados; no se repite un despliegue del mismo código ni se consulta Actions.

Esta mejora queda en `fix/exportacion-proveedores`, rama local pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-exportacion-proveedores-plan.md).

## Cambio

La descarga XLSX ya no carga todos los tickets/evaluaciones ni construye un buffer del archivo completo antes de responder. Lee lotes de hasta 500 tickets y sus evaluaciones dentro de una transacción repeatable read/read only. El cursor por fecha descendente e ID conserva los microsegundos originales de PostgreSQL como texto; no usa Date para avanzar y saltarse registros submilisegundo. El ID desempata fechas iguales.

ExcelJS existente escribe y confirma filas progresivamente, sin tabla global de cadenas compartidas. Un Writable conecta el ZIP con la respuesta web y espera al consumidor. Se conservan las 20 columnas, estilos, nombres, formato XLSX y alcance global del administrador/área del agente; no hay cuota ni truncamiento de resultados. Las respuestas llevan private/no-store. La transacción aporta una vista consistente de tickets y evaluaciones durante la descarga.

Al cancelar se dejan de consultar nuevos lotes y se finaliza el ZIP parcial descartando sus bytes, para liberar el compresor. Un fallo de consulta rompe la descarga, en vez de presentarla como un archivo completo. Los errores al iniciar devuelven 500; las denegaciones explícitas conservan 401/403.

No hay dependencias, tablas, índices, migraciones, servicios nuevos ni cambios en registros históricos. La CI permanece retirada. No se envían archivos/correos ni se ejecutan workers reales.

## Verificación

- TypeScript estricto sin incremental, ESLint completo sin advertencias y build de producción aprobados (exit 0). Copia sin archivos .env, configuración ficticia y dependencias existentes de solo lectura; recursos locales acotados. Sin instalación ni cambios en lockfile.
- Comprobación efímera con ExcelJS y NextResponse reales y consultas/sesión ficticias, sin red y sin secretos. XLSX leído de nuevo con ExcelJS: 1.001 tickets para admin y 503 para agente, 20 columnas y estilos del encabezado; códigos completos y ordenados, texto, fechas/días, evaluaciones/promedios y ausencias conservados.
- Lotes cruzando empates de fecha con microsegundos que Date truncaría; SQL y parámetros de los filtros inspeccionados con el dialecto real de Drizzle. Consulta limitada a 500 e IN de evaluaciones limitado a los IDs del lote. Esta comprobación no equivale a ejecutar el SQL en PostgreSQL real.
- Exportación vacía con encabezados; denegación de usuario anónimo, inactivo, rol insuficiente y agente sin área sin consultar tickets. Fallo del segundo lote interrumpe el cuerpo; cancelación del lector y AbortSignal detienen los siguientes lotes y finalizan la transacción ficticia; señal ya cancelada no consulta tickets.
- Revisión independiente del diff, esquema y escritor de ExcelJS sin bloqueantes. No se crea suite ni framework de tests. El material temporal se elimina al cerrar el bloque.

## Límites y continuación

El escritor de ExcelJS puede acumular XML internamente: la contrapresión del ZIP no garantiza memoria constante para un volumen arbitrario. Los modelos de tickets/evaluaciones y sus parámetros sí se limitan por lote; no se retiene el XLSX completo. No se certifican tiempos ni memoria en producción a partir de los datos ficticios.

Un consumidor lento puede mantener la conexión y el snapshot abiertos durante las esperas. Cancelar evita nuevos lotes, pero permite terminar la consulta ya en vuelo. Una exportación grande sigue sujeta a los límites de duración y recursos del alojamiento y del formato XLSX. Se conserva el orden por fecha existente; no se añade un índice específico de exportación, por lo que no se promete eliminar ordenamientos en PostgreSQL.

Pendientes los reportes HTML de encuestas y otros listados/indicadores con un problema confirmado de volumen. También continúan la validación autenticada/lector real, observación de recordatorios y Google, concurrencia y respaldo/restauración fuera de producción. No se cambia la carpeta o el consentimiento de Drive.
