"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { deepDeleteTicketAction } from "@/actions/admin";
import { useRouter } from "next/navigation";

export function AdminDeleteTicketControl({ ticketId, isAdmin }: { ticketId: number; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!isAdmin) return null;

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deepDeleteTicketAction(ticketId);
        if (result.error) {
          toast.error(result.error);
        } else if (result.success === true) {
          toast.success("Ticket eliminado permanentemente");
          setOpen(false);
          router.push("/dashboard/explorador");
        } else {
          toast.error("No se pudo confirmar la eliminación. Vuelve a intentar.");
        }
      } catch {
        toast.error("No se pudo confirmar la eliminación. Vuelve a intentar.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full gap-2 min-h-[50px] rounded-xl font-bold bg-destructive overflow-hidden transition-all hover:bg-destructive/90 hover:shadow-lg dark:hover:shadow-red-900/40">
          <Trash2 className="h-4 w-4" />
          Eliminar ticket permanentemente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex bg-red-100 dark:bg-red-900/30 p-3 rounded-full w-fit mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
          </div>
          <DialogTitle className="text-xl">¿Eliminación crítica?</DialogTitle>
          <DialogDescription className="text-sm pt-2">
            Esta acción es completamente <span className="font-bold text-foreground">irreversible</span>.
            <br className="mt-2" />
            Al confirmar, se eliminarán el ticket, su actividad, historial, encuestas, atenciones de proveedores y registros de archivos y recordatorios. Sus archivos se eliminarán de Drive, salvo los que también use otro ticket.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar y volver
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sí, eliminar íntegramente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
