import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, tickets } from "@/db/schema";
import { recordStatusChange } from "@/lib/utils/status-history";
import type { ClosedBy, Ticket, TicketStatus } from "@/types";

type TicketSnapshot = Pick<Ticket,
  "id" | "status" | "createdById" | "attentionAreaId" | "assignedToId" | "validationRequestedAt"
>;

interface TransitionOptions {
  closedBy?: ClosedBy;
  comment?: string;
}

/** Las acciones autorizan el recurso y validan la transición antes de invocarlo. */
export async function transitionTicket(
  expected: TicketSnapshot,
  nextStatus: TicketStatus,
  actorId: string,
  options: TransitionOptions = {},
): Promise<boolean> {
  const now = new Date();
  const closed = nextStatus === "resolved" || nextStatus === "voided";

  return db.transaction(async tx => {
    const updated = await tx.update(tickets).set({
      status: nextStatus,
      updatedAt: now,
      closedAt: closed ? now : null,
      closedBy: closed ? options.closedBy ?? "admin" : null,
      closedByUserId: closed ? actorId : null,
      validationRequestedAt: nextStatus === "pending_validation"
        ? now : closed ? expected.validationRequestedAt : null,
    }).where(and(
      eq(tickets.id, expected.id), eq(tickets.status, expected.status),
      eq(tickets.createdById, expected.createdById),
      expected.attentionAreaId === null ? isNull(tickets.attentionAreaId) : eq(tickets.attentionAreaId, expected.attentionAreaId),
      expected.assignedToId === null ? isNull(tickets.assignedToId) : eq(tickets.assignedToId, expected.assignedToId),
      // El modelo Date conserva milisegundos, incluso si hay datos antiguos con microsegundos.
      expected.validationRequestedAt === null ? isNull(tickets.validationRequestedAt)
        : sql`date_trunc('milliseconds', ${tickets.validationRequestedAt}) = ${expected.validationRequestedAt.toISOString()}::timestamp`,
    )).returning({ id: tickets.id });

    if (updated.length === 0) return false;

    await recordStatusChange(expected.id, expected.status as TicketStatus, nextStatus, actorId, now, tx);
    if (options.comment) {
      await tx.insert(comments).values({
        ticketId: expected.id, userId: actorId, content: options.comment,
        isInternal: false, type: "comment", createdAt: now,
      });
    }
    return true;
  });
}
