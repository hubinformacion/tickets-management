# Adjuntos accesibles Implementation Plan

> **For agentic workers:** Ejecutar inline con executing-plans; revisión independiente al terminar. Reglas del proyecto: sin framework/tests persistentes ni pnpm test; rama local y datos ficticios.

**Goal:** Corregir el encabezado semántico y completar nombres/avisos en español del widget de archivos.
**Architecture:** Mantener FilePond y sus etiquetas nativas por instancia. Cambiar el label decorativo por p (igual que otras secciones de adjuntos), ocultar el icono decorativo y configurar las etiquetas que ya ofrece la dependencia.
**Tech Stack:** React, FilePond 4.32.11/react-filepond 7.1.3 existentes; sin dependencias nuevas.
**Spec:** Pendiente de accesibilidad de adjuntos del plan de estabilización, aprobado al pedir continuar. El código instalado y Context7 confirman que FilePond asocia su input con el drop-label mediante IDs internos; no se añade una segunda asociación manual.

## Restricciones y decisiones

4.000.000 bytes por archivo, cantidad ilimitada, mismos tipos, tokens, colas, endpoints/callbacks y vinculación; sin migraciones o datos reales. Se conservan identidad visual y mecanismos de FilePond. Checkout actual con rama independiente, sin worktree adicional ni Preview. No se corrigen falsos positivos cambiando funcionalidad válida.

## Atención en revisión

Dos instancias con IDs independientes; selección con teclado; nombres y anuncios durante carga/error/reintento/cancelación; conservación de archivos ante error; ninguna llamada real a BD o Drive.

## Tareas

- [x] Corregir label decorativo de src/components/tickets/ticket-attachment-uploader.tsx y completar opciones de idioma en src/components/shared/file-upload.tsx. Ajustar el contraste en src/app/globals.css, limitado a .filepond-wrapper: las capturas confirmaron verde completado claro y texto secundario semitransparente. Conservar tonos/controles nativos.
- [x] Recorrido Chromium con FilePond real y API ficticia: selección, labels/IDs, estados de carga y retirada, 4 MB/cantidad sin cambios; tipos, ESLint y build ficticio, Doctor e Impeccable acotados al cambio.
- [x] Revisión independiente, resolver defectos concretos, documentar evidencia y límites, commit local de código/documentación.
