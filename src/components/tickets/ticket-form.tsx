"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTicketFormSchema, type CreateTicketFormSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTicketAction } from "@/actions/tickets";
import { useState, useTransition, useMemo, lazy, Suspense, useCallback } from "react";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Bell,
  Lightbulb,
  Paperclip,
  Info,
} from "lucide-react";
import { UserSelector } from "@/components/ui/user-selector";
import Link from "next/link";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { cn } from "@/lib/utils/cn";
import { PRIORITY_LABELS } from "@/lib/constants/tickets";
import { PRIORITY_DEFINITIONS } from "@/lib/constants/priority-info";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrioritySelector } from "@/components/tickets/priority-selector";
import { DiffusionFields } from "@/components/tickets/diffusion-fields";
import { FedFields } from "@/components/tickets/fed-fields";
import { FED_SIDEBAR_INSTRUCTIONS, getFedFieldConfig } from "@/lib/constants/fed-fields";
import type { TicketPriority } from "@/types";


const FileUpload = lazy(() =>
  import("@/components/shared/file-upload").then(mod => ({ default: mod.FileUpload }))
);


interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  attentionAreaId?: number | null;
  subcategories: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
}

interface AttentionArea {
  id: number;
  name: string;
  slug: string;
  isAcceptingTickets: boolean;
}

interface PriorityConfigItem {
  id: number;
  attentionAreaId: number;
  priority: string;
  description: string;
  slaHours: number;
}

interface NewTicketFormProps {
  availableUsers: User[];
  allowNewTickets?: boolean;
  categories: Category[];
  attentionAreas: AttentionArea[];
  disabledMessage?: string | null;
  priorityConfigs?: PriorityConfigItem[];
}

const EMPTY_PRIORITY_CONFIGS: Array<PriorityConfigItem> = [];

interface SidebarContext {
  areaName: string;
  category?: { name: string; description: string | null };
  subcategory?: { name: string; description: string | null };
  tips: string[];
}

// Contexto dinámico del panel lateral según el estado del formulario
function useSidebarContext(
  selectedAttentionArea: number | null,
  selectedCategory: number | null,
  selectedSubcategory: number | null,
  attentionAreas: AttentionArea[],
  categories: Category[]
): SidebarContext {
  return useMemo(() => {
    const area = attentionAreas.find(a => a.id === selectedAttentionArea);
    const category = categories.find(c => c.id === selectedCategory);
    const subcategory = category?.subcategories.find(s => s.id === selectedSubcategory);

    const isDiffusion = area?.slug === "DIF";
    const isFed = area?.slug === "FED";

    let tips: string[];
    if (isFed) {
      tips = [
        ...FED_SIDEBAR_INSTRUCTIONS.general,
        ...FED_SIDEBAR_INSTRUCTIONS.plazos,
      ];
    } else if (isDiffusion) {
      tips = [
        "Indica las fechas con la mayor anticipación posible",
        "Describe detalladamente el evento o actividad a difundir",
        "Especifica el público objetivo para una mejor segmentación",
      ];
    } else {
      tips = [
        "Describe el problema con el mayor detalle posible",
        "Adjunta capturas o enlaces relevantes en la descripción",
      ];
    }

    return {
      areaName: area ? area.name : "Selecciona un área para comenzar",
      category: category ? { name: category.name, description: category.description } : undefined,
      subcategory: subcategory ? { name: subcategory.name, description: subcategory.description } : undefined,
      tips,
    };
  }, [selectedAttentionArea, selectedCategory, selectedSubcategory, attentionAreas, categories]);
}

