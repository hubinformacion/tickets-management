import { db } from "@/db";
import { tickets, users, satisfactionSurveys, attentionAreas } from "@/db/schema";
import { lt, and, eq, gte, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendSurveyReminderEmail } from "@/lib/email/send-emails";

export const dynamic = 'force-dynamic';

/**
 * Send survey reminder emails for tickets closed ~24h ago without a satisfaction survey.
 * This endpoint is called by Vercel Cron daily at 13:00 UTC (08:00 UTC-5).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Window: tickets closed between ~23h and ~25h ago
    const lowerBound = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const upperBound = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    // Find resolved tickets closed in the window without a survey and without a prior reminder
    const candidates = await db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        title: tickets.title,
        closedAt: tickets.closedAt,
        createdById: tickets.createdById,
        attentionAreaId: tickets.attentionAreaId,
        emailThreadId: tickets.emailThreadId,
        initialMessageId: tickets.initialMessageId,
      })
      .from(tickets)
      .leftJoin(satisfactionSurveys, eq(satisfactionSurveys.ticketId, tickets.id))
      .where(
        and(
          eq(tickets.status, 'resolved'),
          gte(tickets.closedAt, lowerBound),
          lt(tickets.closedAt, upperBound),
          isNull(satisfactionSurveys.id),
          isNull(tickets.surveyReminderSentAt)
        )
      );

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickets to send survey reminders',
        count: 0,
      });
    }

    let sentCount = 0;

    for (const ticket of candidates) {
      try {
        // Fetch creator, agents for area, and watchers in parallel
        const [creator, agents, attentionArea] = await Promise.all([
          db.query.users.findFirst({
            where: eq(users.id, ticket.createdById),
            columns: { name: true, email: true },
          }),
          db.select({ email: users.email })
            .from(users)
            .where(
              and(
                eq(users.role, 'agent'),
                eq(users.attentionAreaId, ticket.attentionAreaId!)
              )
            ),
          db.query.attentionAreas.findFirst({
            where: eq(attentionAreas.id, ticket.attentionAreaId!),
            columns: { name: true },
          }),
        ]);

        if (!creator) continue;

        const agentEmails = agents.map(a => a.email);

        await sendSurveyReminderEmail({
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode,
          title: ticket.title,
          creatorEmail: creator.email,
          creatorName: creator.name,
          agentEmails,
          watcherEmails: [],
          attentionAreaName: attentionArea?.name || 'Hub de Información',
          closedAt: ticket.closedAt!,
          emailThreadId: ticket.emailThreadId,
          initialMessageId: ticket.initialMessageId,
        });

        // Mark reminder as sent to prevent future duplicates
        await db.update(tickets)
          .set({ surveyReminderSentAt: now })
          .where(eq(tickets.id, ticket.id));

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send survey reminder for ticket ${ticket.ticketCode}:`, emailError);
      }
    }

    console.log(`Sent ${sentCount} survey reminder(s) for ${candidates.length} candidate(s)`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} survey reminder(s)`,
      count: sentCount,
      candidates: candidates.length,
    });
  } catch (error) {
    console.error('Error in survey-reminder cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
