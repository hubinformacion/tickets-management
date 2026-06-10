"use client";

import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { dayjs } from "@/lib/utils/date";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils/cn";
import type { UseFormReturn } from "react-hook-form";
import type { CreateTicketFormSchema } from "@/lib/validation/schemas";

const TARGET_AUDIENCE_OPTIONS = [
  "Toda la comunidad Continental",
  "Docentes de universidad",
  "Docentes de instituto",
  "Administrativos UC",
  "Administrativos IC",
  "Todos los estudiantes UC",
  "Todos los estudiantes IC",
  "Posgrado",
] as const;

interface DiffusionFieldsProps {
  form: UseFormReturn<CreateTicketFormSchema>;
  targetAudienceMode: string;
  setTargetAudienceMode: React.Dispatch<React.SetStateAction<"custom" | "preset">>;
  customTargetAudience: string;
  setCustomTargetAudience: (value: string) => void;
}

export function DiffusionFields({
  form,
  targetAudienceMode,
  setTargetAudienceMode,
  customTargetAudience,
  setCustomTargetAudience,
}: DiffusionFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="activityStartDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-sm font-medium">
                Fecha de inicio de la actividad <span className="text-muted-foreground">*</span>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? dayjs(field.value).format("D [de] MMMM [de] YYYY")
                        : "Selecciona una fecha"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={es}
                    mode="single"
                    selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      field.onChange(date ? dayjs(date).format("YYYY-MM-DD") : "");
                    }}
                    disabled={{ before: new Date() }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="desiredDiffusionDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-sm font-medium">
                Fecha deseada de difusión <span className="text-muted-foreground">*</span>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? dayjs(field.value).format("D [de] MMMM [de] YYYY")
                        : "Selecciona una fecha"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={es}
                    mode="single"
                    selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      field.onChange(date ? dayjs(date).format("YYYY-MM-DD") : "");
                    }}
                    disabled={{ before: new Date() }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="targetAudience"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">
              Público objetivo <span className="text-muted-foreground">*</span>
            </FormLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Selecciona a quién va dirigida la difusión
            </p>
            <div className="space-y-3">
              <Select
                onValueChange={(val) => {
                  if (val === "__otro__") {
                    setTargetAudienceMode("custom");
                    field.onChange(customTargetAudience);
                  } else {
                    setTargetAudienceMode("preset");
                    setCustomTargetAudience("");
                    field.onChange(val);
                  }
                }}
                value={targetAudienceMode === "custom" ? "__otro__" : field.value || ""}
              >
                <FormControl>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecciona el público objetivo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TARGET_AUDIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                  <SelectItem value="__otro__">Otro (especificar)</SelectItem>
                </SelectContent>
              </Select>

              {targetAudienceMode === "custom" && (
                <Input
                  type="text"
                  placeholder="Especifica el público objetivo..."
                  value={customTargetAudience}
                  onChange={(e) => {
                    setCustomTargetAudience(e.target.value);
                    field.onChange(e.target.value);
                  }}
                  className="text-sm"
                />
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
