"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquareIcon, ChevronDown, Activity, Share2, ArrowRight, ArrowRightLeft } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDate, formatDateShort } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { CommentForm } from "@/components/tickets/comment-form";
import dynamic from "next/dynamic";
import type { DerivationMetadata } from "@/types";
import { STATUS_LABELS } from "@/lib/constants/tickets";
import type { TicketStatus } from "@/types";

const RichTextEditor = dynamic(
  () => import("@/components/shared/rich-text-editor").then(mod => ({ default: mod.RichTextEditor }))
);

interface CommentEntry {
  id: string;
  type: string | null;
  content: string;
  metadata?: unknown;
  createdAt: Date;
  author: { name: string; image?: string | null };
}

interface StatusHistoryEntry {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date;
  changedBy: { name: string; image?: string | null };
}

interface TicketActivityProps {
  ticketId: number;
  comments: CommentEntry[];
  statusHistory?: StatusHistoryEntry[];
  canComment: boolean;
}

export function TicketActivity({ ticketId, comments, statusHistory = [], canComment }: TicketActivityProps) {
  // Merge comments and status history into a unified timeline
  const timelineEntries = [
    ...comments.map(c => ({ ...c, _type: "comment" as const, _date: c.createdAt })),
    ...statusHistory
      .filter(s => !(s.fromStatus === null && s.toStatus === "open"))
      .map(s => ({
        id: `status-${s.id}`,
        type: "status_change" as const,
        content: "",
        metadata: null,
        createdAt: s.changedAt,
        author: s.changedBy,
        fromStatus: s.fromStatus,
        toStatus: s.toStatus,
        _type: "status_change" as const,
        _date: s.changedAt,
      })),
  ].sort((a, b) => b._date.getTime() - a._date.getTime());
  return (
    <div className="space-y-6 pt-4">
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
          <MessageSquareIcon className="w-4 h-4" />
          Añadir comentario
        </h3>
        {canComment ? (
          <div className="bg-card w-full border border-border/80 shadow-xs rounded-xl focus-within:shadow-md focus-within:border-primary/50 transition-all overflow-hidden relative">
            <CommentForm ticketId={ticketId} />
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

      {timelineEntries.length > 0 ? (
        <div className="pt-2">
          <Collapsible defaultOpen className="space-y-6">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group cursor-pointer select-none">
                <Activity className="w-3.5 h-3.5" />
                Historial de actividad
                <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <span className="text-xs text-muted-foreground bg-muted border px-2.5 py-0.5 rounded-full">{timelineEntries.length}</span>
            </div>

            <CollapsibleContent>
              <div className="space-y-6 relative pl-2">
                {timelineEntries.length > 0 ? (
                  <div className="absolute left-[26px] top-4 bottom-4 w-px bg-linear-to-b from-border/80 via-border/40 to-transparent" />
                ) : null}

                {timelineEntries.map((entry) => {
                  const entryType = entry._type;

                  if (entryType === "status_change") {
                    const fromLabel = entry.fromStatus ? (STATUS_LABELS[entry.fromStatus as TicketStatus] || entry.fromStatus) : "Creación";
                    const toLabel = STATUS_LABELS[entry.toStatus as TicketStatus] || entry.toStatus;
                    return (
                      <div key={entry.id} className="relative pl-12 group">
                        <div className="absolute left-0 top-0 z-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 ring-4 ring-background flex items-center justify-center shadow-sm">
                            <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 min-h-10 pt-2.5">
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium">{entry.author.name}</span>
                            {" "}
                            cambió estado de{" "}
                            <span className="font-medium text-foreground">{fromLabel}</span>
                            {" → "}
                            <span className="font-medium text-foreground">{toLabel}</span>
                          </span>
                          <span className="text-xs text-muted-foreground/60">{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    );
                  }

                  const entryTypeComment = entry.type || 'comment';

                  if (entryTypeComment === 'derivation') {
                    const meta = entry.metadata as DerivationMetadata | null;
                    return (
                      <div key={entry.id} className="relative pl-12 group">
                        <div className="absolute left-0 top-0 z-10">
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 ring-4 ring-background flex items-center justify-center shadow-sm">
                            <Share2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>
                        <div className={cn("space-y-2", !(meta?.note || meta?.estimatedDate) && "min-h-10 flex items-center")}>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
                              Derivado a {meta?.providerName || 'Desconocido'}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                          </div>
                          {(meta?.note || meta?.estimatedDate) ? (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300 group-hover:border-amber-300 dark:group-hover:border-amber-700 transition-colors space-y-1.5">
                              {meta?.estimatedDate ? (
                                <p className="font-medium text-xs">Fecha estimada de atención: <strong>{formatDateShort(meta.estimatedDate)}</strong></p>
                              ) : null}
                              {meta?.note ? (
                                <p className="leading-relaxed">{meta.note}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  if (entryTypeComment === 'system') {
                    return (
                      <div key={entry.id} className="relative pl-12 group">
                        <div className="absolute left-0 top-0 z-10">
                          <div className="h-10 w-10 rounded-full bg-muted ring-4 ring-background flex items-center justify-center shadow-sm">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 min-h-10 pt-2.5">
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium">{entry.author.name}</span>
                            {' — '}
                            {/* eslint-disable-next-line react/no-danger */}
                            <span dangerouslySetInnerHTML={{ __html: entry.content }} />
                          </span>
                          <span className="text-xs text-muted-foreground/60">{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={entry.id} className="relative pl-12 group">
                      <div className="absolute left-0 top-0 z-10">
                        <UserAvatar
                          name={entry.author.name}
                          image={entry.author.image}
                          size="md"
                          className="ring-4 ring-background h-10 w-10 shadow-sm"
                        />
                      </div>
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
      ) : null}

      {timelineEntries.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-border/60 rounded-xl bg-muted/5">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
            <Activity className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-medium text-foreground">Sin actividad aún</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
            Añade un comentario arriba para iniciar la conversación. Al enviarlo, se registrará aquí en el historial.
          </p>
        </div>
      ) : null}
    </div>
  );
}
