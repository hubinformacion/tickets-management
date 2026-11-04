# Accesibilidad del widget de adjuntos

## Estado

El push autorizado integró las encuestas como `9e42b8f1f1c1705ae0e82438558b10f1fdaa9ae0`. Production `7551116445` aprobada y SHA confirmado en el dominio público. Login 200, sesión anónima 200/null y dashboard 307 a login; estado autenticado de recordatorios 200, queue disponible y corte fijo. La rama de encuestas se eliminó tras verificar igualdad de contenido con main.

La [ejecución de CI 41864442479](https://github.com/hubinformacion/tickets-management/actions/runs/41864442479) permaneció en cola sin runner durante la [incidencia oficial de Actions/Pages](https://www.githubstatus.com/api/v2/summary.json), iniciada el 4 de noviembre a las 16:05 UTC. Luego pasó a ejecución: el job «Tipos, lint y build» y todos sus pasos terminaron con success; el estado agregado de la ejecución aún figura in_progress al cerrar este registro. Se conserva esa diferencia respecto a Vercel y la validación local. No se canceló ni duplicó la ejecución ni se cambiaron permisos de cuenta o workflow para resolver la cola.

Este bloque se prepara en `fix/adjuntos-accesibles`, rama local pendiente de merge/despliegue, sin Preview. [Plan y alcance](../plans/2026-11-04-adjuntos-accesibles-plan.md).

## Cambio

El texto de sección del cargador de detalle pasa de label sin control a p, como en otras secciones de adjuntos. El icono decorativo queda oculto a lectores. FilePond ya asocia nativamente el input con su drop-label mediante IDs internos por instancia; esa asociación se conserva.

Se configuran las opciones nativas de botones y avisos que seguían en inglés: quitar, cancelar, reintentar, subir, lectura, altas/bajas, cantidad y errores de retirada. No se añaden parámetros del widget ni asociaciones DOM manuales. En instantUpload, FilePond usa labelButtonRemoveItem también para retirar un archivo procesado; el nombre visible esperado es «Quitar archivo».

Las capturas mostraron además bajo contraste en el verde de completado y textos secundarios con opacity 0.5. El CSS, limitado a .filepond-wrapper, usa tonos green-700/red-700 y vuelve opacos los detalles/pistas visibles. Se conservan los ocultamientos nativos de estados sin acción y del indicador de completado: la revisión independiente detectó un exceso de especificidad inicial que se corrigió antes de cerrar el bloque.

Sin cambios en 4.000.000 bytes por archivo, cantidad ilimitada, tipos aceptados, tokens, cola, callbacks, endpoints, lógica de vinculación o limpieza visual. Sin dependencias nuevas, cambios de esquema ni datos históricos.

## Verificación

- TypeScript estricto, ESLint sin advertencias y build final aprobados (exit 0). Copia sin .env y valores ficticios, dependencias existentes de solo lectura, recursos acotados y lockfile intacto. verifyDepsBeforeRun=false solo durante la comprobación local para evitar reinstalaciones; no cambia CI/Vercel.
- Chromium con FilePond 4.32.11/react-filepond 7.1.3 reales y dos widgets. Código/herramientas de solo lectura, entorno vacío, red aislada; todas las respuestas de API se interceptaron con datos ficticios. La acción de vinculación real se sustituyó y no se ejecutó.
- Inputs múltiples con nombres/etiquetas nativas válidas e IDs únicos; selección con Enter. Se comprobó error de subida y reintento con teclado, conservación de la lista y nombres en español de las acciones nativas.
- Se aceptaron tres archivos simultáneos y un cuarto posterior. 4.000.001 bytes se rechazaron en cliente sin POST y 4.000.000 se aceptaron. Cinco POST ficticios en total, incluido el reintento; sin DELETE ni acceso a Drive/BD. Esta comprobación acredita el cliente, no sustituye la validación del endpoint real.
- Widgets dentro del viewport a 320/360/768/1440 px en claro/oscuro. Capturas inspeccionadas. El contraste se midió sobre el fondo opaco de los segmentos que pinta FilePond (su panel raíz es transparente), no contra ese nodo transparente: mínimo **4,94:1** para textos de archivos completados en ambos temas. No se extrapola a toda la aplicación ni a estados ocultos.
- Detector Impeccable final sin hallazgos para los archivos tocados. Doctor 0.9.17: 286 archivos, **9 errores/64 advertencias**, frente a 9/65 del bloque anterior; desaparece la etiqueta sin asociación. Sin supresiones nuevas; no se declara Doctor global aprobado por las alertas de autenticación contrastadas y los avisos restantes.
- Revisión independiente de etiquetas y del CSS final aprobada, incluido el ocultamiento de pistas cuando falta su acción. No se cambiaron las funciones de procesar/retirar archivos para satisfacer un diagnóstico.

Se consultó Context7 y el código instalado de FilePond para etiquetas, IDs y estados. No se creó framework ni suite de tests. El material temporal se retira al finalizar.

## Límites y continuación

Pendientes lector de pantalla y dispositivos físicos, integración real de Drive/vinculación/cancelación, exportaciones grandes, avisos restantes y observación operativa. No se enviaron archivos o correo ni se borraron datos de producción como prueba. El nuevo código de adjuntos queda local hasta aprobación de integración.
