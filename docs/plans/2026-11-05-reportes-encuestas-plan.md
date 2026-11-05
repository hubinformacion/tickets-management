# Reportes completos de encuestas y validación de acceso

Alcance autorizado al pedir continuar reportes y validación autenticada en paralelo. Conservar formato HTML imprimible, contenido completo, filtros, permisos y KPIs de toda la selección. Sin dependencias, CI, Preview, migraciones ni datos reales de prueba.

- Reutilizar las cohortes y agregados existentes dentro de una lectura repeatable read/read only. Separar consulta de resumen y filas para compartir con tablas paginadas; reportes leen por cursor de fecha/ID en lotes de 500 con precisión de PostgreSQL.
- Emitir encabezado, lotes de filas y cierre HTML progresivamente, con contrapresión y cancelación. Imprimir solo al completar el reporte; un fallo corta el cuerpo y nunca emite el disparador de impresión. Preservar escape de todos los datos y estado vacío; fechas de proveedores en Lima como sus filtros y tabla.
- Validación de acceso en paralelo: matriz efímera con sesiones ficticias y revisión de helpers/proxy. Hallazgo confirmado en raíz del dashboard: sustituir getSession/check manual por requireAuth para rechazar cuentas inactivas, sin invocar componentes BD de prueba.
- Comprobaciones efímeras sin framework ni servicios reales: varios lotes, empates/submilisegundos, resumen completo, vacíos, contenido/escape/fechas, permisos/filtros, fallos y cancelación; tipos, ESLint y build local con valores ficticios. Revisión independiente final.

No hay navegador conectado con sesión Google autorizada. Se pide al responsable comprobar en producción login, recarga y ticket propio, sin mutaciones ni compartir credenciales. Distinguir ese resultado de las comprobaciones locales.
