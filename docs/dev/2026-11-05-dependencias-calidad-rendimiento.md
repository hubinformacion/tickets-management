# Dependencias, calidad, rendimiento y estado de recordatorios

## Estado y alcance

Producción queda en `27ac4ea`, deployment 7576879841 aprobado y SHA público confirmado al publicar la regla de días laborables; main/origin coincidían y se eliminó su rama. Este bloque se prepara en `fix/dependencias-calidad-rendimiento`, pendiente de aprobación de merge/despliegue. [Plan](../plans/2026-11-05-dependencias-calidad-rendimiento-plan.md).

El usuario pidió los tres frentes en paralelo y explicación de qué faltaba en recordatorios. Se usan propietarios de archivos distintos y una revisión final independiente. No se reactivan CI, Preview o recorridos de aceptación real, ni se instalan suites o frameworks de pruebas. No hay nuevas funcionalidades, servicios, cambios de esquema o escrituras de datos productivos.

## Dependencias

Auditoría actual en copia temporal sin .env, scripts o pnpmfile: **6 avisos (5 moderados/1 bajo) antes y 3 moderados después; cero altos/críticos**. No son incidentes ni una demostración de explotabilidad. Next.js 16.4.3, Zod 4.6.7 y Better Auth 1.7.14 no aparecen afectados en esa ejecución; no se actualizan simplemente por existir latest.

Tres ajustes transitivos compatibles y dirigidos:

| Camino | Resolución anterior | Nueva | Motivo |
|---|---|---|---|
| Typography → postcss-selector-parser | 6.0.10 | 6.1.5 | Backport de seguridad 6.x; el padre fija la versión exacta. |
| gaxios 7.1.3 de ramas Google | 7.1.3 | 7.3.1 | Retira rimraf/glob/minimatch de esa rama; misma major y declaraciones públicas comparadas sin cambios. |
| Drizzle Kit → tsx | 4.21.0 | 4.23.15 | Dentro de ^4.21.0; reutiliza esbuild 0.28.2 y retira otra copia vulnerable. |

Los overrides viven en el **pnpm-workspace.yaml ya existente**, que conserva íntegros allowBuilds para esbuild/sharp/unrs-resolver y la exclusión opcional de Biome/fsevents. Durante la preparación se omitió accidentalmente allowBuilds al copiar una configuración mínima; la revisión lo detectó y se restauró antes de cerrar. No se cambia la política de instalación del proyecto.

