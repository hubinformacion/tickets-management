import { once } from "node:events";
import { Writable } from "node:stream";
import { NextResponse } from "next/server";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { providerTickets, providerSatisfactionSurveys } from "@/db/schema";
import { getSession } from "@/lib/auth/helpers";

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const d1 = new Date(from).getTime();
  const d2 = new Date(to).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!session.user.isActive || !["agent", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "No tienes permiso para exportar" }, { status: 403 });
    }
    const isAdmin = session.user.role === "admin";
    const areaId = session.user.attentionAreaId;
    if (!isAdmin && !areaId) {
      return NextResponse.json({ error: "Debes tener un área asignada para exportar" }, { status: 403 });
    }

    let cancelled = false;
    let resume: (() => void) | undefined;
    const release = () => {
      const callback = resume;
      resume = undefined;
      callback?.();
    };

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const fail = () => {
          if (!cancelled) {
            cancelled = true;
            controller.error(new Error("No se pudo completar la exportación"));
          }
          release();
        };
        const abort = () => fail();
        request.signal.addEventListener("abort", abort, { once: true });
        if (request.signal.aborted) abort();

        // Al cancelar, se drena el ZIP parcial sin enviarlo ni consultar más lotes.
        const output = new Writable({
          write(chunk: Buffer, _encoding, callback) {
            if (cancelled) {
              callback();
              return;
            }
            controller.enqueue(chunk);
            if ((controller.desiredSize ?? 0) <= 0) resume = callback;
            else callback();
          },
        });
        output.on("error", fail);
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
          stream: output,
          useStyles: true,
          useSharedStrings: false,
        });
        workbook.creator = "Sistema de Tickets";
        workbook.created = new Date();

        const generate = async () => {
          try {
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

            const headerRow = worksheet.getRow(1);
            headerRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4472C4" },
            };
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

            headerRow.commit();

            await db.transaction(async (tx) => {
              let cursor: { id: number; createdAt: string } | undefined;
              while (!cancelled) {
                const ticketRows = await tx.query.providerTickets.findMany({
                  where: and(
                    !isAdmin && areaId ? eq(providerTickets.attentionAreaId, areaId) : undefined,
                    cursor
                      ? sql`(${providerTickets.createdAt}, ${providerTickets.id}) < (${cursor.createdAt}::timestamp, ${cursor.id})`
                      : undefined,
                  ),
                  // Conservar microsegundos de PostgreSQL: Date los truncaría al paginar.
                  extras: { cursorCreatedAt: sql<string>`${providerTickets.createdAt}::text`.as("cursor_created_at") },
                  with: {
                    provider: { columns: { name: true } },
                    requestedBy: { columns: { name: true } },
                    attentionArea: { columns: { name: true } },
                  },
                  orderBy: [desc(providerTickets.createdAt), desc(providerTickets.id)],
                  limit: 500,
                });
                if (cancelled || ticketRows.length === 0) break;
                const surveys = await tx.query.providerSatisfactionSurveys.findMany({
                  where: inArray(providerSatisfactionSurveys.providerTicketId, ticketRows.map(ticket => ticket.id)),
                  with: { submittedBy: { columns: { name: true } } },
                });
                if (cancelled) break;
                const surveyByTicket = new Map(surveys.map(survey => [survey.providerTicketId, survey]));
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
                  }).commit();
                }

                const last = ticketRows[ticketRows.length - 1];
                cursor = { id: last.id, createdAt: last.cursorCreatedAt };
                if (ticketRows.length < 500) break;
                await new Promise<void>(resolve => setImmediate(resolve));
                if (output.writableNeedDrain) await once(output, "drain");
              }
            }, { isolationLevel: "repeatable read", accessMode: "read only" });
          } catch {
            console.error("Error al generar la exportación de proveedores");
            fail();
          } finally {
            try {
              // Finalizar también ante fallos libera los recursos del compresor.
              await workbook.commit();
              if (!cancelled) controller.close();
            } catch {
              fail();
            }
            request.signal.removeEventListener("abort", abort);
          }
        };
        void generate();
      },
      pull() { release(); },
      cancel() {
        cancelled = true;
        release();
      },
    });

    const now = new Date().toISOString().split("T")[0];
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tickets-proveedores-${now}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error al iniciar la exportación de proveedores:", error);
    return NextResponse.json({ error: "No se pudo iniciar la exportación" }, { status: 500 });
  }
}
