"use client";

import { FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getFedFieldConfig, type FedFieldConfig } from "@/lib/constants/fed-fields";
import type { UseFormReturn } from "react-hook-form";
import type { CreateTicketFormSchema } from "@/lib/validation/schemas";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

interface FedFieldsProps {
  form: UseFormReturn<CreateTicketFormSchema>;
  subcategoryName: string | null;
}

export function FedFields({ form, subcategoryName }: FedFieldsProps) {
  const fieldConfig = useMemo(() => {
    if (!subcategoryName) return null;
    return getFedFieldConfig(subcategoryName);
  }, [subcategoryName]);

  if (!fieldConfig) return null;

  return (
    <div className="space-y-5">
      {/* Tipo de solicitud (Nuevo / Correcciones) */}
      {fieldConfig.requestType ? (
        <FormField
          control={form.control}
          name="fedRequestType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {fieldConfig.requestType!.label} <span className="text-muted-foreground">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fieldConfig.requestType!.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Cantidad (piezas, tesis, imágenes) */}
      {fieldConfig.quantity ? (
        <FormField
          control={form.control}
          name="fedQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {fieldConfig.quantity!.label}{" "}
                {fieldConfig.quantity!.required ? <span className="text-muted-foreground">*</span> : null}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 3"
                  className="text-sm"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Número de páginas (corrección de copys/mailing, corrección de guías) */}
      {fieldConfig.numberOfPages ? (
        <FormField
          control={form.control}
          name="fedNumberOfPages"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {fieldConfig.numberOfPages!.label}{" "}
                {fieldConfig.numberOfPages!.required ? <span className="text-muted-foreground">*</span> : null}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 5"
                  className="text-sm"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Link del documento / carpeta */}
      {fieldConfig.documentLink ? (
        <FormField
          control={form.control}
          name="fedDocumentLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                {fieldConfig.documentLink!.label}{" "}
                {fieldConfig.documentLink!.required ? <span className="text-muted-foreground">*</span> : null}
              </FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder={fieldConfig.documentLink!.placeholder}
                  className="text-sm"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {/* Hint especial para descripción (ej: Portada de tesis) */}
      {fieldConfig.descriptionHint ? (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3 py-2.5">
          <p className="text-[11px] text-blue-800 dark:text-blue-300/80 leading-relaxed">
            <span className="font-medium text-blue-900 dark:text-blue-200">Nota:</span>{" "}
            {fieldConfig.descriptionHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
