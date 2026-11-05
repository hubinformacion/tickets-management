# Exportación de proveedores por lotes

Alcance aprobado al continuar la estabilización: reducir la memoria del Excel completo sin cambiar permisos, contenido, formato o datos. Rama local `fix/exportacion-proveedores`; sin Preview, dependencias nuevas, CI ni migraciones.

- Leer hasta 500 tickets y sus evaluaciones por consulta, con cursor descendente por fecha e ID. Conservar la precisión original de la fecha; snapshot repeatable read/read only para una descarga consistente.
- Usar el escritor progresivo de ExcelJS existente: confirmar filas y enviar el ZIP directamente al navegador, con contrapresión. Ante cancelación/fallo, detener nuevos lotes y drenar/finalizar el compresor descartando el resultado parcial; un fallo no debe parecer una descarga válida.
- Conservar las 20 columnas, estilos, datos sin evaluación, alcance global de admin y área del agente. No truncar resultados ni introducir cuotas.
- Validar con datos ficticios, ExcelJS real, varios lotes, empates/submilisegundos, permisos, cancelaciones y fallos. Tipos, ESLint y build local sin secretos; revisión independiente. Documentar límites y preparar commit local para aprobación de merge.

Se confirma el despliegue ya existente `0ed4583`, Production 7552182347 y versión pública; no se genera otro despliegue para repetirlo. Los reportes HTML y otras observaciones de auditoría continúan pendientes.
