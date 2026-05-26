
import { db } from "@/db";
import { tickets, comments, users, priorityConfig, providers, satisfactionSurveys } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { notFound, redirect } from "next/navigation";
import { eq, desc, and } from "drizzle-orm";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateShort, translatePriority, formatFileSize } from "@/lib/utils/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileIcon, ImageIcon, FileTextIcon, FileSpreadsheetIcon, FilmIcon, ExternalLinkIcon, PaperclipIcon,
  MessageSquareIcon, FileText, ChevronDown, Monitor, User, Clock, Calendar, Hash, Tag, ArrowRight, Eye, Activity, Share2, History
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminTicketControls } from "@/components/tickets/admin-ticket-controls";
import { AdminDeleteTicketControl } from "@/components/admin/admin-delete-ticket-control";
import { AgentManagementCollapsible } from "@/components/agent/agent-management-collapsible";
import { Button } from "@/components/ui/button";

import { WatchersManager } from "@/components/tickets/watchers-manager";
import { CancelTicketButton } from "@/components/tickets/cancel-ticket-button";
import { CopyTicketButton } from "@/components/tickets/copy-ticket-button";
import { UserValidationControls } from "@/components/tickets/user-validation-controls";
import { CommentForm } from "@/components/tickets/comment-form";
import { DerivationForm } from "@/components/tickets/derivation-form";
import { TicketAttachmentUploader } from "@/components/tickets/ticket-attachment-uploader";
import { DeleteAttachmentButton } from "@/components/tickets/delete-attachment-button";
import { FloatingSurvey } from "@/components/surveys/pending-survey-banner";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import type { DerivationMetadata } from "@/types";

// Client Components for interactivity
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* --- Helper Components --- */

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  const className = "h-4 w-4 text-muted-foreground shrink-0";
  if (mimeType.startsWith("image/")) return <ImageIcon className={className} />;
  if (mimeType.startsWith("video/")) return <FilmIcon className={className} />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return <FileSpreadsheetIcon className={className} />;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text/"))
    return <FileTextIcon className={className} />;
  return <FileIcon className={className} />;
}

const RichTextEditor = dynamic(
  () => import("@/components/shared/rich-text-editor").then(mod => ({ default: mod.RichTextEditor }))
);

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketCode, code),
    columns: { ticketCode: true, title: true },
  });

  if (!ticket) return { title: "Ticket no encontrado" };

  return { title: `${ticket.ticketCode} - ${ticket.title}` };
}

/* --- Main Page Component --- */

