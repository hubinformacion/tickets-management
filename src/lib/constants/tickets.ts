import type { TicketStatus, TicketPriority, ClosedBy, ProviderTicketStatus, ProviderTicketPriority, CommentType, SurveyRating } from "@/types";

// ============================================
// Ticket Status Constants
// ============================================

export const TICKET_STATUS: Record<string, TicketStatus> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING_VALIDATION: 'pending_validation',
  RESOLVED: 'resolved',
  VOIDED: 'voided',
} as const;

// ============================================
// Ticket Priority Constants
// ============================================

const TICKET_PRIORITY: Record<string, TicketPriority> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// ============================================
// Closure Type Constants
// ============================================

export const CLOSURE_TYPE: Record<string, ClosedBy> = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

// ============================================
// Validation Constants
// ============================================

export const VALIDATION_TIMEOUT_HOURS = 48;

// ============================================
// Status Translations
// ============================================

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  pending_validation: "Pendiente de validación",
  resolved: "Resuelto",
  voided: "Anulado",
};

// Slugs en español para URLs (valor URL → valor BD)
export const STATUS_URL_TO_DB: Record<string, TicketStatus> = {
  abierto: 'open',
  en_progreso: 'in_progress',
  pendiente_validacion: 'pending_validation',
  resuelto: 'resolved',
  anulado: 'voided',
};

// Slugs en español para URLs (valor BD → valor URL)
export const STATUS_DB_TO_URL: Record<TicketStatus, string> = {
  open: 'abierto',
  in_progress: 'en_progreso',
  pending_validation: 'pendiente_validacion',
  resolved: 'resuelto',
  voided: 'anulado',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const CLOSURE_TYPE_LABELS: Record<ClosedBy, string> = {
  user: "Usuario",
  admin: "Administrador",
  system: "Sistema (48hrs)",
};

// ============================================
// Valid Status Transitions
// ============================================

export const VALID_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ['in_progress', 'voided'],
  in_progress: ['open', 'pending_validation', 'resolved', 'voided'],
  pending_validation: ['resolved', 'in_progress'],
  resolved: ['in_progress'],
  voided: ['open', 'in_progress'],
};

// ============================================
// Provider Ticket Constants
// ============================================

const PROVIDER_TICKET_STATUS: Record<string, ProviderTicketStatus> = {
  EN_PROCESO: 'en_proceso',
  CERRADO: 'cerrado',
} as const;

export const PROVIDER_TICKET_STATUS_LABELS: Record<ProviderTicketStatus, string> = {
  en_proceso: "En proceso",
  cerrado: "Cerrado",
};

const PROVIDER_TICKET_PRIORITY: Record<string, ProviderTicketPriority> = {
  LOW: 'baja',
  MEDIUM: 'media',
  HIGH: 'alta',
  CRITICAL: 'critica',
} as const;

export const PROVIDER_TICKET_PRIORITY_LABELS: Record<ProviderTicketPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const PROVIDER_TICKET_PRIORITY_STYLES: Record<ProviderTicketPriority, string> = {
  baja: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  media: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  alta: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critica: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ============================================
// Comment / Activity Type Constants
// ============================================

const COMMENT_TYPE: Record<string, CommentType> = {
  COMMENT: 'comment',
  DERIVATION: 'derivation',
  SYSTEM: 'system',
} as const;

const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  comment: "Comentario",
  derivation: "Derivación",
  system: "Sistema",
};

// ============================================
// Satisfaction Survey Constants
// ============================================

export const SURVEY_QUESTIONS = [
  { key: "responseTimeRating", label: "Tiempo de respuesta", lowLabel: "Muy lento", highLabel: "Muy rápido" },
  { key: "communicationRating", label: "Comunicación y orientación", lowLabel: "Nada clara", highLabel: "Muy clara" },
  { key: "solutionRating", label: "Solución recibida", lowLabel: "No lo resolvió", highLabel: "Completa" },
  { key: "overallRating", label: "Satisfacción general", lowLabel: "Nada satisfecho", highLabel: "Muy satisfecho" },
] as const;

export const SURVEY_RATING_STYLES: Record<SurveyRating, string> = {
  1: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/60",
  2: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/60",
  3: "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-950/60",
  4: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/60",
  5: "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/60",
};

export const SURVEY_RATING_SELECTED_STYLES: Record<SurveyRating, string> = {
  1: "bg-red-500 text-white border-red-600 hover:bg-red-500 dark:bg-red-600 dark:text-white dark:border-red-500 dark:hover:bg-red-600",
  2: "bg-orange-500 text-white border-orange-600 hover:bg-orange-500 dark:bg-orange-600 dark:text-white dark:border-orange-500 dark:hover:bg-orange-600",
  3: "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-500 dark:bg-yellow-600 dark:text-white dark:border-yellow-500 dark:hover:bg-yellow-600",
  4: "bg-green-500 text-white border-green-600 hover:bg-green-500 dark:bg-green-600 dark:text-white dark:border-green-500 dark:hover:bg-green-600",
  5: "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:text-white dark:border-emerald-500 dark:hover:bg-emerald-600",
};

// ============================================
// Provider Satisfaction Survey Constants
// ============================================

export const PROVIDER_SURVEY_QUESTIONS = [
  { key: "responseTimeRating", label: "Tiempo de respuesta", lowLabel: "Muy lento", highLabel: "Muy rápido" },
  { key: "deadlineRating", label: "Cumplimiento de plazos", lowLabel: "Nunca cumple", highLabel: "Siempre puntual" },
  { key: "qualityRating", label: "Calidad del entregable", lowLabel: "Muy deficiente", highLabel: "Excelente" },
  { key: "requirementUnderstandingRating", label: "Comprensión del requerimiento", lowLabel: "Nada clara", highLabel: "Totalmente" },
  { key: "attentionRating", label: "Atención y comunicación", lowLabel: "Muy mala", highLabel: "Muy buena" },
] as const;

