# Organización y mantenimiento del proyecto

## Objetivo y alcance aprobado

Preparar una base consistente para resolver la auditoría y desarrollar nuevas funcionalidades. Se conservan `AGENTS.md`, configuración útil, licencias, historial y documentación técnica. Se retiran atribuciones explícitas a herramientas, material obsoleto y código sin consumidores comprobados.

## Enfoque

La estructura actual por rutas, acciones, componentes y utilidades se mantiene durante esta limpieza. Se actualizan los puntos de entrada de documentación, se eliminan imports y declaraciones sin uso y se corrigen comentarios que contradigan el comportamiento real. Las afirmaciones de seguridad no verificadas se sustituyen por límites concretos.

La limpieza no extrae servicios ni modifica reglas de negocio. Los permisos compartidos se incorporarán después, dentro del bloque de autorización del plan de auditoría. No se reescribe historia de Git ni se modifica infraestructura, credenciales o datos de producción.

## Criterios de cierre

- Documentación de entrada coherente con las versiones y pendientes actuales.
- Diagramas sin referencias al proceso o herramientas de autoría; sus licencias se conservan.
- Eliminación de código sin uso revisada, preservando efectos necesarios como los guards de autenticación.
- Tipos y lint comprobados; cambios de comportamiento separados y sujetos a validación específica.
- Sin nuevos frameworks de pruebas, merge o despliegue durante esta limpieza.
