# Corrección UTF-8, actualización completa de paquetes y calidad

## Estado

Producción confirmada en la entrega anterior: `abb8bf2`, deployment 7582780847 aprobado y SHA coincidente en el dominio público; main/origin estaban limpios. Incluye dependencias/calidad/rendimiento anteriores y preparación de campaña. La campaña puntual histórica fue ejecutada con aprobación expresa: Gmail confirmó **30 correos para 158 tickets**, sin grupos omitidos o inciertos. Se revalidó cada grupo y se guardó un registro privado con identificadores Gmail, fuera de git; no se modificaron datos de BD ni los automáticos.

Este bloque queda en `fix/utf8-dependencias-calidad`, rama local pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-utf8-paquetes-calidad-plan.md). El usuario pidió los tres frentes en paralelo y todas las versiones actuales a la fecha. No se repite la campaña ni se envía correo de prueba.

## Corrección compartida del cuerpo de correo

El encoder quoted-printable convertía ó en =F3 (byte Latin-1) mientras declaraba UTF-8, dejaba otros caracteres Unicode sin convertir y no plegaba líneas. Se reprodujo «Validación» como «Validaci�n». La campaña puntual ya enviada había mitigado esto con entidades HTML; esa solución no corregía los demás emisores.

El cuerpo HTML ahora se convierte a bytes UTF-8 y base64 con Buffer, con líneas MIME de 76 caracteres separadas por CRLF, y declara Content-Transfer-Encoding: base64. Se elimina la función defectuosa. Sin dependencias nuevas ni cambios de destinatarios, asunto, remitente, threading, identificador de mensaje, OAuth, señales, timeouts o retry:false del worker.

Comprobación efímera del sendGmailEmail real con Gmail simulado: antes 5/11, después **11/11**. Español/ñ/emoji/HTML largo/ASCII/vacío/saltos de línea, cabeceras UTF-8, To/Cc/Bcc, remitente/asunto, threading/custom ID, envío ordinario y opciones/cancelación/fallo sin reintentos. El cuerpo base64 se decodifica de vuelta a los bytes UTF-8 originales. No es una prueba de entrega de Gmail ni reenvía correos previos.

## Paquetes revisados hoy

[Tabla completa de los 59 paquetes y excepciones](2026-11-05-paquetes-revisados.md). Se ajustan **42 versiones** y **56 de 59 objetivos están en latest estable**. Incluye Next/config 16.4.5, React/DOM 19.3.1, TipTap 3.33.0, Better Auth 1.7.18, RHF 7.91.0/resolvers 7.0.3, Googleapis 189 y otras bibliotecas de interfaz/herramientas.

Se mantienen las ramas compatibles TypeScript 6.0.3, ESLint 9.39.5 y tipos Node 24.19.2 por peers/runtime. ESLint 9 está fuera de soporte; no se oculta ese límite ni se declara una migración a 10 realizada. El árbol pasa tipos/lint/build con esas versiones. Auditoría antes/después: tres moderados y cero altos/críticos, con condiciones/caminos de uso y pendientes explícitos en la tabla de paquetes.

La configuración de pnpm conserva controles anteriores y añade 40 excepciones exactas para versiones publicadas hoy; son necesarias incluso en instalación frozen bajo la política de antigüedad predeterminada de pnpm 11. No se rebaja esa política globalmente. Instalación limpia con HOME vacío, lock congelado y scripts/pnpmfile deshabilitados aprobada sin override ambiental de antigüedad. No se instala en el workspace para usar su árbol anterior como evidencia.

## Calidad

CommentForm permitía editar durante addCommentAction y, al éxito, setContent("") borraba también lo escrito durante la espera. Ahora pasa disabled=isPending al RichTextEditor, reutilizando su setEditable y el patrón de otros editores. Se conserva el contenido ante error y el vaciado solo después del éxito. No cambia el backend ni los mensajes.

DerivationForm enlaza las etiquetas de proveedor y fecha con SelectTrigger/Input y el botón del calendario mediante IDs únicos useId. No cambia estilos, selección, validación, calendario o flujo del formulario.

ESLint focalizado y detector Impeccable sin hallazgos. No se descarga Doctor ni se añaden supresiones para reducir un contador: 64 sigue siendo el último registro histórico, no un nuevo recuento ni 64 defectos confirmados.

## Verificación integrada

TypeScript estricto sin incremental, ESLint completo sin advertencias y build Next 16.4.5: **aprobados (exit 0) con el árbol de dependencias actualizado**. El lock y la configuración tuvieron hashes iguales antes y después. Se usó copia sin .env, fuentes/código/dependencias de solo lectura, valores ficticios y límites locales de CPU, memoria, disco y tiempo. La red externa estuvo bloqueada; los recursos públicos Inter se precargaron fuera de la ejecución y se sirvieron por loopback dentro del namespace aislado.

La comprobación MIME final se ejecutó también con TypeScript 6 y el árbol nuevo dentro del aislamiento, sin credenciales/red: 11/11. Se comprobó además resolvers 7/RHF 7/Zod 4 con el schema real del formulario: coerción de IDs y errores para entradas inválidas correctos. El import Gmail/OAuth2 de Googleapis 189 y la API config de Dotenv 18 se comprobaron localmente sin hacer peticiones. La revisión independiente contrastó MIME, controles, peers/engines y política de instalación; sin bloqueantes pendientes. Los artefactos temporales se retiran al finalizar y se conserva solo evidencia resumida.

No se realizaron recorridos de aceptación autenticada ni comprobaciones reales de Google/Drive/PostgreSQL como parte de este bloque, conforme a la decisión del usuario. Los resultados técnicos no garantizan cualquier integración o carga de producción. No se crea framework/suite de pruebas, CI, Preview, servicio de pago, tabla, índice o migración; no se reescriben cierres, encuestas, recordatorios o datos históricos.
