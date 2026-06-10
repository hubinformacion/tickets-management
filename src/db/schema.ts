

import { pgTable, text, timestamp, boolean, uuid, serial, integer, jsonb, unique, type AnyPgColumn, smallint, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- AUTH SCHEMA (Better-Auth Compatible) ---

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  role: text("role").default("user").notNull(), // 'user', 'admin'

  // User activation fields
  isActive: boolean("is_active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: text("deactivated_by").references((): AnyPgColumn => users.id),

  // Agent specific
  attentionAreaId: integer("attention_area_id").references((): AnyPgColumn => attentionAreas.id),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- APP SCHEMA ---

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., "allow_new_tickets", "ticket_disabled_message", "ticket_disabled_title"
  value: text("value").notNull(), // JSON string or simple value
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- CONFIGURATION TABLES ---

export const ticketCategories = pgTable("ticket_category", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  attentionAreaId: integer("attention_area_id").references((): AnyPgColumn => attentionAreas.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketSubcategories = pgTable("ticket_subcategory", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => ticketCategories.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- TICKETS ---

export const tickets = pgTable("ticket", {
  id: serial("id").primaryKey(),
  ticketCode: text("ticket_code").notNull().unique(), // Format: {AREA_SLUG}-YYYY-#### (e.g., TSI-2026-0001)
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'pending_validation', 'resolved', 'voided'
  priority: text("priority"), // 'low', 'medium', 'high', 'critical' — null para Difusión

  createdById: text("created_by_id").notNull().references(() => users.id),
  assignedToId: text("assigned_to_id").references(() => users.id),

  // FK references to configuration tables
  categoryId: integer("category_id").references(() => ticketCategories.id),
  subcategoryId: integer("subcategory_id").references(() => ticketSubcategories.id),
  // Target Attention Area
  attentionAreaId: integer("attention_area_id").references(() => attentionAreas.id),

  // Campos específicos de Difusión
  activityStartDate: date("activity_start_date"),          // Fecha de inicio de la actividad
  desiredDiffusionDate: date("desired_diffusion_date"),    // Fecha deseable de inicio de difusión
  targetAudience: text("target_audience"),                 // Público objetivo

  watchers: text("watchers").array(), // User IDs que monitorean el ticket

  // Validation tracking
  validationRequestedAt: timestamp("validation_requested_at"), // When validation was requested

  // Email threading
  emailThreadId: text("email_thread_id"), // Gmail Thread ID (for sender API)
  initialMessageId: text("initial_message_id"), // RFC Message-ID of the first email (for grouping)

  // Closure tracking
  closedBy: text("closed_by"), // 'user' | 'admin' | 'system'
  closedAt: timestamp("closed_at"), // When ticket was closed
  closedByUserId: text("closed_by_user_id").references(() => users.id), // Who closed it (if user/admin)

  // Survey reminder tracking
  surveyReminderSentAt: timestamp("survey_reminder_sent_at"), // When the survey reminder email was sent (at most once)

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const comments = pgTable("comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  userId: text("user_id").notNull().references(() => users.id),
  isInternal: boolean("is_internal").default(false),
  type: text("type").notNull().default("comment"), // 'comment' | 'derivation' | 'system'
  metadata: jsonb("metadata"), // Extra event data (e.g., { providerName, externalCode } for derivations)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- TICKET ATTACHMENTS ---

export const ticketAttachments = pgTable("ticket_attachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: text("mime_type").notNull(),
  driveFileId: text("drive_file_id").notNull(),
  driveViewLink: text("drive_view_link").notNull(),
  uploadToken: text("upload_token"), // null after linked to ticket
  uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONS ---

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tickets.createdById],
    references: [users.id],
    relationName: "createdTickets",
  }),
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
    relationName: "assignedTickets",
  }),
  category: one(ticketCategories, {
    fields: [tickets.categoryId],
    references: [ticketCategories.id],
  }),
  attentionArea: one(attentionAreas, {
    fields: [tickets.attentionAreaId],
    references: [attentionAreas.id],
  }),
  subcategory: one(ticketSubcategories, {
    fields: [tickets.subcategoryId],
    references: [ticketSubcategories.id],
  }),
  comments: many(comments),
  attachments: many(ticketAttachments),
  providerTickets: many(providerTickets),
  satisfactionSurvey: one(satisfactionSurveys),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAttachments.ticketId],
    references: [tickets.id],
  }),
  uploadedBy: one(users, {
    fields: [ticketAttachments.uploadedById],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  createdTickets: many(tickets, { relationName: "createdTickets" }),
  assignedTickets: many(tickets, { relationName: "assignedTickets" }),
  comments: many(comments),
  attentionArea: one(attentionAreas, {
    fields: [users.attentionAreaId],
    references: [attentionAreas.id],
  }),
  requestedProviderTickets: many(providerTickets, { relationName: "requestedProviderTickets" }),
  createdProviderTickets: many(providerTickets, { relationName: "createdProviderTickets" }),
}));

