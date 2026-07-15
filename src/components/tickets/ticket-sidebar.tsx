"use client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { WatchersManager } from "@/components/tickets/watchers-manager";
import { TicketAttachmentUploader } from "@/components/tickets/ticket-attachment-uploader";
import { CancelTicketButton } from "@/components/tickets/cancel-ticket-button";
import { AdminDeleteTicketControl } from "@/components/admin/admin-delete-ticket-control";
import { formatDateShort } from "@/lib/utils/format";
import { User, Clock, Tag, Eye, ExternalLink } from "lucide-react";
import type { FedMetadata } from "@/types";

interface SlaInfo {
  slaHours: number;
  description: string;
}

interface TicketSidebarProps {
  ticket: {
    id: number;
    assignedTo?: { name: string; image?: string | null } | null;
    assignedToId?: string | null;
    category?: { name: string } | null;
    subcategory?: { name: string } | null;
    attentionArea?: { name: string; slug?: string } | null;
    priority?: string | null;
    watchers?: string[] | null;
    status: string;
    activityStartDate?: string | null;
    desiredDiffusionDate?: string | null;
    targetAudience?: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignedAt?: Date | null;
    validationRequestedAt?: Date | null;
    closedAt?: Date | null;
    closedBy?: string | null;
    metadata?: unknown;
  };
  slaInfo: SlaInfo | null;
  allUsers: { id: string; name: string; email: string; image: string | null }[];
  watchersList: { id: string; name: string; email: string; image: string | null }[];
  currentUserId: string;
  isAdmin: boolean;
  isCreator: boolean;
  isTicketClosed: boolean;
}

export function TicketSidebar({
  ticket,
  slaInfo,
  allUsers,
  watchersList,
  currentUserId,
  isAdmin,
  isCreator,
  isTicketClosed,
}: TicketSidebarProps) {
  return (
    <div className="sticky top-6 lg:border-l lg:pl-10 border-border/60">
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            Detalles
          </h3>

          <div className="bg-sidebar border border-border/50 rounded-xl p-4 group">
            <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
              <User className="w-3 h-3" />
              Responsable
            </span>
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

        <div className="bg-sidebar border border-border/50 rounded-xl p-4 grid grid-cols-1 gap-y-4">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Categoría</span>
            <div className="text-sm font-medium text-foreground">{ticket.category?.name || "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{ticket.subcategory?.name}</div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Área</span>
              <div className="text-sm text-foreground">{ticket.attentionArea?.name || "—"}</div>
            </div>
            {slaInfo ? (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3" />
                  SLA estimado
                </span>
                <div className="text-sm text-foreground">
                  {slaInfo.slaHours < 24
                    ? `${slaInfo.slaHours} hora${slaInfo.slaHours !== 1 ? "s" : ""}`
                    : `${Math.floor(slaInfo.slaHours / 24)} día${Math.floor(slaInfo.slaHours / 24) !== 1 ? "s" : ""}`}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {ticket.attentionArea?.slug === "DIF" && (ticket.activityStartDate || ticket.desiredDiffusionDate || ticket.targetAudience) ? (
          <div className="bg-sidebar border border-border/50 rounded-xl p-4 grid grid-cols-1 gap-y-4">
            {ticket.activityStartDate ? (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Fecha de inicio de actividad</span>
                <div className="text-sm text-foreground">{formatDateShort(ticket.activityStartDate)}</div>
              </div>
            ) : null}
            {ticket.desiredDiffusionDate ? (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Fecha deseada de difusión</span>
                <div className="text-sm text-foreground">{formatDateShort(ticket.desiredDiffusionDate)}</div>
              </div>
            ) : null}
            {ticket.targetAudience ? (
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Público objetivo</span>
                <div className="text-sm text-foreground">{ticket.targetAudience}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {ticket.attentionArea?.slug === "FED" && ticket.metadata ? (() => {
          const meta = ticket.metadata as FedMetadata;
          const hasAnyField = meta.requestType || meta.quantity || meta.documentLink || meta.numberOfPages;
          if (!hasAnyField) return null;
          return (
            <div className="bg-sidebar border border-border/50 rounded-xl p-4 grid grid-cols-1 gap-y-4">
              {meta.requestType ? (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Tipo de solicitud</span>
                  <div className="text-sm text-foreground capitalize">
                    {meta.requestType === "introduccion_correcciones" ? "Introducción de correcciones" : meta.requestType}
                  </div>
                </div>
              ) : null}
              {meta.quantity ? (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
                    {meta.quantityLabel || "Cantidad"}
                  </span>
                  <div className="text-sm text-foreground">{meta.quantity}</div>
                </div>
              ) : null}
              {meta.numberOfPages ? (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Número de páginas</span>
                  <div className="text-sm text-foreground">{meta.numberOfPages}</div>
                </div>
              ) : null}
              {meta.documentLink ? (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">Documento / Carpeta</span>
                  <a
                    href={meta.documentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    Abrir enlace
                  </a>
                </div>
              ) : null}
            </div>
          );
        })() : null}

        <div className="bg-sidebar border border-border/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Usuarios notificados
            </span>
            {!isTicketClosed ? (
              <WatchersManager
                ticketId={ticket.id}
                currentWatchers={ticket.watchers || []}
                currentUserId={currentUserId}
                allUsers={allUsers}
              />
            ) : null}
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

        {!isTicketClosed && ticket.attentionArea?.slug !== "DIF" ? (
          <div className="mb-4">
            <TicketAttachmentUploader ticketId={ticket.id} />
          </div>
        ) : null}



        {isCreator && !isTicketClosed ? (
          <div>
            <CancelTicketButton ticketId={ticket.id} />
          </div>
        ) : null}

        {isAdmin ? (
          <div className="pt-2">
            <AdminDeleteTicketControl ticketId={ticket.id} isAdmin={isAdmin} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
