"use client";

import { useState, useTransition } from "react";
import { deleteTicketAttachmentAction } from "@/actions/tickets";
import { Trash2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface DeleteAttachmentButtonProps {
  attachmentId: string;
  ticketId: number;
  fileName: string;
  isRetry?: boolean;
}

export function DeleteAttachmentButton({ attachmentId, ticketId, fileName, isRetry = false }: DeleteAttachmentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteTicketAttachmentAction(attachmentId, ticketId);
        if (result?.error) {
          toast.error(result.error);
        } else if (result && "success" in result && result.success === true) {
          toast.success("Archivo eliminado");
          setOpen(false);
        } else {
          toast.error("No se pudo confirmar la eliminación. Intenta nuevamente.");
        }
      } catch {
        toast.error("No se pudo confirmar la eliminación. Intenta nuevamente.");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity"
        >
          {isRetry ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          <span className="sr-only">{isRetry ? "Reintentar eliminación" : "Eliminar archivo"}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isRetry ? "¿Reintentar la eliminación?" : "¿Estás seguro?"}</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el archivo <span className="font-medium text-foreground">{fileName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRetry ? "Reintentar" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
