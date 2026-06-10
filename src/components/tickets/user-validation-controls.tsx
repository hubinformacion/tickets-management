"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { approveTicketValidation, rejectTicketValidation } from "@/actions/tickets";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

interface UserValidationControlsProps {
  ticketId: number;
}

export function UserValidationControls({ ticketId }: UserValidationControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveTicketValidation(ticketId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket validado y cerrado correctamente");
      }
    });
  };

  const handleRejectSubmit = () => {
    const rawText = rejectionMessage.replace(/<[^>]+>/g, "").trim();
    if (rawText.length < 10) {
      toast.error("Por favor describe con más detalle qué necesita ajustarse (mínimo 10 caracteres)");
      return;
    }

    startTransition(async () => {
      const result = await rejectTicketValidation(ticketId, rejectionMessage);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket regresado a 'En progreso' para ajustes");
        setIsRejectDialogOpen(false);
        setRejectionMessage("");
      }
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "rounded-2xl border shadow-2xl transition-all duration-300 overflow-hidden",
          "bg-card backdrop-blur-sm",
          "border-border",
          "animate-in slide-in-from-bottom-4 fade-in duration-500",
          isExpanded ? "w-[420px]" : "w-auto min-w-[280px]"
        )}
      >
        {isExpanded ? (
          <>
            <button
              type="button"
              className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30 cursor-pointer w-full"
              onClick={() => setIsExpanded(false)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  Acción requerida
                </span>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            <div className="px-5 py-4">
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                El responsable informó que el ticket fue resuelto. Por favor, valida el trabajo y confirma el cierre, o solicita los ajustes que consideres necesarios.
              </p>

              <div className="flex gap-3">
                {/* Confirmar solución */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="flex-1 h-10"
                      disabled={isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmar solución
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar solución?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Al confirmar, el ticket se marcará como resuelto y se cerrará.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApprove}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Solicitar mejoras — Dialog con textarea */}
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  disabled={isPending}
                  onClick={() => setIsRejectDialogOpen(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Solicitar mejoras
                </Button>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors w-full"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Acción requerida</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>

      {/* Dialog de solicitud de mejoras */}
      <Dialog open={isRejectDialogOpen} onOpenChange={(open) => {
        setIsRejectDialogOpen(open);
        if (!open) setRejectionMessage("");
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Solicitar mejoras</DialogTitle>
            <DialogDescription>
              El ticket volverá a &quot;En progreso&quot;. Describe qué necesita ajustarse para que el agente pueda continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="rejection-message">
              Motivo del rechazo <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={rejectionMessage}
              onChange={(val) => setRejectionMessage(val)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Este mensaje se añadirá al historial de actividad y se enviará por correo al agente.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionMessage("");
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isPending || rejectionMessage.replace(/<[^>]+>/g, "").trim().length < 10}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar mejoras
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
