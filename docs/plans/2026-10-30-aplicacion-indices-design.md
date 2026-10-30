# Aplicación aditiva de índices autorizada

El usuario autorizó expresamente optimizar los índices de producción tras revisar sus costes y comunicó una ventana sin usuarios. Se integra la paginación aprobada junto con la declaración de los tres candidatos ya presentados. No se ejecutan borrados, reindexaciones, backfills ni cambios de columnas/constraints/datos.

Se elige añadir los tres índices mínimos de la propuesta: orden de proveedores por área, cohorte de tickets por área/estado/cierre e historial por ticket/fecha/ID. No se añaden variantes por cada filtro ni se duplican índices UNIQUE existentes. Son accesos alineados con consultas actuales; el tamaño pequeño no permite prometer una ganancia de latencia. La paginación permanece útil aunque el planificador siga prefiriendo escaneos.

Se vuelve a validar el destino y catálogo. Los CREATE INDEX CONCURRENTLY se ejecutan uno por uno, fuera de una transacción, con timeouts y comprobación de definición/validez antes/después. La ventana sin usuarios reduce competencia, pero no se presupone ausencia de cron. Se conservan todos los índices existentes; un fallo detiene la secuencia sin DROP o reconstrucciones automáticos.

La declaración de Drizzle se sincroniza con la definición física y el procedimiento manual queda en una migración explícita independiente de las builds. Después se revisan planes con EXPLAIN sin ANALYZE y tamaños/metadatos; no se comparan tiempos de negocio mediante escrituras o tickets reales de prueba.

Pasos: preflight de catálogo y planes; preparar SQL/declaración/documentación; validar tipos/lint/build con configuración ficticia; aplicar los CREATE autorizados; verificar catálogo/planes; agrupar el resultado con el merge/despliegue solicitado; confirmar Production y continuar el siguiente pendiente en una rama local nueva.