package.json y las versiones directas permanecen intactos. Frente a HEAD, el lock añade solo parser 6.1.5, elimina 54 entradas y cambia seis enlaces de snapshots padres; buena parte de la reducción son binarios de plataformas del esbuild que deja de duplicarse. No se refrescan otros paquetes por rutina. [Overrides de pnpm](https://pnpm.io/settings#overrides), también [compatibles con pnpm 10](https://pnpm.io/10.x/settings#overrides).

Avisos restantes:

- [Esbuild del loader de Drizzle](https://github.com/advisories/GHSA-67mh-4wv8-2f99): queda 0.18.20 bajo @esbuild-kit, no la rama tsx ya corregida. Se inspeccionó uso de transformación; no se encontró activación del servidor de desarrollo afectado. Cambiar a la familia 0.25+ requiere revisar compatibilidad del loader; no se fuerza un override mayor.
- [UUID de ExcelJS](https://github.com/advisories/GHSA-w5hq-g745-h8pq): queda 8.3.2; el código de ExcelJS inspeccionado invoca v4() sin buffer, mientras el aviso exige otras variantes/uso de buffer. No se fuerza UUID 11 dentro de ExcelJS 4.
- [Minimatch de ESLint](https://github.com/advisories/GHSA-g3hv-75wg-m249): queda 10.2.6 en typescript-estree. La llamada inspeccionada usa {dot:true}, sin optimizationLevel >= 2 exigido por el aviso, y los patrones provienen de configuración local. El parche exige 11.x; se espera una actualización compatible del padre.

Estas son evaluaciones del camino inspeccionado, no una garantía para cualquier uso futuro. El cambio no cierra los tres avisos ni declara el proyecto exento de vulnerabilidades. Typography procesa CSS del repositorio, no contenido CSS enviado por solicitantes; no se demostró ataque a producción.

## Calidad

El diálogo de proveedores permanecía montado y su key para crear seguía siendo new después de guardar, por lo que la siguiente creación conservaba campos, proveedor/prioridad y vínculo anterior. Ahora se renueva la sesión del diálogo únicamente después del éxito de creación; se reinician juntos formulario y selector del ticket vinculado. Cancelar y fallar conservan el borrador, y editar no dispara el contador de nuevas creaciones. No se añade efecto de sincronización ni reset parcial de widgets.

Los formatos SLA de admin/agente convertían 25 o 47 horas en «1 día» por truncamiento. Ahora se muestran horas cuando no son múltiplos de 24; 24 y 48 conservan «1 día» y «2 días». No cambia la duración calculada o almacenada.

Los catálogos de categorías/subcategorías del agente incorporan nombres accesibles de activar, editar y eliminar por fila, y la etiqueta de categoría apunta al trigger existente mediante id. Se copia el patrón del catálogo administrativo, sin rediseño, cambios de autorización o lógica de altas/bajas.

No se vuelve a descargar o ejecutar React Doctor: el último registro conserva nueve alertas de autenticación contrastadas y 64 advertencias. El JSON histórico por línea ya fue retirado; no se inventa qué advertencia individual desaparece ni un nuevo conteo. Se corrigen defectos confirmados por lectura del código, sin supresiones ni refactor masivo de complejidad.

## Rendimiento

Analytics del agente ejecutaba getSLACompliance y serializaba slaData, pero su componente no representaba ni desestructuraba esa prop. Se retira únicamente ese cálculo histórico y la prop/tipo sin consumidor; administración conserva SLA y el agente conserva todas las métricas visibles. Es una consulta completa evitada, no una métrica eliminada de la interfaz.

En el detalle de un ticket, historial y usuarios terminaban antes de iniciar consultas independientes de prioridad, encuesta y proveedores. Ahora las cinco lecturas comparten Promise.all después de validar acceso al ticket. Se conservan consultas, filtros, condiciones, selección de observadores y esperas de las variables locales; no se adelantan lecturas protegidas ni se paralelizan escrituras/transacciones ordenadas. No se añade índice o consulta ni se cuantifica una latencia sin medirla.

## Recordatorios: qué se revisó y qué se encontró

La regla de calendario ya está desplegada y no se modifica aquí. La preocupación concreta era si un cron diario limitado a 20 reservas/25 segundos acumula trabajos y si los fallos dejan registros recuperables, en vez de marcar un envío como exitoso.

El 5 de noviembre a las 17:44:36 UTC se consultaron **solo agregados** en una transacción repeatable read/read only con TLS verificado, timeout de sentencia 10 segundos y de bloqueo 2 segundos. Resultado: tabla lista; **8 entregas sent, cero tickets elegibles vencidos sin enviar, cero elegibles sin encolar, cero reintentos pendientes y cero reservas caducadas**; máximo histórico de intentos observado: uno. No se leyeron nombres, correos, códigos o contenido de tickets, ni se ejecutó el worker o se enviaron mensajes.

Por inspección, el worker devuelve los fallos de envío a pending con next_attempt_at, conserva la reserva cuando falla la confirmación posterior y permite recuperar leases caducadas. Se preservan los límites y el cron gratuito porque no hay evidencia de acumulación en esa observación. Esto es una instantánea, no acredita todos los fallos futuros ni las ejecuciones posteriores.

Un correo que Gmail acepta y cuya confirmación no llega a persistirse aún puede duplicarse al recuperar el trabajo; esa incertidumbre ya estaba documentada. Los reintentos del plan diario ocurren en la próxima ejecución habilitada, no necesariamente a los 15 minutos del mínimo de backoff. Aumentar capacidad o añadir infraestructura sin demanda demostrada queda fuera de este cambio.

## Verificación y límites

TypeScript estricto sin incremental, ESLint completo sin advertencias y build de producción con el árbol actualizado: aprobados (exit 0). Fuentes/código/dependencias de solo lectura en copia sin .env, entorno ficticio, CPU/memoria/tiempo acotados y red externa bloqueada; hashes de lock/config idénticos antes y después.

Las fuentes públicas Inter se descargaron de forma separada sin ejecutar el proyecto. El primer intento de build aislado falló en el reemplazo local de fuentes de Turbopack, por intentar resolver una ruta absoluta como recurso de red. Se corrigió únicamente el arnés temporal para servir esos mismos archivos por loopback dentro del namespace aislado; la compilación final pasó. No se cambió next.config, la fuente de la app o el bundler productivo para ocultar el fallo de preparación.

Instalación temporal final con lock congelado, scripts/pnpmfile deshabilitados y configuración restaurada: aprobada. Enlaces efectivos comprobados para parser, gaxios y tsx/esbuild. El árbol instalado usa exactamente el lock nuevo; no se presenta la compilación del node_modules anterior como prueba de estos parches.

Calidad: ESLint focalizado aprobado, detector Impeccable sin hallazgos en los objetivos, 14 ejemplos efímeros de formato SLA y comprobación AST de creación/key aprobados. Rendimiento: comprobaciones estáticas de administración/agente, guardas del detalle y número/forma de lecturas aprobadas. Sin navegador real o nuevas matrices de aceptación, por decisión del usuario.

La revisión independiente confirmó código, overrides, compatibilidad de API pública de gaxios, conservación de configuración y alcance de lock. Sin bloqueantes pendientes; límites de dependencias restantes documentados arriba.

No se midieron latencias/memoria reales, ni concurrencia del motor o entrega efectiva de correo como parte de este bloque. Se conservan los datos históricos, crons, cortes de activación, cuotas existentes y credenciales. El material temporal de revisión se elimina al finalizar; no se incorporan herramientas permanentes.
