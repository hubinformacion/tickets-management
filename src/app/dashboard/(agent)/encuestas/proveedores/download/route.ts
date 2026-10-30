import { readProviderSurveyResults } from "@/lib/surveys/provider-results";
import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/helpers";
import { escapeHtml } from "@/lib/email/escape-html";
import { surveyFiltersSchema } from "@/lib/validation/schemas";

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
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  if (!parsedFilters.success) return new Response("Filtros de encuesta inválidos", { status: 400 });
  const filters = parsedFilters.data;

  let result: Awaited<ReturnType<typeof readProviderSurveyResults>>;
  try {
    result = await readProviderSurveyResults(session.user.role === "admin" ? undefined : session.user.attentionAreaId!, filters);
  } catch {
    console.error("No se pudieron exportar las evaluaciones de proveedores");
    return new Response("Error al obtener las evaluaciones de proveedores", { status: 500 });
  }

  const { surveys, kpis } = result;

  const filterLabel = [
    filters.agentId ? `Agente filtrado` : "",
    filters.dateFrom ? `Desde: ${filters.dateFrom}` : "",
    filters.dateTo ? `Hasta: ${filters.dateTo}` : "",
  ].filter(Boolean).join(" · ");

  const rows = surveys.map((s) => `
    <tr>
      <td><span class="mono">${escapeHtml(String(s.providerTicket.externalCode))}</span><br/><small>${escapeHtml(String(s.providerTicket.title))}</small></td>
      <td>${escapeHtml(String(s.providerTicket.provider.name))}</td>
      <td>${escapeHtml(String(s.attentionArea?.name ?? "—"))}</td>
      <td>${escapeHtml(String(s.submittedBy?.name ?? "—"))}</td>
      <td>${new Date(s.createdAt).toLocaleDateString("es-PE")}</td>
      <td class="center">${escapeHtml(String(s.responseTimeRating))}</td>
      <td class="center">${escapeHtml(String(s.deadlineRating))}</td>
      <td class="center">${escapeHtml(String(s.qualityRating))}</td>
      <td class="center">${escapeHtml(String(s.requirementUnderstandingRating))}</td>
      <td class="center">${escapeHtml(String(s.attentionRating))}</td>
    </tr>`).join("");

  const invalidNotice = kpis.invalidRatingCount > 0 ? "<p>Algunas calificaciones históricas no son válidas y se excluyen de los promedios; se conservan en el detalle.</p>" : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte: Evaluaciones de proveedores</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #555; margin-bottom: 24px; font-size: 12px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
    .kpi { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; }
    .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #111; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f4f4f5; }
    th { text-align: left; padding: 8px 10px; font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    td.center { text-align: center; font-weight: 600; }
    .mono { font-family: monospace; font-size: 10px; }
    small { color: #666; font-size: 10px; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; font-size: 10px; color: #aaa; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; size: landscape; }
    }
  </style>
</head>
<body>
  ${invalidNotice}
  <h1>Reporte: Evaluaciones de proveedores</h1>
  <p class="subtitle">Generado el ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}${filterLabel ? ` · ${escapeHtml(filterLabel)}` : ""}</p>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total evaluaciones</div>
      <div class="kpi-value">${escapeHtml(String(kpis.totalSurveys))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Promedio general</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgOverall))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Calidad del entregable (prom.)</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgQuality))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tiempo de respuesta (prom.)</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgResponseTime))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Cumplimiento de plazos (prom.)</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgDeadline))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Atención del proveedor (prom.)</div>
      <div class="kpi-value">${escapeHtml(String(kpis.avgAttention))}<span style="font-size:13px;font-weight:400;color:#888">/5</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Ticket</th><th>Proveedor</th><th>Área</th><th>Evaluado por</th><th>Fecha</th>
        <th>T.Resp</th><th>Plazos</th><th>Calidad</th><th>Comprensión</th><th>Atención</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:20px;color:#888;">Sin evaluaciones con los filtros aplicados</td></tr>'}</tbody>
  </table>

  <div class="footer">Sistema de Gestión de Tickets · ${new Date().getFullYear()}</div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
