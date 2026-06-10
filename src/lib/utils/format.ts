import { PRIORITY_LABELS } from "@/lib/constants/tickets";
import type { TicketPriority } from "@/types";

export { formatDate, formatDateShort } from "./date";

export function translatePriority(priority: string): string {
  return PRIORITY_LABELS[priority as TicketPriority] || priority;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
