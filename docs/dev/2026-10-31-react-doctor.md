# Revisión inicial de React Doctor

## Estado

Se revisa `e47e29d01920cb45e534c2d7ee8ebb2d2ff3ac69`, con árbol limpio. La accesibilidad del menú/editor ya está integrada y desplegada: Production `7463472478`, SHA confirmado en dominio público y [CI aprobada](https://github.com/hubinformacion/tickets-management/actions/runs/41235386593). Se eliminó la rama integrada tras comprobar igualdad de contenido. Login 200, sesión anónima 200/null, dashboard 307 a login; estado autenticado de recordatorios 200, queue disponible y corte fijo del 28 de octubre. No se ejecutaron workers, envíos, cargas ni borrados reales.

Este registro continúa el pendiente de calidad. No cambia código, dependencias, configuración de Doctor, hook local, CI ni producción. Se mantiene local y se agrupará con la próxima corrección para evitar un despliegue de solo documentación.

## Método y cobertura

React Doctor **0.9.17**, versión fija ya disponible localmente, con Node 24.22.1. Se contrastaron las opciones con Context7 y con el --help de esa versión. Comando sobre copia del proyecto:

```text
react-doctor . --scope full --json --no-telemetry --no-supply-chain --no-cache --no-parallel --yes --blocking none
```

El proceso se ejecutó con red aislada, entorno vacío salvo valores operativos explícitos, HOME/temporales nuevos, código/herramientas/dependencias de solo lectura y límites de CPU/espacio de direcciones/tiempo. La copia excluyó .git, .env*, node_modules, .next y tsbuildinfo; se montaron las dependencias existentes de solo lectura. No se descargaron ni instalaron paquetes. El JSON y el material temporal se retiraron después de consolidar este registro.

El informe declara 285 archivos escaneados/analizados, un proyecto Next.js, complete=true y skippedChecks vacío para ese análisis local. El escaneo de Socket.dev/cadena de suministro se desactivó expresamente; no sustituye una auditoría actual de dependencias. Sin puntuación ni enlace compartido porque se desactivaron score/telemetría.

Resultado: **79 diagnósticos, 9 error y 70 warning, en 58 archivos**. Exit 0/ok=true significa que terminó el análisis con blocking=none; **no significa Doctor aprobado**. No se añadieron supresiones para convertirlo en verde.

## Alertas de autenticación contrastadas

Las nueve alertas server-auth-actions se descartan como ausencia de autenticación en este código: todas las funciones ejecutan incondicionalmente await requireAgent antes de acceder a BD. El helper llama a requireAuth, comprueba sesión y usuario activo, y solo permite agent/admin. No se probó el proveedor de identidad real ni se afirma cobertura de autorización de toda la aplicación por este resultado.

| Archivo | Acciones señaladas | Control adicional observado |
|---|---|---|
| src/actions/admin/ticket-management.ts | unassignTicket | canManageTicket y actualización condicional del ticket leído |
| src/actions/agent/priority-config.ts | updateAgentPriorityConfigAction | área del usuario y configuración del área |
| src/actions/agent/provider-tickets.ts | createProviderTicketAction, updateProviderTicketAction, reopenProviderTicketAction, deleteProviderTicketAction | área de sesión, referencias del área, consultas por área y condición de versión |
| src/actions/agent/update-business-hours.ts | updateBusinessHoursAction | área tomada de la sesión, no del formulario |
| src/actions/agent/update-config.ts | updateAreaConfigAction | área tomada de la sesión, no del formulario |
| src/actions/comments/add-derivation.ts | addDerivationAction | canManageTicket y proveedor vinculado del mismo ticket/área |

No se reescribe autenticación válida para satisfacer una heurística del analizador. Tampoco se deshabilita esa regla de forma global: sus futuros diagnósticos requieren contraste.

La advertencia insecure-crypto-risk en api/upload/route.ts:99 corresponde a MD5 como checksum binario de Drive. La carga calcula también SHA-256, y el registro compara SHA-256 además de MD5/metadatos; MD5 no se usa para sesión, contraseña, firma o autorización. No se confirma una vulnerabilidad por ese uso de interoperabilidad. Se revisaron también uploads/upload-attempt-store.ts y drive/client.ts.

## Siguientes correcciones concretas

1. **Controles de accesibilidad restantes:** ticket-filters.tsx anida el botón de limpiar fecha dentro de otro botón y no le da nombre. user-selector.tsx tiene un botón de quitar persona sin nombre y opacidad cero hasta hover, sin alternativa de foco. El campo title de ticket-form.tsx no tiene nombre estable más allá del placeholder. Estas tres correcciones son pequeñas y comprobables.
2. **Encuestas:** los títulos de preguntas de pending-survey-banner.tsx y provider-tickets-list.tsx son label sin control asociado. Los botones numéricos necesitan contexto de pregunta y estado seleccionado; proponer fieldset/legend y una semántica de selección coherente, conservando escalas y validación actuales.
3. **Adjuntos:** ticket-attachment-uploader.tsx usa label como encabezado de sección sin control asociado. Revisar la etiqueta real de FilePond antes de cambiar solo el elemento visual.
4. **Login:** handleLogin restablece isLoading cuando hay excepción, pero no comprueba un resultado de error devuelto por signIn.social. Revisar el contrato instalado de Better Auth y reproducir una respuesta de error ficticia antes de decidir el cambio. No se etiqueta como fallo confirmado solo por el mensaje genérico del analizador.

La advertencia Suspense del listado de proveedores requiere considerar que la página espera searchParams y autenticación de servidor, y está renderizada dinámicamente. Las dos alertas de new Date en Difusión señalan calendarios dentro de un Popover cerrado por defecto: falta demostrar discrepancia real antes de añadir efectos o suppressHydrationWarning. Se dejan para verificación dirigida.

No se paralelizan automáticamente los cinco await en bucles. En código operativo hay inserciones por lotes dentro de transacción, escrituras de orden de catálogo y adquisición ordenada de bloqueos de formularios; deben conservar sus invariantes. Dos avisos están en scripts históricos, que no se ejecutaron. Los 17 duplicados JSX, nueve avisos de complejidad y demás recomendaciones siguen pendientes de priorización: este registro no afirma haber validado cada uno de los 70 warnings.

## Alcance propuesto para el siguiente bloque

Separar el botón de limpiar fechas del disparador del calendario, ponerle nombre y foco visible; nombrar los botones de quitar usuarios y hacerlos visibles con foco/teclado; añadir una etiqueta persistente al título del ticket. Conservar filtros, formularios y datos. Validar nombres/Tab, que limpiar no abra el calendario, teclado de selección de usuarios y tipos/lint/build con datos ficticios. Encuestas y login se tratarán después con su propio diseño y verificación.

Pendientes generales: revisión con lector de pantalla/sesión real, contraste visual, exportaciones grandes, observación de servicios reales y avisos transitivos. La CI actual solo cubre instalación/tipos/lint/build y no ejecuta Doctor.
