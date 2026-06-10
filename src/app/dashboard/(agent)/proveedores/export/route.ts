import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerTickets, providerSatisfactionSurveys } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { eq, desc } from "drizzle-orm";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAgent();
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;

    const ticketRows = await db.query.providerTickets.findMany({
      where: !isAdmin && areaId ? eq(providerTickets.attentionAreaId, areaId) : undefined,
      with: {
        provider: { columns: { name: true } },
        requestedBy: { columns: { name: true } },
        attentionArea: { columns: { name: true } },
      },
      orderBy: [desc(providerTickets.createdAt)],
    });

    const surveys = await db.query.providerSatisfactionSurveys.findMany({
      with: {
        submittedBy: { columns: { name: true } },
      },
    });

    const surveyByTicket = new Map(surveys.map((s) => [s.providerTicketId, s]));

    function daysBetween(from: string | null, to: string | null): number | null {
      if (!from || !to) return null;
      const d1 = new Date(from).getTime();
      const d2 = new Date(to).getTime();
      if (isNaN(d1) || isNaN(d2)) return null;
      return Math.round((d2 - d1) / 86400000);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Tickets";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Tickets de proveedores");

    worksheet.columns = [
      { header: "Código externo", key: "externalCode", width: 18 },
      { header: "Título", key: "title", width: 30 },
      { header: "Descripción", key: "description", width: 30 },
      { header: "Proveedor", key: "provider", width: 20 },
      { header: "Área de atención", key: "attentionArea", width: 20 },
      { header: "Estado", key: "status", width: 15 },
      { header: "Prioridad", key: "priority", width: 12 },
      { header: "Solicitado por", key: "requestedBy", width: 20 },
      { header: "Fecha de creación", key: "createdAt", width: 22 },
      { header: "Fecha de solicitud", key: "requestDate", width: 18 },
      { header: "Fecha de finalización", key: "completionDate", width: 20 },
      { header: "Tiempo de atención (días)", key: "daysOpen", width: 24 },
      { header: "Evaluación: T. respuesta", key: "evalResponseTime", width: 24 },
      { header: "Evaluación: Plazos", key: "evalDeadlines", width: 18 },
      { header: "Evaluación: Calidad", key: "evalQuality", width: 18 },
      { header: "Evaluación: Comprensión", key: "evalUnderstanding", width: 24 },
      { header: "Evaluación: Atención", key: "evalAttention", width: 18 },
      { header: "Evaluación: Promedio", key: "evalAverage", width: 20 },
      { header: "Evaluado por", key: "evaluatedBy", width: 20 },
      { header: "Fecha de evaluación", key: "evalDate", width: 20 },
    ];

    for (const t of ticketRows) {
      const survey = surveyByTicket.get(t.id);
      const days = daysBetween(t.requestDate, t.completionDate);

      worksheet.addRow({
        externalCode: t.externalCode,
        title: t.title,
        description: t.description || "—",
        provider: t.provider?.name ?? "—",
        attentionArea: t.attentionArea?.name ?? "—",
        status: t.status === "cerrado" ? "Cerrado" : "En proceso",
        priority: t.priority ?? "—",
        requestedBy: t.requestedBy?.name ?? "—",
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString("es-ES") : "—",
        requestDate: t.requestDate ?? "—",
        completionDate: t.completionDate ?? "—",
        daysOpen: days !== null ? days : "—",
        evalResponseTime: survey?.responseTimeRating ?? "—",
        evalDeadlines: survey?.deadlineRating ?? "—",
        evalQuality: survey?.qualityRating ?? "—",
        evalUnderstanding: survey?.requirementUnderstandingRating ?? "—",
        evalAttention: survey?.attentionRating ?? "—",
        evalAverage: survey
          ? (
              (survey.responseTimeRating +
                survey.deadlineRating +
                survey.qualityRating +
                survey.requirementUnderstandingRating +
                survey.attentionRating) /
              5
            ).toFixed(2)
          : "—",
        evaluatedBy: survey?.submittedBy?.name ?? "—",
        evalDate: survey?.createdAt
          ? new Date(survey.createdAt).toLocaleDateString("es-ES")
          : "—",
      });
    }

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    const buffer = await workbook.xlsx.writeBuffer();

    const now = new Date().toISOString().split("T")[0];
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tickets-proveedores-${now}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting provider tickets:", error);
    return NextResponse.json({ error: "No autorizado o error al exportar" }, { status: 401 });
  }
}
