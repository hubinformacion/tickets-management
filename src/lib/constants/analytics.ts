export const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  pending_validation: "#a855f7",
  resolved: "#22c55e",
  voided: "#94a3b8",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  pending_validation: "Pendiente validación",
  resolved: "Resuelto",
  voided: "Anulado",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const AREA_COLORS: Record<string, string> = {
  TSI: "#3b82f6",
  DIF: "#a855f7",
  FED: "#f59e0b",
};

export const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export const DATE_RANGE_OPTIONS = [
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mes" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Último año" },
  { value: "all", label: "Todo" },
] as const;
