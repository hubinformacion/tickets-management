import { z } from "zod";
import { isCalendarDate } from "@/lib/utils/calendar-date";

export const calendarDateSchema = z.iso.date("Ingresa una fecha válida (AAAA-MM-DD)")
  .refine(isCalendarDate, "Ingresa una fecha válida (AAAA-MM-DD)");

export const ticketIdSchema = z.number().int().positive();

export const ticketStatusSchema = z.enum(["open", "in_progress", "pending_validation", "resolved", "voided"]);

export const ticketMessageSchema = z.string().trim().min(1).max(20000);

export const surveyFiltersSchema = z.object({
  agentId: z.string().trim().min(1).max(256).optional(),
  areaId: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value))).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
}).refine(filters => !filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo, {
  message: "El inicio del rango debe ser anterior al fin", path: ["dateTo"],
});

export const watcherIdsSchema = z.array(z.string().trim().min(1).max(256))
  .max(10, "Se permiten como máximo 10 observadores")
  .transform(ids => [...new Set(ids)]);

export const updateTicketWatchersSchema = z.object({
  ticketId: ticketIdSchema,
  watchers: watcherIdsSchema,
});

export const ticketCommentSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  content: z.string().trim().min(1).max(20000),
});

export const uploadTokenSchema = z.string().uuid();
export const attachmentIdSchema = z.string().uuid();

export const ticketAttachmentSchema = z.object({
  ticketId: ticketIdSchema,
  uploadToken: uploadTokenSchema,
});

export const deleteTicketAttachmentSchema = z.object({
  ticketId: ticketIdSchema,
  attachmentId: attachmentIdSchema,
});

export const ticketDerivationSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  providerName: z.string().trim().min(1).max(200),
  estimatedDate: calendarDateSchema.optional(),
  note: z.string().trim().max(10000).optional(),
  providerTicketId: ticketIdSchema.optional(),
});

// Campos base compartidos por todos los formularios
const baseTicketFields = {
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  categoryId: z.coerce.number().int().min(1, "Selecciona una categoría"),
  subcategoryId: z.coerce.number().int().min(1, "Selecciona una subcategoría"),
  attentionAreaId: z.coerce.number().int().min(1, "Selecciona un área de atención"),
};

// ─── Server-side schemas (validación estricta en server actions) ───

// Schema para TSI (con prioridad, sin campos de difusión ni metadata)
export const createTicketSchema = z.object({
  ...baseTicketFields,
  priority: z.enum(["low", "medium", "high", "critical"]),
});

// Schema para Fondo Editorial (con prioridad + metadata dinámica)
export const fedMetadataSchema = z.object({
  requestType: z.enum(["nuevo", "correcciones", "introduccion_correcciones"]).optional(),
  documentLink: z.string().url("Ingresa una URL válida").optional().or(z.literal("")),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1").optional(),
  quantityLabel: z.string().optional(),
  numberOfPages: z.coerce.number().min(1, "El número de páginas debe ser al menos 1").optional(),
}).optional();

export const createFedTicketSchema = z.object({
  ...baseTicketFields,
  priority: z.enum(["low", "medium", "high", "critical"]),
  metadata: fedMetadataSchema,
});

// Schema para Difusión (con prioridad + campos específicos)
export const createDiffusionTicketSchema = z.object({
  ...baseTicketFields,
  priority: z.enum(["low", "medium", "high", "critical"]),
  activityStartDate: calendarDateSchema,
  desiredDiffusionDate: calendarDateSchema,
  targetAudience: z.string().min(1, "El público objetivo es obligatorio"),
});

// ─── Client-side unified schema (para useForm único en el formulario) ───
// Todos los campos opcionales específicos de área. La validación real ocurre
// en el server action con el schema específico de cada área.

export const createTicketFormSchema = z.object({
  ...baseTicketFields,
  // TSI/FED
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  // Difusión
  activityStartDate: calendarDateSchema.optional().or(z.literal("")),
  desiredDiffusionDate: calendarDateSchema.optional().or(z.literal("")),
  targetAudience: z.string().optional(),
  // Fondo Editorial (metadata dinámica)
  fedRequestType: z.string().optional(),
  fedDocumentLink: z.string().optional(),
  fedQuantity: z.coerce.number().optional(),
  fedNumberOfPages: z.coerce.number().optional(),
});