// Progreso del formulario
function useFormProgress(formValues: Partial<CreateTicketFormSchema>, hasDescription: boolean, isDiffusion: boolean, isFed: boolean) {
  return useMemo(() => {
    let fields;
    if (isDiffusion) {
      fields = [
        { label: "Clasificación", done: Boolean(formValues.attentionAreaId && formValues.categoryId && formValues.subcategoryId) },
        { label: "Asunto", done: Boolean(formValues.title && formValues.title.length >= 5) },
        { label: "Prioridad", done: Boolean(formValues.priority) },
        { label: "Fechas", done: Boolean(formValues.activityStartDate && formValues.desiredDiffusionDate) },
        { label: "Público", done: Boolean(formValues.targetAudience) },
        { label: "Descripción", done: hasDescription },
      ];
    } else if (isFed) {
      fields = [
        { label: "Clasificación", done: Boolean(formValues.attentionAreaId && formValues.categoryId && formValues.subcategoryId) },
        { label: "Asunto", done: Boolean(formValues.title && formValues.title.length >= 5) },
        { label: "Prioridad", done: Boolean(formValues.priority) },
        { label: "Campos extra", done: Boolean(formValues.fedDocumentLink) },
        { label: "Descripción", done: hasDescription },
      ];
    } else {
      fields = [
        { label: "Clasificación", done: Boolean(formValues.attentionAreaId && formValues.categoryId && formValues.subcategoryId) },
        { label: "Asunto", done: Boolean(formValues.title && formValues.title.length >= 5) },
        { label: "Prioridad", done: Boolean(formValues.priority) },
        { label: "Descripción", done: hasDescription },
      ];
    }
    const completed = fields.filter(f => f.done).length;
    return { fields, completed, total: fields.length };
  }, [formValues, hasDescription, isDiffusion, isFed]);
}

