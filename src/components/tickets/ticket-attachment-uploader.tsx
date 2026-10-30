"use client";

import { useState, useRef, useEffect, lazy, Suspense, useCallback } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { addTicketAttachmentsAction } from "@/actions/tickets";
import { Button } from "@/components/ui/button";

const FileUpload = lazy(() =>
  import("@/components/shared/file-upload").then(mod => ({ default: mod.FileUpload }))
);

interface TicketAttachmentUploaderProps {
  ticketId: number;
}

export function TicketAttachmentUploader({ ticketId }: TicketAttachmentUploaderProps) {
  return <TicketAttachmentUploadSession key={ticketId} ticketId={ticketId} />;
}

function TicketAttachmentUploadSession({ ticketId }: TicketAttachmentUploaderProps) {
  // El token solo cambia al abrir otra instancia de ticket, nunca por un temporizador.
  const [uploadToken] = useState(() => crypto.randomUUID());
  const [confirmedAttachmentIds, setConfirmedAttachmentIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const currentIdsRef = useRef<string[]>([]);
  const confirmedIdsRef = useRef(new Set<string>());
  const linkingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleFilesChange = useCallback(async (attachmentIds: string[]) => {
    if (!mountedRef.current) return;
    currentIdsRef.current = attachmentIds;
    const visibleIds = new Set(attachmentIds);
    let pruned = false;
    for (const id of confirmedIdsRef.current) {
      if (!visibleIds.has(id)) {
        confirmedIdsRef.current.delete(id);
        pruned = true;
      }
    }
    if (pruned) setConfirmedAttachmentIds(Array.from(confirmedIdsRef.current));
    if (!attachmentIds.some(id => !confirmedIdsRef.current.has(id))) {
      setLinkError(null);
      return;
    }
    // La solicitud en curso recogerá los archivos que lleguen durante su espera.
    if (linkingRef.current) return;
    linkingRef.current = true;
    setIsLinking(true);
    setLinkError(null);

    const reportError = (message: string) => {
      if (mountedRef.current && currentIdsRef.current.some(id => !confirmedIdsRef.current.has(id))) {
        setLinkError(message);
        toast.error(message);
      }
    };

    try {
      while (mountedRef.current) {
        const requestedIds = currentIdsRef.current.filter(id => !confirmedIdsRef.current.has(id));
        if (!requestedIds.length) break;
        const result = await addTicketAttachmentsAction(ticketId, uploadToken, requestedIds);
        if (!mountedRef.current) return;
        if (result?.error) {
          reportError(result.error);
          break;
        }
        if (!result || !("success" in result) || result.success !== true) {
          reportError("No se pudo confirmar la vinculación. Intenta nuevamente.");
          break;
        }
        const currentIds = new Set(currentIdsRef.current);
        const serverConfirmed = new Set(result.confirmedAttachmentIds ?? []);
        const confirmed = requestedIds.filter(id => currentIds.has(id) && serverConfirmed.has(id));
        for (const id of confirmed) confirmedIdsRef.current.add(id);
        setConfirmedAttachmentIds(Array.from(confirmedIdsRef.current));
        setLinkError(null);
        if (confirmed.length) {
          toast.success(confirmed.length === 1 ? "Archivo adjuntado al ticket" : "Archivos adjuntados al ticket");
        }
        if (requestedIds.some(id => currentIds.has(id) && !serverConfirmed.has(id))) {
          reportError("No se pudo confirmar la vinculación de todos los archivos. Intenta nuevamente o retira los que no necesites.");
          break;
        }
      }
    } catch {
      reportError("No se pudo confirmar la vinculación. Intenta nuevamente.");
    } finally {
      linkingRef.current = false;
      if (mountedRef.current) setIsLinking(false);
    }
  }, [ticketId, uploadToken]);

  return (
    <div className="bg-sidebar border border-border/50 rounded-xl p-4 space-y-3">
      <label className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5">
        <Paperclip className="w-3 h-3" />
        Archivos adjuntos
      </label>
      <Suspense fallback={null}>
        <FileUpload
          uploadToken={uploadToken}
          onFilesChange={handleFilesChange}
          confirmedAttachmentIds={confirmedAttachmentIds}
        />
      </Suspense>
      {isLinking ? <p role="status" className="text-xs text-muted-foreground">Confirmando archivos en el ticket...</p> : null}
      {linkError ? (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">{linkError}</p>
          <Button type="button" variant="outline" size="sm" disabled={isLinking}
            onClick={() => { void handleFilesChange(currentIdsRef.current); }}>
            Reintentar vinculación
          </Button>
        </div>
      ) : null}
    </div>
  );
}
