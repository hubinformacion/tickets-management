
import { z } from "zod";

// Campos base compartidos por todos los formularios
const baseTicketFields = {
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  categoryId: z.coerce.number().min(1, "Selecciona una categoría"),
  subcategoryId: z.coerce.number().min(1, "Selecciona una subcategoría"),
  attentionAreaId: z.coerce.number().min(1, "Selecciona un área de atención"),
};

// ─── Server-side schemas (validación estricta en server actions) ───

// Schema para TSI y Fondo Editorial (con prioridad, sin campos de difusión)
export const createTicketSchema = z.object({
  ...baseTicketFields,
  priority: z.enum(["low", "medium", "high", "critical"]),
});

// Schema para Difusión (con prioridad + campos específicos)
export const createDiffusionTicketSchema = z.object({
  ...baseTicketFields,
  priority: z.enum(["low", "medium", "high", "critical"]),
  activityStartDate: z.string().min(1, "La fecha de inicio de la actividad es obligatoria"),
  desiredDiffusionDate: z.string().min(1, "La fecha deseada de difusión es obligatoria"),
  targetAudience: z.string().min(1, "El público objetivo es obligatorio"),
});

type CreateTicketSchema = z.infer<typeof createTicketSchema>;
type CreateDiffusionTicketSchema = z.infer<typeof createDiffusionTicketSchema>;

// ─── Client-side unified schema (para useForm único en el formulario) ───
// Todos los campos opcionales específicos de área. La validación real ocurre
// en el server action con el schema específico de cada área.

export const createTicketFormSchema = z.object({
  ...baseTicketFields,
  // TSI/FE
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  // Difusión
  activityStartDate: z.string().optional(),
  desiredDiffusionDate: z.string().optional(),
  targetAudience: z.string().optional(),
});

export type CreateTicketFormSchema = z.infer<typeof createTicketFormSchema>;

// ─── Priority Config schemas (admin/agent config) ───

export const updatePriorityConfigSchema = z.object({
  id: z.coerce.number().min(1),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  slaHours: z.coerce.number().min(1, "El SLA debe ser al menos 1 hora"),
});

type UpdatePriorityConfigSchema = z.infer<typeof updatePriorityConfigSchema>;

// ─── Provider schemas (admin/agent config) ───

export const createProviderSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  attentionAreaId: z.coerce.number().min(1, "Selecciona un área de atención"),
});

export const updateProviderSchema = z.object({
  id: z.coerce.number().min(1),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  isActive: z.boolean(),
});

type CreateProviderSchema = z.infer<typeof createProviderSchema>;
type UpdateProviderSchema = z.infer<typeof updateProviderSchema>;

// ─── Provider Ticket schemas (tickets derivados) ───

export const createProviderTicketSchema = z.object({
  externalCode: z.string().min(1, "El código externo es obligatorio"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  requestDate: z.string().min(1, "La fecha de requerimiento es obligatoria"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  providerId: z.coerce.number().min(1, "Selecciona un proveedor"),
  ticketId: z.coerce.number().optional(), // Enlace opcional
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
});

export const updateProviderTicketSchema = z.object({
  id: z.coerce.number().min(1),
  externalCode: z.string().min(1, "El código externo es obligatorio"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  requestDate: z.string().min(1, "La fecha de requerimiento es obligatoria"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  providerId: z.coerce.number().min(1, "Selecciona un proveedor"),
  status: z.enum(["en_proceso", "cerrado"]),
  ticketId: z.coerce.number().optional(),
  completionDate: z.string().optional(), // Fecha de atención (para calcular tiempos)
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
});

type CreateProviderTicketSchema = z.infer<typeof createProviderTicketSchema>;
type UpdateProviderTicketSchema = z.infer<typeof updateProviderTicketSchema>;

// ─── Satisfaction Survey schemas ───

const ratingField = z.coerce.number().min(1, "La calificación mínima es 1").max(5, "La calificación máxima es 5");

export const submitSurveySchema = z.object({
  ticketId: z.coerce.number().min(1),
  responseTimeRating: ratingField,
  communicationRating: ratingField,
  solutionRating: ratingField,
  overallRating: ratingField,
  improvementSuggestion: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

type SubmitSurveySchema = z.infer<typeof submitSurveySchema>;
