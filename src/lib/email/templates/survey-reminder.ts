import { getBaseTemplate } from './base-template';
import { escapeHtml } from '../escape-html';

export interface SurveyReminderTemplateParams {
  userName: string;
  ticketCode: string;
  ticketUrl: string;
  attentionAreaName?: string;
  closedAt: string;
}

export function getSurveyReminderTemplate(params: SurveyReminderTemplateParams): string {
  const userName = escapeHtml(params.userName);
  const ticketCode = escapeHtml(params.ticketCode);
  const closedAt = escapeHtml(params.closedAt);

  const content = `
        <h2 style="color: #333; font-size: 20px; margin-top: 0; text-align: center;">Califica tu experiencia</h2>
        
        <p style="margin: 15px 0;">Hola <strong>${userName}</strong>,</p>
        
        <p style="margin: 15px 0;">El ticket <strong>#${ticketCode}</strong> fue cerrado el <strong>${closedAt}</strong> 
        y aún no hemos recibido tu calificación sobre la atención recibida.</p>
        
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong>⭐ Tu opinión es importante:</strong> Te invitamos a completar una breve encuesta de satisfacción 
            que nos ayuda a mejorar continuamente nuestro servicio de soporte.
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <a href="${params.ticketUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ir al ticket y calificar</a>
        </div>
    `;

  return getBaseTemplate(content, params.attentionAreaName);
}
