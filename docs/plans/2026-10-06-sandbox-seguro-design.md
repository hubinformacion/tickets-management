# Sandbox de demos y optimización de compilación

Diseño basado en la Fase 0 aprobada y la indicación del usuario del 6 de octubre: aislar demos, preservar todos los datos de producción y administrar quién puede entrar desde la configuración del sandbox.

## Decisiones

- Rama de trabajo `feat/sandbox-seguro`, sin merge a main. Despliegue de prueba en Vercel Preview y BD Neon separada creada solo con schema, sin copiar personas/tickets/sesiones.
- `SANDBOX_DATABASE_URL` exclusiva y huella de destino de producción. Local y Preview bloquean el uso de DATABASE_URL como fallback; detectan coincidencia incluso entre host Neon pooled/unpooled. Verificar endpoints efectivos de la branch antes de conectar.
- Correo, Drive y cron bloqueados por defecto. Adjuntos explícitamente desactivados en la UI de demos; su integración con almacenamiento de prueba será una tarea posterior con credenciales propias.
- Administrador inicial por SANDBOX_ADMIN_EMAIL, secreto de sesión y URL propios. Login Google pide identidad básica. Admin autoriza personas por correo en Gestión de usuarios del sandbox; lista en app_settings de esa BD, sin esquema nuevo. Retirar acceso elimina sus sesiones de sandbox y no borra tickets/personas.
- Seed aditivo de catálogos sintéticos para las tres áreas; no reset ni copia de producción. Los scripts destructivos tienen guard adicional y no se ejecutan para instalar demos.
- Imports específicos de Gmail/Drive/OAuth para evitar analizar el catálogo completo de googleapis. No aumentar el heap por defecto ni saltar tipos. Correcciones de lint existentes con inicialización de estado al montar los formularios.

## Validación y despliegue

Tipos, lint, build con memoria predeterminada y llamadas HTTP locales con configuración sintética. Comprobar guard de destinos, secreto, Preview y bloqueo de borrado con entradas ficticias. No agregar framework ni archivos de tests.

Neon, Vercel y el OAuth real requieren accesos verificados. No publicar la demo como terminada hasta crear recursos, registrar callback y comprobar login/autorizar/revocar con usuarios reales de prueba. La aprobación de merge a main permanece separada de la preparación del sandbox.