export type CreateTicketFormSchema = z.infer<typeof createTicketFormSchema>;

// ─── Priority Config schemas (admin/agent config) ───

export const updatePriorityConfigSchema = z.object({
  id: z.coerce.number().min(1),
  description: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  slaHours: z.coerce.number().min(1, "El SLA debe ser al menos 1 hora"),
});

// ─── Business Hours schemas (horario de atención por área) ───

const timeStringSchema = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  "Formato de hora inválido (HH:MM)"
);

export const updateBusinessHoursSchema = z.object({
  id: z.coerce.number().min(1),
  businessStartTime: timeStringSchema,
  businessEndTime: timeStringSchema,
}).refine(
  (data) => data.businessStartTime < data.businessEndTime,
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["businessEndTime"] }
);

export type UpdateBusinessHoursSchema = z.infer<typeof updateBusinessHoursSchema>;

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

// ─── Provider Ticket schemas (tickets derivados) ───

export const createProviderTicketSchema = z.object({
  externalCode: z.string().min(1, "El código externo es obligatorio"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  requestDate: calendarDateSchema,
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  providerId: z.coerce.number().int().positive("Selecciona un proveedor"),
  ticketId: z.coerce.number().int().positive().optional(), // Enlace opcional
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
});

export const updateProviderTicketSchema = z.object({
  id: z.coerce.number().int().positive(),
  externalCode: z.string().min(1, "El código externo es obligatorio"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  requestDate: calendarDateSchema,
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  providerId: z.coerce.number().int().positive("Selecciona un proveedor"),
  status: z.enum(["en_proceso", "cerrado"]),
  ticketId: z.coerce.number().int().positive().optional(),
  completionDate: calendarDateSchema.optional(), // Fecha de atención (para calcular tiempos)
  priority: z.enum(["baja", "media", "alta", "critica"]).optional(),
});

const providerRatingMessage = "Las calificaciones deben ser números enteros entre 1 y 5";
const optionalProviderRating = z.coerce.number(providerRatingMessage).int(providerRatingMessage)
  .min(1, providerRatingMessage).max(5, providerRatingMessage).optional();

export const closeProviderTicketSchema = z.object({
  id: z.coerce.number("ID de ticket inválido").int("ID de ticket inválido").positive("ID de ticket inválido"),
  completionDate: calendarDateSchema,
  responseTimeRating: optionalProviderRating,
  deadlineRating: optionalProviderRating,
  qualityRating: optionalProviderRating,
  requirementUnderstandingRating: optionalProviderRating,
  attentionRating: optionalProviderRating,
}).refine(data => {
  const ratings = [data.responseTimeRating, data.deadlineRating, data.qualityRating,
    data.requirementUnderstandingRating, data.attentionRating];
  return ratings.every(rating => rating === undefined) || ratings.every(rating => rating !== undefined);
}, { message: "Completa las cinco calificaciones o cierra el ticket sin encuesta", path: ["responseTimeRating"] });

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

// ─── Catálogos y ordenación ───
const catalogFields = {
  name: z.string().trim().min(1, "El nombre es requerido").max(200),
  description: z.string().trim().max(10000),
  isActive: z.boolean(),
};
const catalogId = z.coerce.number().int().positive();
const categoryFields = { ...catalogFields, attentionAreaId: catalogId.nullable() };
const subcategoryFields = { ...catalogFields, categoryId: catalogId };
const toggleCatalogCommand = z.object({ operation: z.literal("toggle"), id: catalogId, newState: z.boolean().optional() });
const deleteCatalogCommand = z.object({ operation: z.literal("delete"), id: catalogId });
const moveCatalogFields = { operation: z.literal("move"), id: catalogId, direction: z.enum(["up", "down"]) };

export const categoryMutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), ...categoryFields }),
  z.object({ operation: z.literal("update"), id: catalogId, ...categoryFields }),
  toggleCatalogCommand, deleteCatalogCommand, z.object(moveCatalogFields),
]);

export const subcategoryMutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), ...subcategoryFields }),
  z.object({ operation: z.literal("update"), id: catalogId, ...subcategoryFields }),
  toggleCatalogCommand, deleteCatalogCommand,
  z.object({ ...moveCatalogFields, expectedCategoryId: catalogId }),
]);
