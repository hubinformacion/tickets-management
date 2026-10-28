# Validación y límites de adjuntos

## Estado y alcance

Preparado en `bbac6e4` (`fix/limites-adjuntos`), sobre `6d081e3`. Pendiente de integración y despliegue en producción. Continúa el bloque de entradas de archivos del plan aprobado. El usuario confirmó conservar ZIP además de documentos e imágenes, dejando fuera videos y archivos de diseño.

No incluye migraciones ni cambios de esquema. Se aplica a nuevas cargas; no revisa, transforma ni elimina adjuntos históricos.

## Formatos y tamaño

Lista compartida entre cliente y servidor:

- PDF.
- JPG/JPEG, PNG, GIF y WebP.
- Word DOC/DOCX, Excel XLS/XLSX y PowerPoint PPT/PPTX.
- TXT, LOG y CSV sin bytes de control binarios. Para texto UTF-16, guardar una copia en UTF-8 antes de subir.
- ZIP.

No se admiten cargas directas de videos, PSD/AI, SVG/HTML, ejecutables, RAR/7z ni extensiones Office con macros como DOCM. No se inspecciona el contenido de los archivos comprimidos dentro de un ZIP.

El formulario anunciaba 5 MB, pero [Vercel Functions limita las solicitudes a 4,5 MB](https://vercel.com/docs/functions/limitations#request-body-size). El nuevo máximo es **4.000.000 bytes (4 MB) por archivo**, con **65.536 bytes adicionales** para el formulario multipart: solicitud de hasta **4.065.536 bytes**. FilePond y servidor usan las mismas constantes y unidades decimales. No se intenta aumentar el límite de la plataforma mediante configuración de Next.js.

## Validación del servidor

- Sesión activa antes de leer el cuerpo. Limitador local de 30 operaciones por minuto/usuario para POST y DELETE, con claves separadas y respuesta 429/Retry-After. El almacén compartido continúa pendiente.
- Lectura acotada de bytes antes del parser multipart, con o sin Content-Length. Se rechazan longitudes inválidas, inconsistentes y excesivas. Al exceder el límite se deja de leer y no se inicia el parser; no se fuerza la cancelación de un productor multipart asíncrono.
- Solo campos `file` y `uploadToken`: un único File, metadata opcional de FilePond y un único token UUID. Las cargas múltiples de la UI siguen siendo solicitudes separadas.
- Nombre acotado, sin rutas ni controles, archivo no vacío, extensión admitida y MIME compatible. MIME ausente u octet-stream se resuelve a uno canónico solo tras verificar el contenido.
- Firmas básicas de PDF/imágenes y contenedor OLE para Office antiguo. TXT/LOG/CSV rechazan bytes de control binarios.
- ZIP: directorio central y cabeceras locales coherentes, offsets/nombres/tamaños acotados, sin extraer ni descomprimir. No se admite ZIP64 ni volúmenes múltiples. Para DOCX/XLSX/PPTX se requieren las entradas propias del formato y `[Content_Types].xml`; se rechazan entradas cifradas y `vbaProject.bin`.
- El revert tiene cuerpo limitado a 128 bytes y conserva la autorización de adjuntos pendientes del uploader. Las referencias se conservan si Drive no confirma el borrado.
- Solo después de validar se llama a Drive y se guardan metadatos. Se mantiene el ID de texto plano que espera FilePond. Los errores no vuelcan los objetos del proveedor, contenido o credenciales en logs.

Las firmas y nombres internos no certifican un documento válido o libre de malware. No se valida todo el PDF/imagen, los flujos internos OLE, CRC ni XML de Office; no es un antivirus. El límite de ZIP se aplica al archivo comprimido almacenado y no a su contenido expandido, que este servidor no procesa.

## Comprobaciones

409 comprobaciones temporales: 405 de política, firmas/contenedores, truncamiento y 128 mutaciones de ZIP sin excepciones inesperadas, lectura por chunks/longitudes, multipart real, respuestas de FilePond, sesión/inactividad, límites, campos duplicados/extra, MIME/extensión, fallos simulados de Drive/BD y autorización del revert. Otras 4 comprueban que un archivo de exactamente 4 MB más su formulario cabe en el límite y llega íntegro al validador.

Las cabeceras/contenedores son fixtures sintéticos para comprobar las decisiones del validador; no sustituyen abrir documentos reales en sus aplicaciones. BD, sesiones y Drive se simulan. TypeScript aprobado con `tsc --noEmit --incremental false`; ESLint aprobado con 0 errores y las 3 advertencias conocidas. Vercel aprobó el build de Preview del código `bbac6e4`.

Se usan dependencias existentes, red aislada, entorno ficticio sin credenciales, fuentes/dependencias de solo lectura, scratch de 512 MiB y límites de CPU/memoria/procesos/archivos del bloque anterior. El material se crea en un directorio temporal privado de la caché y se elimina en `finally`; no se conserva `.codex-validation-tickets` ni se añade un framework de tests.

## Pendientes

- Cuota total/cantidad por lote, token o usuario, con reserva atómica para solicitudes concurrentes.
- Rate limiting compartido entre instancias; el limitador actual solo protege cada proceso.
- Recuperación de cargas con persistencia incierta, coordinación entre vinculación y revert, compensaciones, borrado recuperable y huérfanos. No se borra automáticamente un archivo recién subido si la inserción falla de forma incierta: podría haberse confirmado en BD.
- Recorrido visual/autenticado y comprobación efectiva de Drive. No se invocaron uploads ni borrados reales, crons o correos de producción.

## Preview

La [Preview de `bbac6e4`](https://vercel.com/hub-de-informacions-projects/requerimientos-hub/wxm8gVjpdQTm8k5GiydYidzgLc3P) figura como `success` (registro de GitHub `7389277846`). La rama continúa pendiente de merge y despliegue en producción. Esta compilación no certifica uploads reales, el recorrido visual ni los servicios externos.