export default async function TicketDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requireAuth();
  const { code } = await params;

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

  // Fetch SLA config for the ticket's priority + area (if both exist)
  let slaInfo: { slaHours: number; description: string } | null = null;
  if (ticket.priority && ticket.attentionAreaId) {
    const config = await db.query.priorityConfig.findFirst({
      where: and(
        eq(priorityConfig.attentionAreaId, ticket.attentionAreaId),
        eq(priorityConfig.priority, ticket.priority),
      ),
      columns: { slaHours: true, description: true },
    });
    slaInfo = config ?? null;
  }

  // Check if satisfaction survey exists (for resolved tickets)
  let hasSurvey = false;
  if (ticket.status === "resolved") {
    const existingSurvey = await db.query.satisfactionSurveys.findFirst({
      where: eq(satisfactionSurveys.ticketId, ticket.id),
      columns: { id: true },
    });
    hasSurvey = !!existingSurvey;
  }

  // Permissions
  const isCreator = ticket.createdById === session.user.id;
  const isWatcher = ticket.watchers?.includes(session.user.id) || false;
  const isAdmin = session.user.role === "admin";
  const isAgentForArea = session.user.role === "agent" && session.user.attentionAreaId === ticket.attentionAreaId;

  if (!isCreator && !isWatcher && !isAdmin && !isAgentForArea) {
    redirect("/dashboard");
  }

  // Data prep
  const allUsers = await db.select({
    id: users.id, name: users.name, email: users.email, image: users.image,
  }).from(users);

  // Fetch providers for derivation form (only for agents/admins)
  let areaProviders: { id: number; name: string }[] = [];
  if ((isAdmin || isAgentForArea) && ticket.attentionAreaId) {
    areaProviders = await db.select({ id: providers.id, name: providers.name })
      .from(providers)
      .where(and(
        eq(providers.attentionAreaId, ticket.attentionAreaId),
        eq(providers.isActive, true),
      ));
  }

  const watchersList = ticket.watchers?.length
    ? allUsers.filter(u => ticket.watchers!.includes(u.id))
    : [];

  const isTicketClosed = ticket.status === 'resolved' || ticket.status === 'voided';
  const canComment = !isTicketClosed;

  return (
    <>
      {/* Floating Validation Controls (outside animated container to preserve fixed positioning) */}
      {ticket.status === 'pending_validation' && ticket.createdById === session.user.id && (
        <UserValidationControls ticketId={ticket.id} />
      )}

      {/* Floating Survey (for resolved tickets without survey, creator only) */}
      {ticket.status === "resolved" && isCreator && !hasSurvey && (
        <FloatingSurvey ticketId={ticket.id} />
      )}

      <div className="mx-auto max-w-[1600px] space-y-8 pb-36 animate-in fade-in duration-500">

        {/* Top Navigation */}
        <div>
          <Breadcrumb items={[{ label: ticket.ticketCode }]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">

          {/* LEFT COLUMN: Main Content */}
          <div className="min-w-0 space-y-4">

            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
                  {ticket.title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  {ticket.priority && <PriorityBadge priority={ticket.priority} />}
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

            {/* Main Content - Description & Attachments */}
            <div className="ml-1">

              <div className="rounded-xl border border-border bg-card">
                <div className="px-6 pt-5 pb-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Descripción
                  </h3>
                  <div className="prose prose-zinc dark:prose-invert max-w-none">
                    <RichTextEditor
                      value={ticket.description}
                      disabled={true}
                      className="border-0 px-0 bg-transparent min-h-0 shadow-none focus-within:ring-0 text-sm leading-relaxed"
                    />
                  </div>
                </div>
                {ticket.attachments && ticket.attachments.length > 0 && ticket.attentionArea?.slug !== "DIF" && (
                  <>
                    <div className="mx-6 border-t border-border" />
                    <div className="px-6 pt-4 pb-6 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium">Archivos adjuntos</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                        {ticket.attachments.map((file) => {
                          const canDelete = isAdmin || isAgentForArea || file.uploadedById === session.user.id;
                          return (
                            <div
                              key={file.id}
                              className="group flex items-start p-3 rounded-lg border bg-background/50 hover:bg-accent/50 hover:border-accent-foreground/20 transition-all relative overflow-hidden"
                            >
                              {/* Main Content (Clickable) */}
                              <a
                                href={file.driveViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 flex-1 min-w-0 focus:outline-hidden"
                              >
                                <div className="bg-muted p-2.5 rounded-md shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                                  <AttachmentIcon mimeType={file.mimeType} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:underline decoration-muted-foreground/50 underline-offset-4 text-foreground">
                                    {file.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.fileSize)}
                                  </p>
                                  {file.uploadedBy && (
                                    <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                                      Por <span className="font-medium">{file.uploadedBy.name}</span>
                                    </p>
                                  )}
                                </div>
                              </a>

                              {/* Actions Column */}
                              <div className="flex flex-col gap-1 pl-2 ml-2 border-l border-border/40 justify-center min-h-[40px]">
                                {canDelete && (
                                  <DeleteAttachmentButton
                                    attachmentId={file.id}
                                    ticketId={ticket.id}
                                    fileName={file.fileName}
                                  />
                                )}
                                <a
                                  href={file.driveViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                  title="Ver documento"
                                >
                                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>


            </div>


            {/* Activity / Comments */}
            <div className="space-y-6 pt-4">
              {/* Nuevo Comentario (Siempre visible) */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <MessageSquareIcon className="w-4 h-4" />
                  Añadir comentario
                </h3>
                {canComment ? (
                  <div className="bg-card w-full border border-border/80 shadow-xs rounded-xl focus-within:shadow-md focus-within:border-primary/50 transition-all overflow-hidden relative">
                    <CommentForm ticketId={ticket.id} />
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 mb-1">
                      <MessageSquareIcon className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                    Este ticket ha sido cerrado y ya no admite comentarios.
                  </div>
                )}
              </div>

              {ticket.comments.length > 0 && (
                <div className="pt-2">
                  <Collapsible defaultOpen className="space-y-6">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group cursor-pointer select-none">
                        <Activity className="w-3.5 h-3.5" />
                        Historial de actividad
                        <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <span className="text-xs text-muted-foreground bg-muted border px-2.5 py-0.5 rounded-full">{ticket.comments.length}</span>
                    </div>

                    <CollapsibleContent>
                      {/* Timeline */}
                      <div className="space-y-6 relative pl-2">
                        {/* Line connector */}
                        {ticket.comments.length > 0 && (
                          <div className="absolute left-[26px] top-4 bottom-4 w-px bg-linear-to-b from-border/80 via-border/40 to-transparent" />
                        )}

                        {ticket.comments.map((entry) => {
                          const entryType = (entry.type as string) || 'comment';

                          // --- Derivation banner ---
                          if (entryType === 'derivation') {
                            const meta = entry.metadata as DerivationMetadata | null;
                            return (
                              <div key={entry.id} className="relative pl-12 group">
                                {/* Icon */}
                                <div className="absolute left-0 top-0 z-10">
                                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 ring-4 ring-background flex items-center justify-center shadow-sm">
                                    <Share2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  </div>
                                </div>

                                {/* Derivation Body */}
                                <div className={cn("space-y-2", !(meta?.note || meta?.estimatedDate) && "min-h-10 flex items-center")}>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
                                      Derivado a {meta?.providerName || 'Desconocido'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                                  </div>
                                  {(meta?.note || meta?.estimatedDate) && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300 group-hover:border-amber-300 dark:group-hover:border-amber-700 transition-colors space-y-1.5">
                                      {meta?.estimatedDate && (
                                        <p className="font-medium text-xs">Fecha estimada de atención: <strong>{formatDateShort(meta.estimatedDate)}</strong></p>
                                      )}
                                      {meta?.note && (
                                        <p className="leading-relaxed">{meta.note}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          // --- System event (grey text) ---
                          if (entryType === 'system') {
                            return (
                              <div key={entry.id} className="relative pl-12 group">
                                {/* Icon */}
                                <div className="absolute left-0 top-0 z-10">
                                  <div className="h-10 w-10 rounded-full bg-muted ring-4 ring-background flex items-center justify-center shadow-sm">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>

                                {/* System Body */}
                                <div className="flex items-baseline gap-2 min-h-10 pt-2.5">
                                  <span className="text-xs text-muted-foreground">
                                    <span className="font-medium">{entry.author.name}</span>
                                    {' — '}
                                    <span dangerouslySetInnerHTML={{ __html: entry.content }} />
                                  </span>
                                  <span className="text-xs text-muted-foreground/60">{formatDate(entry.createdAt)}</span>
                                </div>
                              </div>
                            );
                          }

                          // --- Regular comment (default) ---
                          return (
                            <div key={entry.id} className="relative pl-12 group">
                              {/* Avatar */}
                              <div className="absolute left-0 top-0 z-10">
                                <UserAvatar
                                  name={entry.author.name}
                                  image={entry.author.image}
                                  size="md"
                                  className="ring-4 ring-background h-10 w-10 shadow-sm"
                                />
                              </div>

                              {/* Comment Body */}
                              <div className="space-y-2">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-semibold text-foreground">{entry.author.name}</span>
                                  <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                                </div>
                                <div className="bg-sidebar border border-border/50 rounded-xl px-4 py-2 text-sm text-foreground shadow-sm group-hover:border-border/80 transition-colors">
                                  <RichTextEditor
                                    value={entry.content}
                                    disabled={true}
                                    className="border-0 px-0 bg-transparent min-h-0 p-0 shadow-none"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* Empty State */}
              {ticket.comments.length === 0 && (
                <div className="text-center py-10 px-4 border border-dashed border-border/60 rounded-xl bg-muted/5">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                    <Activity className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">Sin actividad aún</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                    Añade un comentario arriba para iniciar la conversación. Al enviarlo, se registrará aquí en el historial.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Context Sidebar */}
          <div className="sticky top-6 lg:border-l lg:pl-10 border-border/60">

            {/* Ticket Details */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" />
                  Detalles
                </h3>

                {/* Assigned To */}
                <div className="bg-sidebar border border-border/50 rounded-xl p-4 group">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                    <User className="w-3 h-3" />
                    Responsable
                  </label>
                  {ticket.assignedTo ? (
                    <div className="flex items-center gap-2.5 rounded-md transition-colors cursor-default">
                      <UserAvatar name={ticket.assignedTo.name} image={ticket.assignedTo.image} size="xs" className="h-6 w-6" />
                      <span className="text-sm font-medium text-foreground">{ticket.assignedTo.name}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Sin asignar</div>
                  )}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="bg-sidebar border border-border/50 rounded-xl p-4 grid grid-cols-1 gap-y-4">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Categoría</label>
                  <div className="text-sm font-medium text-foreground">{ticket.category?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ticket.subcategory?.name}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Área</label>
                    <div className="text-sm text-foreground">{ticket.attentionArea?.name || "—"}</div>
                  </div>
                  {slaInfo && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3" />
                        SLA estimado
                      </label>
                      <div className="text-sm text-foreground">
                        {slaInfo.slaHours < 24
                          ? `${slaInfo.slaHours} hora${slaInfo.slaHours !== 1 ? "s" : ""}`
                          : `${Math.floor(slaInfo.slaHours / 24)} día${Math.floor(slaInfo.slaHours / 24) !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campos específicos de Difusión */}
              {ticket.attentionArea?.slug === "DIF" && (ticket.activityStartDate || ticket.desiredDiffusionDate || ticket.targetAudience) && (
                <div className="bg-sidebar border border-border/50 rounded-xl p-4 grid grid-cols-1 gap-y-4">
                  {ticket.activityStartDate && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Fecha de inicio de actividad</label>
                      <div className="text-sm text-foreground">{formatDateShort(ticket.activityStartDate)}</div>
                    </div>
                  )}
                  {ticket.desiredDiffusionDate && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Fecha deseada de difusión</label>
                      <div className="text-sm text-foreground">{formatDateShort(ticket.desiredDiffusionDate)}</div>
                    </div>
                  )}
                  {ticket.targetAudience && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Público objetivo</label>
                      <div className="text-sm text-foreground">{ticket.targetAudience}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Watchers */}
              <div className="bg-sidebar border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    Usuarios notificados
                  </label>
                  {!isTicketClosed && (
                    <WatchersManager
                      ticketId={ticket.id}
                      currentWatchers={ticket.watchers || []}
                      currentUserId={session.user.id}
                      allUsers={allUsers}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {watchersList.length > 0 ? watchersList.map(watcher => (
                    <div key={watcher.id} className="flex items-center gap-2 text-sm" title={watcher.email}>
                      <UserAvatar name={watcher.name} image={watcher.image} size="xs" className="h-6 w-6" />
                      <span className="text-foreground/90 font-medium truncate">{watcher.name}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground/60 italic">No hay usuarios notificados</p>
                  )}
                </div>
              </div>

              {/* Bitácora — solo visible para agentes y admins */}
              {(isAdmin || isAgentForArea) && (() => {
                const systemEvents = ticket.comments
                  .filter(c => c.type === 'system')
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                return (
                  <div className="bg-sidebar border border-border/50 rounded-xl p-4 space-y-3">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      Bitácora
                    </label>
                    <div className="space-y-0 relative">
                      {/* Línea conectora */}
                      {(systemEvents.length > 0) && (
                        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />
                      )}

                      {/* Evento de creación */}
                      <div className="relative pl-5 py-1.5 group">
                        <div className="absolute left-0 top-[9px] h-[11px] w-[11px] rounded-full bg-primary/20 border-2 border-primary ring-2 ring-background" />
                        <p className="text-xs text-foreground font-medium">Ticket creado</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(ticket.createdAt)}</p>
                      </div>

                      {/* Eventos del sistema */}
                      {systemEvents.map((event) => (
                        <div key={event.id} className="relative pl-5 py-1.5 group">
                          <div className="absolute left-0 top-[9px] h-[11px] w-[11px] rounded-full bg-muted border-2 border-muted-foreground/30 ring-2 ring-background" />
                          <p className="text-xs text-foreground/90" dangerouslySetInnerHTML={{ __html: event.content }} />
                          <p className="text-[10px] text-muted-foreground">{formatDate(event.createdAt)}</p>
                        </div>
                      ))}

                      {systemEvents.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 italic pl-5">Sin cambios registrados</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Attachment Uploader — only for open tickets, not for Difusión */}
              {!isTicketClosed && ticket.attentionArea?.slug !== "DIF" && (
                <div className="mb-4">
                  <TicketAttachmentUploader ticketId={ticket.id} />
                </div>
              )}

              {/* Cancellation Action for Creator */}
              {isCreator && !isTicketClosed && (
                <>
                  <div>
                    <CancelTicketButton ticketId={ticket.id} />
                  </div>
                </>
              )}

              {/* Delete Action for Admin */}
              {isAdmin && (
                <div className="pt-2">
                  <AdminDeleteTicketControl ticketId={ticket.id} isAdmin={isAdmin} />
                </div>
              )}

              {/* Closure Info (if applicable) */}
              {ticket.status === 'resolved' && ticket.closedBy && (
                <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Resuelto</span>
                  </div>
                  <p className="text-xs text-green-600/80 dark:text-green-500/80">
                    Cerrado por {ticket.closedBy === 'user' ? 'usuario' : ticket.closedBy === 'admin' ? 'admin' : 'sistema'} el {formatDate(ticket.closedAt!)}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div >
      </div >

      {/* Floating Action Bar - Agent Controls */}
      {(!isAdmin && isAgentForArea) && (
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
                      <Share2 className="h-5 w-5" />
                      <span className="text-xs whitespace-normal text-center">Registrar derivación</span>
                    </Button>
                  }
                />
              ) : undefined
            }
          />
        </AgentManagementCollapsible>
      )}
    </>
  );
}
