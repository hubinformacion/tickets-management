# Fechas de calendario e instantes

## Alcance y estado

Implementado en `b01c88d` e integrado y desplegado en producción como `8562497`, sobre el cierre anterior `e24f3e7`. Se implementa el bloque de fechas del plan aprobado sin cambiar el esquema ni reescribir datos históricos.

- Una fecha `AAAA-MM-DD` se valida como día real y se presenta como `DD/MM/AAAA` sin aplicarle zona horaria. No se convierten fechas puras en instantes de medianoche.
- `formatDate` y `formatDateShort` distinguen fechas puras de instantes. Los instantes siguen presentándose en Lima; entradas ausentes o inválidas muestran `-`. Se mantiene la lectura de instantes en metadata histórica de derivaciones.
- Difusión, derivaciones y fechas de proveedor usan validación compartida de días reales (incluidos años bisiestos, sin año cero). Los campos opcionales vacíos del formulario de otras áreas siguen admitidos. No se impone una nueva regla entre inicio de actividad y difusión.
- Al actualizar un proveedor, la fecha de cierre se compara con la fecha de requerimiento enviada en la misma edición; antes se comparaba con la fecha anterior de BD.
- El helper de horas hábiles construye cada jornada explícitamente en Lima. El recorrido de días de calendario no depende de la zona del servidor. Días vacíos/inválidos no se convierten en domingo; horarios inválidos, fechas inválidas y rangos invertidos devuelven cero.

No se cambia el tipo de las columnas ni se corrigen valores almacenados. No hay migraciones, backfills, borrados ni consultas a producción.

## Comprobaciones

Verificadores temporales externos al repositorio, sin framework nuevo. Se ejecutan con Node/dependencias existentes en aislamiento de red, entorno ficticio explícito, fuentes de solo lectura y límites de recursos, como los bloques anteriores.

110 comprobaciones bajo cada una de cuatro zonas (`UTC`, `America/Lima`, `Asia/Tokyo`, `America/Los_Angeles`), 440 en total: calendario/instantes, cambio de año, bisiestos, días inválidos, fechas opcionales, validación DIF/proveedores, jornadas completas/parciales, fin de semana, cambio de día UTC, días configurados, entradas inválidas y comparación con la nueva fecha de requerimiento. La actualización de proveedor usa un doble de BD y comprueba ausencia de escritura cuando se rechazan fechas.

Además, 146 comprobaciones previas de permisos aprobadas. TypeScript y ESLint aprobados con 0 errores y las 3 advertencias conocidas. Los verificadores no conectan a PostgreSQL ni a servicios reales. Vercel aprobó el build de Preview del código `b01c88d`.

## Límites

El helper de horas hábiles aún no tiene consumidores que calculen métricas. No se afirma que este bloque cambie los KPIs/SLA actuales ni se reemplaza su cálculo de tiempo natural. Las cohortes, los ciclos de reapertura y la integración con horarios siguen pendientes en el bloque de métricas.

Las relaciones de área y las transiciones concurrentes de proveedores requieren su revisión propia. Este bloque solo corrige la validación y comparación de fechas; no certifica esa integridad pendiente. El recorrido visual de calendarios y las comprobaciones autenticadas continúan pendientes.

## Preview

La [Preview de `b01c88d`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/HuQ1BidXLMt1ASiohY7CGVGcxy93) figura como `success` (registro de GitHub `7376639495`). Este resultado acredita compilación, no el recorrido visual o autenticado ni la concurrencia real. La rama se integró en `main` tras su aprobación y se desplegó en producción como `8562497`.

## Producción

El [despliegue de `8562497`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/FXppNv4dQnva327trs89FeXfPHsL) figura como `success` (registro de GitHub `7376704736`). En https://requerimientos-hub.vercel.app se verificaron login 200, sesión anónima 200/`null` y dashboard 307 a login. No se ejecutaron migraciones, backfills, scripts de mantenimiento ni operaciones manuales sobre datos, correo o archivos de producción.
