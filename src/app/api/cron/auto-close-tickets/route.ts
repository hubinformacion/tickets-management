import { db } from "@/db";
import { tickets } from "@/db/schema";
import { lt, and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TICKET_STATUS, CLOSURE_TYPE, VALIDATION_TIMEOUT_HOURS } from "@/lib/constants/tickets";
import { recordStatusChange } from "@/lib/utils/status-history";

export const dynamic = 'force-dynamic';

/**
 * Auto-close tickets that have been pending validation for more than 48 hours
 * This endpoint is called by Vercel Cron daily at 00:00 UTC
 */
export async function GET(request: Request) {
  try {
    // Verificar que la solicitud viene de Vercel Cron usando CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - VALIDATION_TIMEOUT_HOURS * 60 * 60 * 1000);

    // Find tickets pending validation for more than 48 hours
    const ticketsToClose = await db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        validationRequestedAt: tickets.validationRequestedAt,
        assignedToId: tickets.assignedToId,
        createdById: tickets.createdById,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.status, TICKET_STATUS.PENDING_VALIDATION),
          lt(tickets.validationRequestedAt, cutoffTime)
        )
      );

    if (ticketsToClose.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickets to auto-close',
        count: 0,
      });
    }

    // Close all identified tickets
    const ticketIds = ticketsToClose.map(t => t.id);

    await db.update(tickets)
      .set({
        status: TICKET_STATUS.RESOLVED,
        closedBy: CLOSURE_TYPE.SYSTEM,
        closedAt: now,
        updatedAt: now,
      })
      .where(inArray(tickets.id, ticketIds));

    // Registrar cambios de estado en historial
    for (const t of ticketsToClose) {
      const systemUserId = t.assignedToId || t.createdById;
      await recordStatusChange(t.id, TICKET_STATUS.PENDING_VALIDATION, TICKET_STATUS.RESOLVED, systemUserId, now);
    }

    console.log(`Auto-closed ${ticketsToClose.length} tickets:`, ticketsToClose.map(t => t.ticketCode));

    return NextResponse.json({
      success: true,
      message: `Successfully auto-closed ${ticketsToClose.length} ticket(s)`,
      count: ticketsToClose.length,
      closedTickets: ticketsToClose.map(t => ({
        id: t.id,
        code: t.ticketCode,
        validationRequestedAt: t.validationRequestedAt,
      })),
    });
  } catch (error) {
    console.error('Error in auto-close cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