export function NewTicketForm({
  availableUsers,
  allowNewTickets = true,
  categories,
  attentionAreas,
  disabledMessage,
  priorityConfigs = EMPTY_PRIORITY_CONFIGS,
}: NewTicketFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [selectedAttentionArea, setSelectedAttentionArea] = useState<number | null>(null);
  const [selectedAreaSlug, setSelectedAreaSlug] = useState<string | null>(null);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);
  const [uploadToken] = useState(() => crypto.randomUUID());
  // Para "Otro" en público objetivo
  const [targetAudienceMode, setTargetAudienceMode] = useState<"preset" | "custom">("preset");
  const [customTargetAudience, setCustomTargetAudience] = useState("");

  const isDiffusion = selectedAreaSlug === "DIF";
  const isFondoEditorial = selectedAreaSlug === "FED";

  // Resolver nombre de subcategoría seleccionada (para FedFields)
  const selectedSubcategoryName = useMemo(() => {
    if (!isFondoEditorial || !selectedCategory || !selectedSubcategory) return null;
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.subcategories.find(s => s.id === selectedSubcategory)?.name ?? null;
  }, [isFondoEditorial, selectedCategory, selectedSubcategory, categories]);

  const dynamicSchema = useMemo(() => {
    return createTicketFormSchema.superRefine((data, ctx) => {
      if (!data.priority) {
        ctx.addIssue({
          code: "custom",
          message: "Selecciona una prioridad",
          path: ["priority"],
        });
      }

      if (isDiffusion) {
        if (!data.activityStartDate) {
          ctx.addIssue({
            code: "custom",
            message: "La fecha de inicio de la actividad es obligatoria",
            path: ["activityStartDate"],
          });
        }
        if (!data.desiredDiffusionDate) {
          ctx.addIssue({
            code: "custom",
            message: "La fecha deseada de difusión es obligatoria",
            path: ["desiredDiffusionDate"],
          });
        }
        if (!data.targetAudience || data.targetAudience.trim() === "") {
          ctx.addIssue({
            code: "custom",
            message: "El público objetivo es obligatorio",
            path: ["targetAudience"],
          });
        }
      }

      // Validación dinámica para Fondo Editorial
      if (isFondoEditorial && selectedSubcategoryName) {
        const config = getFedFieldConfig(selectedSubcategoryName);
        if (config) {
          if (config.requestType && !data.fedRequestType) {
            ctx.addIssue({
              code: "custom",
              message: "Selecciona el tipo de solicitud",
              path: ["fedRequestType"],
            });
          }
          if (config.documentLink?.required && !data.fedDocumentLink) {
            ctx.addIssue({
              code: "custom",
              message: "El link del documento es obligatorio",
              path: ["fedDocumentLink"],
            });
          }
          if (config.quantity?.required && !data.fedQuantity) {
            ctx.addIssue({
              code: "custom",
              message: `${config.quantity.label} es obligatorio`,
              path: ["fedQuantity"],
            });
          }
          if (config.numberOfPages?.required && !data.fedNumberOfPages) {
            ctx.addIssue({
              code: "custom",
              message: "El número de páginas es obligatorio",
              path: ["fedNumberOfPages"],
            });
          }
          if (config.maxWords && data.description) {
            const plainText = data.description.replace(/<[^>]*>/g, " ").trim();
            const wordCount = plainText.split(/\s+/).filter(Boolean).length;
            if (wordCount > config.maxWords) {
              ctx.addIssue({
                code: "custom",
                message: `La descripción no debe superar las ${config.maxWords} palabras (actual: ${wordCount} palabras)`,
                path: ["description"],
              });
            }
          }
        }
      }
    });
  }, [isDiffusion, isFondoEditorial, selectedSubcategoryName]);

  // Un único formulario con schema unificado
  const form = useForm<CreateTicketFormSchema>({
    resolver: zodResolver(dynamicSchema) as Resolver<CreateTicketFormSchema>,
    defaultValues: {
      title: "",
      description: "",
      activityStartDate: "",
      desiredDiffusionDate: "",
      targetAudience: "",
      fedRequestType: "",
      fedDocumentLink: "",
      fedQuantity: undefined,
      fedNumberOfPages: undefined,
    },
  });

  const watchedValues = form.watch();
  const hasDescription = Boolean(watchedValues.description && watchedValues.description.length >= 10);

  const sidebarContext = useSidebarContext(selectedAttentionArea, selectedCategory, selectedSubcategory, attentionAreas, categories);
  const progress = useFormProgress(watchedValues, hasDescription, isDiffusion, isFondoEditorial);

  // Resolver priority info por área: DB config si existe, fallback a PRIORITY_DEFINITIONS
  const priorityInfo = useMemo(() => {
    const areaConfigs = selectedAttentionArea
      ? priorityConfigs.filter(c => c.attentionAreaId === selectedAttentionArea)
      : [];

    const map: Record<string, { description: string; sla: string }> = {};
    for (const key of ["low", "medium", "high", "critical"] as const) {
      const dbConfig = areaConfigs.find(c => c.priority === key);
      if (dbConfig) {
        const slaText = dbConfig.slaHours < 24
          ? `Atención hasta en ${dbConfig.slaHours} hora${dbConfig.slaHours !== 1 ? "s" : ""}`
          : `Atención hasta en ${Math.floor(dbConfig.slaHours / 24)} día${Math.floor(dbConfig.slaHours / 24) !== 1 ? "s" : ""}`;
        map[key] = { description: dbConfig.description, sla: slaText };
      } else {
        map[key] = PRIORITY_DEFINITIONS[key];
      }
    }
    return map;
  }, [selectedAttentionArea, priorityConfigs]);

  // Cuando cambia el área, resetear campos específicos y sincronizar el estado
  const handleAreaChange = useCallback((areaId: number) => {
    const area = attentionAreas.find(a => a.id === areaId);
    const newSlug = area?.slug || null;

    setSelectedAttentionArea(areaId);
    setSelectedAreaSlug(newSlug);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setTargetAudienceMode("preset");
    setCustomTargetAudience("");

    // Conservar campos compartidos, limpiar campos específicos de área
    const currentTitle = form.getValues("title");
    const currentDescription = form.getValues("description");

    form.reset({
      title: currentTitle,
      description: currentDescription,
      attentionAreaId: areaId,
      // Limpiar campos específicos
      priority: undefined,
      activityStartDate: "",
      desiredDiffusionDate: "",
      targetAudience: "",
      // Limpiar campos FED
      fedRequestType: "",
      fedDocumentLink: "",
      fedQuantity: undefined,
      fedNumberOfPages: undefined,
    });
  }, [attentionAreas, form]);

  if (!allowNewTickets) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-muted border border-border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Creación de tickets temporalmente deshabilitada
          </h2>
          <p className="text-muted-foreground">
            {disabledMessage || "Actualmente no se pueden crear nuevos tickets. Por favor, intenta más tarde o contacta al administrador."}
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a mis tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (data: CreateTicketFormSchema) => {
    const formData = new FormData();

    // Separar campos FED del resto
    const fedKeys = ["fedRequestType", "fedDocumentLink", "fedQuantity", "fedNumberOfPages"] as const;

    Object.entries(data).forEach(([key, value]) => {
      // Saltar campos FED — se serializan como metadata
      if (fedKeys.includes(key as typeof fedKeys[number])) return;
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });

    // Serializar metadata FED como JSON
    if (isFondoEditorial) {
      const metadata: Record<string, unknown> = {};
      if (data.fedRequestType) metadata.requestType = data.fedRequestType;
      if (data.fedDocumentLink) metadata.documentLink = data.fedDocumentLink;
      if (data.fedQuantity) {
        metadata.quantity = data.fedQuantity;
        // Obtener label de cantidad de la config
        if (selectedSubcategoryName) {
          const config = getFedFieldConfig(selectedSubcategoryName);
          if (config?.quantity) metadata.quantityLabel = config.quantity.label;
        }
      }
      if (data.fedNumberOfPages) metadata.numberOfPages = data.fedNumberOfPages;

      if (Object.keys(metadata).length > 0) {
        formData.append("metadata", JSON.stringify(metadata));
      }
    }

    formData.append("watchers", JSON.stringify(selectedWatchers));
    if (!isDiffusion) {
      formData.append("uploadToken", uploadToken);
    }

    startTransition(async () => {
      const result = await createTicketAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket creado correctamente");
      }
    });
  };

  // Filtrar categorías según área de atención
  const filteredCategories = selectedAttentionArea
    ? categories.filter(c => c.attentionAreaId === selectedAttentionArea)
    : [];

  const currentSubcategories = categories.find(c => c.id === selectedCategory)?.subcategories || [];

  // Clasificación completa: el usuario ya eligió área + categoría + subcategoría
  const hasClassification = Boolean(selectedAttentionArea && selectedCategory && selectedSubcategory);

  return (
    <div className="max-w-6xl mx-auto pb-2">
      {/* Encabezado */}
      <div className="mb-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo requerimiento</h1>
      </div>

      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0">
          <Form {...form}>
            <TooltipProvider delayDuration={300}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="ticket-form">
                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-medium mb-1">Clasifica tu solicitud</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Selecciona el área, categoría y subcategoría para continuar
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FormField
                      control={form.control}
                      name="attentionAreaId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(val) => {
                              const areaId = Number(val);
                              field.onChange(areaId);
                              handleAreaChange(areaId);
                            }}
                            value={field.value?.toString() ?? ""}
                            required
                          >
                            <FormControl>
                              <SelectTrigger
                                size="sm"
                                className={cn(
                                  "w-fit text-xs rounded-md border gap-1 pl-2.5 pr-1.5 max-w-[200px]",
                                  field.value
                                    ? "border-foreground/15 text-foreground"
                                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                                )}
                              >
                                <SelectValue placeholder="Área de atención" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {attentionAreas.map((area) => (
                                <SelectItem
                                  key={area.id}
                                  value={area.id.toString()}
                                  disabled={!area.isAcceptingTickets}
                                >
                                  {area.name} {!area.isAcceptingTickets && "(Cerrado)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <span className="text-muted-foreground/30 text-sm select-none">/</span>

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              setSelectedCategory(Number(val));
                              form.setValue("subcategoryId", 0);
                              setSelectedSubcategory(null);
                            }}
                            value={field.value?.toString() ?? ""}
                            disabled={!selectedAttentionArea || filteredCategories.length === 0}
                            required
                          >
                            <FormControl>
                              <SelectTrigger
                                size="sm"
                                className={cn(
                                  "w-fit text-xs rounded-md border gap-1 pl-2.5 pr-1.5 max-w-[200px]",
                                  field.value
                                    ? "border-foreground/15 text-foreground"
                                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                                )}
                              >
                                <SelectValue placeholder="Categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <span className="text-muted-foreground/30 text-sm select-none">/</span>

                    <FormField
                      control={form.control}
                      name="subcategoryId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              setSelectedSubcategory(Number(val));
                            }}
                            value={field.value ? field.value.toString() : ""}
                            disabled={!selectedCategory || currentSubcategories.length === 0}
                            required
                          >
                            <FormControl>
                              <SelectTrigger
                                size="sm"
                                className={cn(
                                  "w-fit text-xs rounded-md border gap-1 pl-2.5 pr-1.5 max-w-[200px]",
                                  field.value
                                    ? "border-foreground/15 text-foreground"
                                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                                )}
                              >
                                <SelectValue placeholder="Subcategoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currentSubcategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id.toString()}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    hasClassification
                      ? "grid-rows-[1fr] opacity-100 mt-5"
                      : "grid-rows-[0fr] opacity-0 mt-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="rounded-xl border border-border bg-card">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="p-0">
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                placeholder="¿Qué necesitas resolver?"
                                className="w-full bg-transparent text-xl font-medium placeholder:text-muted-foreground/50 outline-none px-6 pt-6 pb-2 tracking-tight"
                                autoComplete="off"
                                required
                              />
                            </FormControl>
                            <FormMessage className="px-6 pb-2" />
                          </FormItem>
                        )}
                      />

                      {/* Separador */}
                      <div className="mx-6 border-t border-border" />

                      <div className="px-6 pb-5 pt-4">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                Prioridad <span className="text-muted-foreground">*</span>
                              </FormLabel>
                              <p className="text-xs text-muted-foreground mb-2">
                                Define la urgencia de tu solicitud para ayudar al equipo a priorizar
                              </p>
                              <PrioritySelector value={field.value} onChange={field.onChange} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {isDiffusion && (
                        <>
                          <div className="mx-6 border-t border-border" />
                          <div className="px-6 pb-5 pt-4">
                            <DiffusionFields
                              form={form}
                              targetAudienceMode={targetAudienceMode}
                              setTargetAudienceMode={setTargetAudienceMode}
                              customTargetAudience={customTargetAudience}
                              setCustomTargetAudience={setCustomTargetAudience}
                            />
                          </div>
                        </>
                      )}

                      {isFondoEditorial && selectedSubcategoryName ? (
                        <>
                          <div className="mx-6 border-t border-border" />
                          <div className="px-6 pb-5 pt-4">
                            <FedFields
                              form={form}
                              subcategoryName={selectedSubcategoryName}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-card">
                      {/* Descripción */}
                      <div className="px-6 pt-5 pb-4">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                Descripción <span className="text-muted-foreground">*</span>
                              </FormLabel>
                              <p className="text-xs text-muted-foreground mb-1">
                                {isDiffusion
                                  ? "Recuerda que, para solicitar piezas gráficas u otros materiales, el texto debe estar previamente revisado y validado, cargado en Cendoc y compartido con todo el equipo del CIE en modo lector."
                                  : isFondoEditorial
                                    ? "Describe tu requerimiento con el mayor detalle posible (máximo 300 palabras)."
                                    : "Detalla el problema o solicitud. Incluye pasos para reproducirlo, contexto relevante y el resultado esperado."
                                }
                              </p>
                              <FormControl>
                                <RichTextEditor
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder={isDiffusion
                                    ? "Ej: Se requiere la difusión del evento de graduación 2026, que incluye..."
                                    : isFondoEditorial
                                      ? "Ej: Se requiere el diseño de una pieza gráfica para el evento de..."
                                      : "Ej: Al intentar acceder al sistema de notas, aparece un error 500. Esto ocurre desde ayer..."
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Archivos adjuntos — solo para áreas que no son Difusión */}
                      {(!isDiffusion && (!isFondoEditorial || (selectedSubcategoryName && getFedFieldConfig(selectedSubcategoryName)?.allowAttachments))) && (
                        <>
                          {/* Separador */}
                          <div className="mx-6 border-t border-border" />

                          <div className="px-6 pt-4 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm font-medium">Archivos adjuntos</p>
                              <span className="text-xs text-muted-foreground">(opcional)</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Adjunta capturas de pantalla, documentos u otros archivos relevantes. Máximo 5 MB por archivo.
                            </p>
                            <Suspense fallback={null}>
                              <FileUpload uploadToken={uploadToken} />
                            </Suspense>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-card p-5 lg:hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium">Notificar a</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Estos usuarios podrán dar seguimiento al ticket
                      </p>
                      <UserSelector
                        users={availableUsers}
                        selectedUserIds={selectedWatchers}
                        onSelectionChange={setSelectedWatchers}
                        placeholder="Buscar personas..."
                      />
                    </div>
                  </div>
                </div>

                {hasClassification && (
                  <div className="sticky bottom-0 mt-6 lg:hidden">
                    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-5 py-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {progress.completed} de {progress.total}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href="/dashboard">
                            <Button type="button" variant="ghost" size="sm">
                              Cancelar
                            </Button>
                          </Link>
                          <Button type="submit" size="sm" disabled={isPending}>
                            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Crear ticket
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </TooltipProvider>
          </Form>
        </div>

        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 sticky top-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            {/* Progreso — indicador compacto */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {progress.fields.map((field, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 w-5 rounded-full transition-colors duration-300",
                      field.done ? "bg-foreground" : "bg-muted-foreground/15"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {progress.completed}/{progress.total}
              </span>
            </div>

            <div className="border-t border-border" />

            {/* Contexto dinámico */}
            <div className="space-y-4">
              {/* Clasificación */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">
                    {sidebarContext.areaName}
                  </p>
                </div>

                {(sidebarContext.category || sidebarContext.subcategory) && (
                  <ul className="space-y-2.5 pl-1">
                    {sidebarContext.category && (
                      <li className="flex items-start gap-2.5">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold text-foreground/90 leading-snug">
                            {sidebarContext.category.name}
                          </p>
                          {sidebarContext.category.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {sidebarContext.category.description}
                            </p>
                          )}
                        </div>
                      </li>
                    )}
                    {sidebarContext.subcategory && (
                      <li className="flex items-start gap-2.5">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold text-foreground/90 leading-snug">
                            {sidebarContext.subcategory.name}
                          </p>
                          {sidebarContext.subcategory.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {sidebarContext.subcategory.description}
                            </p>
                          )}
                        </div>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Separador */}
              <div className="border-t border-border/50" />

              {/* Instrucciones */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">
                    Instrucciones
                  </p>
                </div>
                <ul className="space-y-2.5 pl-1">
                  {sidebarContext.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0" />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        {tip}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Aviso de emergencia */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200">¿Es un caso crítico?</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  Contáctanos directamente al chat grupal después de crear el ticket.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Notificar a (observadores) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-medium">Notificar a</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Estos usuarios podrán dar seguimiento al ticket
            </p>
            <UserSelector
              users={availableUsers}
              selectedUserIds={selectedWatchers}
              onSelectionChange={setSelectedWatchers}
              placeholder="Buscar personas..."
            />
          </div>

          {/* Tarjeta 3: Acciones */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              onClick={() => {
                const formEl = document.getElementById("ticket-form") as HTMLFormElement | null;
                if (formEl) formEl.requestSubmit();
              }}
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Crear ticket
            </Button>
            <Link href="/dashboard" className="block">
              <Button type="button" variant="ghost" size="sm" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
