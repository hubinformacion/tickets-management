import { escapeHtml } from "@/lib/email/escape-html";
import { getBaseTemplate } from "@/lib/email/templates/base-template";
import { formatDateShort } from "@/lib/utils/date";

export interface SurveyReminderDigestTicket {
  ticketCode: string;
  title: string;
  attentionAreaName: string;
  closedAt: Date;
}

interface SurveyReminderDigestTemplateParams {
  userName: string;
  baseUrl: string;
  tickets: SurveyReminderDigestTicket[];
}

export const SURVEY_REMINDER_DIGEST_SUBJECT = "Encuestas de satisfacción pendientes | Hub de Información";

export function getSurveyReminderDigestTemplate({ userName, baseUrl, tickets }: SurveyReminderDigestTemplateParams): string {
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:") throw new Error("El enlace del correo debe usar HTTPS");
  if (tickets.length === 0) throw new Error("No hay encuestas pendientes para este correo");

  const items = tickets.map(ticket => {
    const url = new URL(`/dashboard/tickets/${encodeURIComponent(ticket.ticketCode)}`, origin);
    return `
      <li style="margin: 0 0 18px;">
        <a href="${escapeHtml(url.toString())}" style="color: #1d4ed8; font-weight: bold;">${escapeHtml(ticket.ticketCode)} — ${escapeHtml(ticket.title)}</a>
        <br><span style="color: #555;">${escapeHtml(ticket.attentionAreaName)} · Cerrado el ${escapeHtml(formatDateShort(ticket.closedAt))}</span>
      </li>`;
  }).join("");

  return getBaseTemplate(`
    <h2 style="font-size: 20px; margin-top: 0;">Tu opinión nos ayuda a mejorar</h2>
    <p>Hola, <strong>${escapeHtml(userName)}</strong>:</p>
    <p>${tickets.length === 1
      ? "Tienes un ticket cerrado cuya encuesta de satisfacción aún está pendiente."
      : `Tienes <strong>${tickets.length} tickets cerrados</strong> cuyas encuestas de satisfacción aún están pendientes.`}</p>
    <p>Reunimos los pendientes en este único correo. Abre cada ticket y completa su encuesta para contarnos cómo fue la atención:</p>
    <ul style="padding-left: 22px;">${items}</ul>
    <p>Si ya completaste alguna encuesta después de recibir este mensaje, no necesitas volver a responderla.</p>
    <p>Gracias por ayudarnos a mejorar nuestro servicio.</p>
  `);
}
