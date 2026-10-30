import { readUserSurveyResults } from "@/lib/surveys/results";
import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/helpers";
import { escapeHtml } from "@/lib/email/escape-html";
import { surveyFiltersSchema } from "@/lib/validation/schemas";
import { formatDateShort } from "@/lib/utils/format";
import { PERU_TIMEZONE } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireAgent>>;
  try {
    session = await requireAgent();
    if (session.user.role !== "admin" && !session.user.attentionAreaId) {
      return new Response("Debes tener un área asignada para exportar", { status: 403 });
    }
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedFilters = surveyFiltersSchema.safeParse({
    agentId: searchParams.get("agentId") ?? undefined,
    areaId: searchParams.get("areaId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  if (!parsedFilters.success) return new Response("Filtros de encuesta inválidos", { status: 400 });
  const filters = parsedFilters.data;

  const areaId = session.user.role === "admin"
    ? filters.areaId ? Number(filters.areaId) : undefined : session.user.attentionAreaId!;
  let result: Awaited<ReturnType<typeof readUserSurveyResults>>;
  try {
    result = await readUserSurveyResults(areaId, filters);
  } catch {
    console.error("No se pudieron obtener los resultados de encuestas para exportar");
    return new Response("Error al obtener los resultados de encuestas", { status: 500 });
  }

  const { surveys, kpis } = result;

  const filterLabel = [
    filters.agentId ? `Agente filtrado` : "",
    filters.areaId ? "Área seleccionada" : "",
    filters.dateFrom ? `Desde: ${filters.dateFrom}` : "",
    filters.dateTo ? `Hasta: ${filters.dateTo}` : "",
  ].filter(Boolean).join(" · ");

  const rows = surveys.map((s) => `
    <tr>
      <td>${escapeHtml(String(s.ticket.ticketCode))}</td>
      <td>${escapeHtml(String(s.user?.name ?? "—"))}</td>
      <td>${escapeHtml(String(s.attentionArea?.name ?? "—"))}</td>
      <td>${escapeHtml(formatDateShort(s.createdAt))}</td>
      <td class="center">${escapeHtml(String(s.responseTimeRating))}</td>
      <td class="center">${escapeHtml(String(s.communicationRating))}</td>
      <td class="center">${escapeHtml(String(s.solutionRating))}</td>
      <td class="center">${escapeHtml(String(s.overallRating))}</td>
      <td>${escapeHtml(String(s.improvementSuggestion ?? "—"))}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte: Encuestas de usuarios</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #555; margin-bottom: 24px; font-size: 12px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
    .kpi { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; }
    .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #111; }
    .kpi-sub { font-size: 10px; color: #888; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f4f4f5; }
    th { text-align: left; padding: 8px 10px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    td.center { text-align: center; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; font-size: 10px; color: #aaa; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <h1>Reporte: Encuestas de satisfacción de usuarios</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric", timeZone: PERU_TIMEZONE })}${filterLabel ? ` · ${escapeHtml(filterLabel)}` : ""}</p>

  <p class="subtitle">Periodo según fecha de cierre de los tickets en hora de Lima. Respuestas y tasa comparten los mismos filtros.</p>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total encuestas</div>
      <div class="kpi-value">${escapeHtml(String(kpis.totalSurveys))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Satisfacción general</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgOverall))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tasa de respuesta</div>
      <div class="kpi-value">${escapeHtml(String(kpis.responseRate))}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tiempo de respuesta (prom.)</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgResponseTime))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
  </div>

  ${kpis.invalidRatingCount > 0 ? '<p class="subtitle">Las calificaciones históricas fuera de rango se conservan en la tabla y se excluyen de los promedios.</p>' : ""}

  <table>
    <thead>
      <tr>
        <th>Ticket</th><th>Solicitante</th><th>Área</th><th>Fecha de respuesta</th>
        <th>Tiempo</th><th>Comunicación</th><th>Solución</th><th>General</th>
        <th>Comentario</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">Sin encuestas con los filtros aplicados</td></tr>'}</tbody>
  </table>

  <div class="footer">Sistema de Gestión de Tickets · ${new Date().toLocaleDateString("es-PE", { year: "numeric", timeZone: PERU_TIMEZONE })}</div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
