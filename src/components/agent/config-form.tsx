"use client";

import { updateAreaConfigAction } from "@/actions/agent/update-config";
import { updateBusinessHoursAction } from "@/actions/agent/update-business-hours";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBusinessDays, formatBusinessHoursRange, WEEKDAYS_ORDER, DAY_LABELS } from "@/lib/utils/business-hours";
import { Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface SettingsFormProps {
  initialData: {
    isAcceptingTickets: boolean;
    businessStartTime: string;
    businessEndTime: string;
    businessDays: string;
  };
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isHoursPending, startHoursTransition] = useTransition();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => new Set(initialData.businessDays.split(",").map(Number))
  );

  // Sincronizar selectedDays cuando initialData cambia (tras router.refresh)
  useEffect(() => {
    setSelectedDays(new Set(initialData.businessDays.split(",").map(Number)));
  }, [initialData.businessDays]);

  function handleToggleChange(checked: boolean) {
    const formData = new FormData();
    formData.append("isAcceptingTickets", String(checked));

    startTransition(async () => {
      const result = await updateAreaConfigAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuración actualizada correctamente");
        router.refresh();
      }
    });
  }

  function handleDayToggle(day: number, checked: boolean) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(day);
      } else {
        next.delete(day);
      }
      return next;
    });
  }

  function handleHoursSubmit(formData: FormData) {
    startHoursTransition(async () => {
      const submitData = new FormData();
      submitData.append("businessStartTime", formData.get("businessStartTime") as string);
      submitData.append("businessEndTime", formData.get("businessEndTime") as string);
      submitData.append("businessDays", [...selectedDays].sort().join(","));

      const result = await updateBusinessHoursAction(submitData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Horario de atención actualizado");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recepción de tickets</CardTitle>
          <CardDescription>
            Controla si tu área está aceptando nuevos tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base">Aceptar tickets</Label>
              <p className="text-sm text-muted-foreground">
                Desactiva esto para bloquear temporalmente la creación de nuevos tickets para tu área.
              </p>
            </div>
            <Switch
              checked={initialData.isAcceptingTickets}
              onCheckedChange={handleToggleChange}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario de atención</CardTitle>
          <CardDescription>
            Define el horario y días hábiles de tu área para el cálculo de métricas y tiempos de respuesta. Los usuarios pueden enviar requerimientos las 24 horas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleHoursSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {formatBusinessHoursRange(initialData.businessStartTime, initialData.businessEndTime)}
                {" · "}
                {formatBusinessDays(initialData.businessDays)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agent-bh-start">Hora de inicio</Label>
                <Input
                  id="agent-bh-start"
                  name="businessStartTime"
                  type="time"
                  defaultValue={initialData.businessStartTime}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-bh-end">Hora de fin</Label>
                <Input
                  id="agent-bh-end"
                  name="businessEndTime"
                  type="time"
                  defaultValue={initialData.businessEndTime}
                  required
                />
              </div>
            </div>

            {/* Días hábiles */}
            <div className="space-y-3">
              <Label>Días hábiles</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS_ORDER.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDays.has(day)}
                      onCheckedChange={(checked) => handleDayToggle(day, !!checked)}
                    />
                    {DAY_LABELS[day]}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isHoursPending || selectedDays.size === 0}>
                {isHoursPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar horario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