// Configuration tables relations
export const ticketCategoriesRelations = relations(ticketCategories, ({ many, one }) => ({
  subcategories: many(ticketSubcategories),
  tickets: many(tickets),
  attentionArea: one(attentionAreas, {
    fields: [ticketCategories.attentionAreaId],
    references: [attentionAreas.id],
  }),
}));

export const ticketSubcategoriesRelations = relations(ticketSubcategories, ({ one, many }) => ({
  category: one(ticketCategories, {
    fields: [ticketSubcategories.categoryId],
    references: [ticketCategories.id],
  }),
  tickets: many(tickets),
}));


export const attentionAreas = pgTable("attention_area", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // 'TSI', 'FED', 'DIF'
  isActive: boolean("is_active").notNull().default(true),

  // Availability
  isAcceptingTickets: boolean("is_accepting_tickets").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- TICKET SEQUENCE (counter per area + year) ---

export const ticketSequence = pgTable("ticket_sequence", {
  id: serial("id").primaryKey(),
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  year: smallint("year").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
}, (table) => ({
  uniqueAreaYear: unique().on(table.attentionAreaId, table.year),
}));

export const ticketSequenceRelations = relations(ticketSequence, ({ one }) => ({
  attentionArea: one(attentionAreas, {
    fields: [ticketSequence.attentionAreaId],
    references: [attentionAreas.id],
  }),
}));

export const attentionAreasRelations = relations(attentionAreas, ({ many }) => ({
  users: many(users),
  tickets: many(tickets),
  categories: many(ticketCategories),
  sequences: many(ticketSequence),
  priorityConfigs: many(priorityConfig),
  providers: many(providers),
  providerTickets: many(providerTickets),
  satisfactionSurveys: many(satisfactionSurveys),
}));

// --- PRIORITY CONFIG (per area + priority level) ---

export const priorityConfig = pgTable("priority_config", {
  id: serial("id").primaryKey(),
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  description: text("description").notNull(),
  slaHours: integer("sla_hours").notNull(),
}, (table) => ({
  uniqueAreaPriority: unique().on(table.attentionAreaId, table.priority),
}));

export const priorityConfigRelations = relations(priorityConfig, ({ one }) => ({
  attentionArea: one(attentionAreas, {
    fields: [priorityConfig.attentionAreaId],
    references: [attentionAreas.id],
  }),
}));

// --- PROVIDERS ---

export const providers = pgTable("provider", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providersRelations = relations(providers, ({ one, many }) => ({
  attentionArea: one(attentionAreas, {
    fields: [providers.attentionAreaId],
    references: [attentionAreas.id],
  }),
  providerTickets: many(providerTickets),
}));

// --- PROVIDER TICKETS (tickets derivados a proveedores) ---

export const providerTickets = pgTable("provider_ticket", {
  id: serial("id").primaryKey(),
  externalCode: text("external_code").notNull(), // Número de ticket/ID manual del proveedor
  title: text("title").notNull(),
  requestDate: date("request_date").notNull(),
  description: text("description").notNull(),
  requestedById: text("requested_by_id").notNull().references(() => users.id), // Agente que solicita
  status: text("status").notNull().default("en_proceso"), // 'en_proceso' | 'cerrado'
  priority: text("priority"), // 'baja' | 'media' | 'alta' | 'critica' (nullable)
  completionDate: date("completion_date"), // Fecha de atención (para calcular tiempos)
  providerId: integer("provider_id").notNull().references(() => providers.id),
  ticketId: integer("ticket_id").references(() => tickets.id), // Enlace opcional con ticket del sistema
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  createdById: text("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- SATISFACTION SURVEYS ---

export const satisfactionSurveys = pgTable("satisfaction_survey", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id).unique(),
  userId: text("user_id").notNull().references(() => users.id),
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  responseTimeRating: smallint("response_time_rating").notNull(), // 1-5
  communicationRating: smallint("communication_rating").notNull(), // 1-5
  solutionRating: smallint("solution_rating").notNull(), // 1-5
  overallRating: smallint("overall_rating").notNull(), // 1-5
  improvementSuggestion: text("improvement_suggestion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const satisfactionSurveysRelations = relations(satisfactionSurveys, ({ one }) => ({
  ticket: one(tickets, {
    fields: [satisfactionSurveys.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [satisfactionSurveys.userId],
    references: [users.id],
  }),
  attentionArea: one(attentionAreas, {
    fields: [satisfactionSurveys.attentionAreaId],
    references: [attentionAreas.id],
  }),
}));

export const providerTicketsRelations = relations(providerTickets, ({ one }) => ({
  provider: one(providers, {
    fields: [providerTickets.providerId],
    references: [providers.id],
  }),
  ticket: one(tickets, {
    fields: [providerTickets.ticketId],
    references: [tickets.id],
  }),
  requestedBy: one(users, {
    fields: [providerTickets.requestedById],
    references: [users.id],
    relationName: "requestedProviderTickets",
  }),
  createdBy: one(users, {
    fields: [providerTickets.createdById],
    references: [users.id],
    relationName: "createdProviderTickets",
  }),
  attentionArea: one(attentionAreas, {
    fields: [providerTickets.attentionAreaId],
    references: [attentionAreas.id],
  }),
}));

// --- PROVIDER SATISFACTION SURVEYS (evaluación del agente al proveedor) ---

export const providerSatisfactionSurveys = pgTable("provider_satisfaction_survey", {
  id: serial("id").primaryKey(),
  providerTicketId: integer("provider_ticket_id").notNull().references(() => providerTickets.id, { onDelete: 'cascade' }).unique(),
  attentionAreaId: integer("attention_area_id").notNull().references(() => attentionAreas.id),
  submittedById: text("submitted_by_id").notNull().references(() => users.id),
  // 5 preguntas de evaluación (escala 1-5)
  responseTimeRating: smallint("response_time_rating").notNull(),                          // Tiempo de respuesta
  deadlineRating: smallint("deadline_rating").notNull(),                                   // Cumplimiento de plazos
  qualityRating: smallint("quality_rating").notNull(),                                     // Calidad del entregable
  requirementUnderstandingRating: smallint("requirement_understanding_rating").notNull(),  // Comprensión del requerimiento
  attentionRating: smallint("attention_rating").notNull(),                                 // Atención del proveedor
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerSatisfactionSurveysRelations = relations(providerSatisfactionSurveys, ({ one }) => ({
  providerTicket: one(providerTickets, {
    fields: [providerSatisfactionSurveys.providerTicketId],
    references: [providerTickets.id],
  }),
  attentionArea: one(attentionAreas, {
    fields: [providerSatisfactionSurveys.attentionAreaId],
    references: [attentionAreas.id],
  }),
  submittedBy: one(users, {
    fields: [providerSatisfactionSurveys.submittedById],
    references: [users.id],
  }),
}));
