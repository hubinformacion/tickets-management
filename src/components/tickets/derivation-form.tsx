"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addDerivationAction } from "@/actions/comments";
import { Loader2, Share2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { es } from "react-day-picker/locale";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface Provider {
  id: number;
  name: string;
}

interface DerivationFormProps {
  ticketId: number;
  providers: Provider[];
  customTrigger?: React.ReactNode;
}

export function DerivationForm({ ticketId, providers, customTrigger }: DerivationFormProps) {
  const providerId = useId();
  const estimatedDateId = useId();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [providerName, setProviderName] = useState("");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    setProviderName("");
    setEstimatedDate("");
    setNote("");
  };

  const handleSubmit = () => {
    if (!providerName) {
      toast.error("Selecciona un proveedor");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticketId.toString());
      formData.append("providerName", providerName);
      if (estimatedDate) {
        formData.append("estimatedDate", estimatedDate);
      }
      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const result = await addDerivationAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Derivación registrada");
        setOpen(false);
        resetForm();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button variant="outline" size="sm" className="gap-2 w-full">
            <Share2 className="h-3.5 w-3.5" />
            Registrar derivación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar derivación</DialogTitle>
          <DialogDescription>
            Registra que este ticket fue derivado a un proveedor externo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label htmlFor={providerId}>Proveedor</Label>
            {providers.length > 0 ? (
              <Select value={providerName} onValueChange={setProviderName}>
                <SelectTrigger id={providerId}>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={providerId}
                placeholder="Nombre del proveedor"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
            )}
          </div>

          {/* Fecha estimada */}
          <div className="space-y-2">
            <Label htmlFor={estimatedDateId}>Fecha estimada de atención (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={estimatedDateId}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !estimatedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {estimatedDate
                    ? dayjs(estimatedDate).format("D [de] MMMM [de] YYYY")
                    : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  locale={es}
                  mode="single"
                  selected={estimatedDate ? new Date(estimatedDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    setEstimatedDate(date ? dayjs(date).format("YYYY-MM-DD") : "");
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Nota adicional */}
          <div className="space-y-2">
            <Label htmlFor="derivation-note">
              Nota adicional <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="derivation-note"
              placeholder="Ej: Se requiere que el proveedor coordine directamente con el usuario para el acceso..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !providerName}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
