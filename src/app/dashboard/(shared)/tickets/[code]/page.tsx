
import { db } from "@/db";
import { tickets, comments, users, priorityConfig, providers, satisfactionSurveys } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { notFound, redirect } from "next/navigation";
import { eq, desc, and } from "drizzle-orm";
import { formatDate } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Hash, Calendar, User } from "lucide-react";
import { AdminTicketControls } from "@/components/tickets/admin-ticket-controls";
import { AgentManagementCollapsible } from "@/components/agent/agent-management-collapsible";
import { Button } from "@/components/ui/button";
import { CopyTicketButton } from "@/components/tickets/copy-ticket-button";
import { UserValidationControls } from "@/components/tickets/user-validation-controls";
import { DerivationForm } from "@/components/tickets/derivation-form";
import { FloatingSurvey } from "@/components/surveys/pending-survey-banner";
import { TicketAttachments } from "@/components/tickets/ticket-attachments";
import { TicketActivity } from "@/components/tickets/ticket-activity";
import { TicketSidebar } from "@/components/tickets/ticket-sidebar";
import type { Metadata } from "next";
import type { DerivationMetadata } from "@/types";
import { TicketDescription } from "@/components/tickets/ticket-description";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketCode, code),
    columns: { ticketCode: true, title: true },
  });

  if (!ticket) return { title: "Ticket no encontrado" };

  return { title: `${ticket.ticketCode} - ${ticket.title}` };
}

export default async function TicketDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const [session, { code }, allUsers] = await Promise.all([
    requireAuth(),
    params,
    db.select({
      id: users.id, name: users.name, email: users.email, image: users.image,
    }).from(users)
  ]);

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketCode, code),
    with: {
      createdBy: true,
      category: true,
      subcategory: true,
      attentionArea: true,
      assignedTo: true,
      attachments: {
        with: { uploadedBy: true },
        orderBy: (a, { asc }) => [asc(a.createdAt)],
      },
      comments: {
        with: { author: true },
        orderBy: [desc(comments.createdAt)]
      }
    }
  });

  if (!ticket) notFound();

  const isCreator = ticket.createdById === session.user.id;
  const isWatcher = ticket.watchers?.includes(session.user.id) || false;
  const isAdmin = session.user.role === "admin";
  const isAgentForArea = session.user.role === "agent" && session.user.attentionAreaId === ticket.attentionAreaId;

  if (!isCreator && !isWatcher && !isAdmin && !isAgentForArea) {
    redirect("/dashboard");
  }

  let slaInfo: { slaHours: number; description: string } | null = null as { slaHours: number; description: string } | null;
  let hasSurvey = false;
  let areaProviders: { id: number; name: string }[] = [];

  const dependentPromises: Promise<void>[] = [];

  if (ticket.priority && ticket.attentionAreaId) {
    dependentPromises.push(
      db.query.priorityConfig.findFirst({
        where: and(
          eq(priorityConfig.attentionAreaId, ticket.attentionAreaId),
          eq(priorityConfig.priority, ticket.priority),
        ),
        columns: { slaHours: true, description: true },
      }).then(config => {
        slaInfo = config ?? null;
      })
    );
  }

  if (ticket.status === "resolved") {
    dependentPromises.push(
      db.query.satisfactionSurveys.findFirst({
        where: eq(satisfactionSurveys.ticketId, ticket.id),
        columns: { id: true },
      }).then(existingSurvey => {
        hasSurvey = !!existingSurvey;
      })
    );
  }

  if ((isAdmin || isAgentForArea) && ticket.attentionAreaId) {
    dependentPromises.push(
      db.select({ id: providers.id, name: providers.name })
        .from(providers)
        .where(and(
          eq(providers.attentionAreaId, ticket.attentionAreaId),
          eq(providers.isActive, true),
        )).then(providersList => {
          areaProviders = providersList;
        })
    );
  }

  await Promise.all(dependentPromises);

  const watchersList = ticket.watchers?.length
    ? allUsers.filter(u => ticket.watchers!.includes(u.id))
    : [];

  const isTicketClosed = ticket.status === 'resolved' || ticket.status === 'voided';
  const canComment = !isTicketClosed;

  return (
    <>
      {ticket.status === 'pending_validation' && ticket.createdById === session.user.id ? (
        <UserValidationControls ticketId={ticket.id} />
      ) : null}

      {ticket.status === "resolved" && isCreator && !hasSurvey ? (
        <FloatingSurvey ticketId={ticket.id} />
      ) : null}

      <div className="mx-auto max-w-[1600px] space-y-8 pb-36 animate-in fade-in duration-500">
        <div>
          <Breadcrumb items={[{ label: ticket.ticketCode }]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
          <div className="min-w-0 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
                  {ticket.title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  {ticket.priority ? <PriorityBadge priority={ticket.priority} /> : null}
                  <CopyTicketButton ticketCode={ticket.ticketCode} title={ticket.title} />
                </div>
                <span className="flex items-center gap-1.5 font-mono text-xs bg-muted/50 px-2 py-0.5 rounded border">
                  <Hash className="w-3 h-3 text-muted-foreground/70" />
                  {ticket.ticketCode}
                </span>
                <span className="flex items-center gap-2">
                  <UserAvatar name={ticket.createdBy.name} image={ticket.createdBy.image} size="xs" />
                  <span className="text-foreground font-medium">{ticket.createdBy.name}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground/80">
                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                  <span className="font-medium text-muted-foreground">Creado el:</span> {formatDate(ticket.createdAt)}
                </span>
              </div>
            </div>

            <div className="ml-1">
              <div className="rounded-xl border border-border bg-card">
                <div className="px-6 pt-5 pb-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Descripción
                  </h3>
                  <TicketDescription content={ticket.description || ""} />
                </div>
                {ticket.attachments && ticket.attentionArea?.slug !== "DIF" ? (
                  <TicketAttachments
                    attachments={ticket.attachments}
                    ticketId={ticket.id}
                    isAdmin={isAdmin}
                    isAgentForArea={isAgentForArea}
                    currentUserId={session.user.id}
                  />
                ) : null}
              </div>
            </div>

            <TicketActivity
              ticketId={ticket.id}
              comments={ticket.comments}
              canComment={canComment}
              isTicketClosed={isTicketClosed}
            />
          </div>

          <TicketSidebar
            ticket={ticket}
            slaInfo={slaInfo}
            allUsers={allUsers}
            watchersList={watchersList}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            isAgentForArea={isAgentForArea}
            isCreator={isCreator}
            isTicketClosed={isTicketClosed}
          />
        </div>
      </div>

      {!isAdmin && isAgentForArea ? (
        <AgentManagementCollapsible>
          <AdminTicketControls
            ticketId={ticket.id}
            currentStatus={ticket.status}
            isAssigned={!!ticket.assignedToId}
            derivationSlot={
              canComment && areaProviders.length > 0 ? (
                <DerivationForm
                  ticketId={ticket.id}
                  providers={areaProviders}
                  customTrigger={
                    <Button
                      variant="outline"
                      className="w-full flex-1 min-h-[80px] flex-col gap-2 rounded-xl"
                    >
                      <span className="text-xs whitespace-normal text-center">Registrar derivación</span>
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        </AgentManagementCollapsible>
      ) : null}
    </>
  );
}
