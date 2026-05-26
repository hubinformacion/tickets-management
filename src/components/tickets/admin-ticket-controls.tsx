"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTicketToSelf, updateTicketStatus, unassignTicket, requestValidation } from "@/actions/admin";
import { toast } from "sonner";
import { useTransition } from "react";
import { UserPlus, UserMinus, CheckCircle, Share2 } from "lucide-react";
import { useState } from "react";
import type { TicketStatus } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "resolved", label: "Resuelto" },
  { value: "voided", label: "Anulado" },
];

export function AdminTicketControls({
  ticketId,
  currentStatus,
  isAssigned,
  derivationSlot
}: {
  ticketId: number;
  currentStatus: string;
  isAssigned: boolean;
  derivationSlot?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const handleStatusChange = (newStatus: TicketStatus) => {
    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Estado actualizado correctamente");
      }
    });
  };

  const handleAssign = () => {
    startTransition(async () => {
      const result = await assignTicketToSelf(ticketId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket asignado correctamente");
      }
    });
  };

  const handleUnassign = () => {
    startTransition(async () => {
      const result = await unassignTicket(ticketId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket desasignado correctamente");
      }
    });
  };

  const handleRequestValidation = () => {
    setIsValidationDialogOpen(true);
  };

  const submitValidationRequest = () => {
    startTransition(async () => {
      const result = await requestValidation(ticketId, validationMessage);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Validación solicitada al usuario");
        setIsValidationDialogOpen(false);
        setValidationMessage("");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 w-full">
        <label className="text-sm font-medium whitespace-nowrap text-foreground shrink-0">
          Cambiar estado
        </label>
        <Select
          value={currentStatus}
          onValueChange={(value) => handleStatusChange(value as TicketStatus)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(currentStatus !== "resolved" && currentStatus !== "voided" || derivationSlot) && (
        <div className={cn("gap-3 pt-2", currentStatus === "in_progress" ? "grid grid-cols-2" : "grid grid-cols-1 md:grid-cols-2")}>
          {/* Left column options */}
          <div className={cn("flex flex-col gap-3", currentStatus !== "in_progress" && "col-span-full grid grid-cols-2")}>
            {currentStatus !== "resolved" && currentStatus !== "voided" && (
              !isAssigned ? (
                <Button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="w-full flex-1 min-h-[80px] flex-col gap-2 rounded-xl"
                  variant="outline"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="text-xs whitespace-normal text-center">Asignarme este ticket</span>
                </Button>
              ) : (
                <Button
                  onClick={handleUnassign}
                  disabled={isPending}
                  className="w-full flex-1 min-h-[80px] flex-col gap-2 rounded-xl"
                  variant="outline"
                >
                  <UserMinus className="h-5 w-5" />
                  <span className="text-xs whitespace-normal text-center">Desasignarme este ticket</span>
                </Button>
              )
            )}
            {derivationSlot}
          </div>

          {/* Right column (Validación) */}
          {currentStatus === "in_progress" && (
            <Button
              onClick={handleRequestValidation}
              disabled={isPending}
              className="h-full min-h-[172px] flex-col gap-3 rounded-2xl bg-[#5B21B6] hover:bg-[#4C1D95] dark:bg-[#6D28D9] dark:hover:bg-[#5B21B6] text-white shadow-md transition-colors"
            >
              <CheckCircle className="h-8 w-8 opacity-90" />
              <span className="font-semibold text-center leading-tight">Solicitar<br />validación</span>
            </Button>
          )}
        </div>
      )}

      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Solicitar validación</DialogTitle>
            <DialogDescription>
              El usuario recibirá un correo notificando que el ticket ha sido resuelto y requiere su validación.
              Puedes añadir un mensaje personalizado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Mensaje para el usuario</Label>
              <RichTextEditor
                value={validationMessage}
                onChange={setValidationMessage}
                placeholder="Escribe un mensaje explicando la solución..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsValidationDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitValidationRequest}
              disabled={isPending}
            >
              {isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
