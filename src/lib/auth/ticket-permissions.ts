import { getFedFieldConfig } from "@/lib/constants/fed-fields";
import type { AppUser } from "@/types";

type TicketUser = Pick<AppUser, "id" | "role" | "isActive" | "attentionAreaId">;

interface TicketArea {
  attentionAreaId: number | null;
}

interface TicketParticipation extends TicketArea {
  createdById: string;
  watchers: string[] | null;
}

function isActiveUser(user: TicketUser): boolean {
  return user.isActive && ["user", "agent", "admin"].includes(user.role);
}

export function canManageTicket(user: TicketUser, ticket: TicketArea): boolean {
  if (!isActiveUser(user)) return false;
  return user.role === "admin" || (
    user.role === "agent" &&
    Number.isInteger(user.attentionAreaId) &&
    (user.attentionAreaId ?? 0) > 0 &&
    user.attentionAreaId === ticket.attentionAreaId
  );
}

export function canReadTicket(user: TicketUser, ticket: TicketParticipation): boolean {
  if (!isActiveUser(user)) return false;
  return canManageTicket(user, ticket) || ticket.createdById === user.id ||
    (ticket.watchers?.includes(user.id) ?? false);
}

export function canManageTicketWatchers(user: TicketUser, ticket: TicketParticipation): boolean {
  return isActiveUser(user) && (ticket.createdById === user.id || canManageTicket(user, ticket));
}

export function areTicketAttachmentsAllowed(areaSlug: string | undefined, subcategoryName?: string): boolean {
  if (areaSlug === "TSI") return true;
  if (areaSlug !== "FED" || !subcategoryName) return false;
  return getFedFieldConfig(subcategoryName)?.allowAttachments === true;
}
