"use client";

import { useState, useTransition, useMemo, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createProviderTicketAction,
  updateProviderTicketAction,
  closeProviderTicketAction,
  reopenProviderTicketAction,
  deleteProviderTicketAction,
} from "@/actions/agent/provider-tickets";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PROVIDER_TICKET_STATUS_LABELS, PROVIDER_TICKET_PRIORITY_LABELS, PROVIDER_TICKET_PRIORITY_STYLES, PROVIDER_SURVEY_QUESTIONS, SURVEY_RATING_STYLES, SURVEY_RATING_SELECTED_STYLES } from "@/lib/constants/tickets";
import type { SurveyRating } from "@/types";
import { cn } from "@/lib/utils/cn";
import { dayjs, formatDateShort } from "@/lib/utils/date";
import type { Provider, ProviderTicketStatus, ProviderTicketPriority } from "@/types";
import {
  CalendarIcon,
  Check,
  CheckCircle,
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { es } from "react-day-picker/locale";
import { toast } from "sonner";

const providerTicketSchema = z.object({
  externalCode: z.string().min(3, "El código debe tener al menos 3 caracteres"),
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  providerId: z.coerce.number().min(1, "Selecciona un proveedor"),
  requestDate: z.string().min(1, "La fecha de requerimiento es obligatoria"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  priority: z.enum(["none", "baja", "media", "alta", "critica"]).optional().or(z.literal("")),
  ticketId: z.number().nullable().optional(),
});
type ProviderTicketValues = z.infer<typeof providerTicketSchema>;

// --- Types ---

interface AreaTicket {
  id: number;
  ticketCode: string;
  title: string;
}

interface ProviderTicketRow {
  id: number;
  externalCode: string;
  title: string;
  requestDate: string;
  description: string;
  status: string;
  priority: string | null;
  providerId: number;
  ticketId: number | null;
  completionDate: string | null;
  attentionAreaId: number;
  requestedById: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  provider: {
    id: number;
    name: string;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  ticket: {
    id: number;
    ticketCode: string;
    title: string;
  } | null;
}

interface ProviderTicketsListProps {
  providerTickets: ProviderTicketRow[];
  providers: Provider[];
  areaTickets: AreaTicket[];
}

// --- Main Component ---

export function ProviderTicketsList({ providerTickets, providers, areaTickets }: ProviderTicketsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ProviderTicketRow | null>(null);

  // Close dialog state
  const [closingTicket, setClosingTicket] = useState<ProviderTicketRow | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Filters
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Derive unique providers from existing tickets for filter
  const providerOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of providerTickets) {
      map.set(t.provider.id, t.provider.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [providerTickets]);

  // Apply filters + sort (cerrados al final, más recientes primero)
  const filteredTickets = useMemo(() => {
    return providerTickets
      .filter((t) => {
        if (filterProvider !== "all" && t.providerId !== Number(filterProvider)) return false;
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        // Cerrados al final
        if (a.status === "cerrado" && b.status !== "cerrado") return 1;
        if (a.status !== "cerrado" && b.status === "cerrado") return -1;
        // Dentro del mismo grupo, más recientes primero
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [providerTickets, filterProvider, filterStatus]);

  // Delete handler
  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteProviderTicketAction(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket de proveedor eliminado");
        setDeleteId(null);
        router.refresh();
      }
    });
  };

  // Reopen handler
  const handleReopen = (id: number) => {
    startTransition(async () => {
      const result = await reopenProviderTicketAction(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ticket de proveedor reabierto");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Filters + New button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Provider filter */}
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los proveedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {providerOptions.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(PROVIDER_TICKET_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            setEditingTicket(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ticket de proveedor
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código externo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Fecha requerimiento</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Ticket vinculado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {providerTickets.length === 0
                    ? "No hay tickets de proveedores registrados."
                    : "No hay tickets que coincidan con los filtros."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-sm">{ticket.externalCode}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {ticket.title}
                  </TableCell>
                  <TableCell>{ticket.provider.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status as ProviderTicketStatus} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>{formatDateShort(ticket.requestDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <UserAvatar
                        name={ticket.requestedBy.name}
                        image={ticket.requestedBy.image}
                        size="sm"
                      />
                      <span className="text-sm truncate max-w-[100px]" title={ticket.requestedBy.name}>
                        {ticket.requestedBy.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ticket.ticket ? (
                      <Link
                        href={`/dashboard/tickets/${ticket.ticket.ticketCode}`}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {ticket.ticket.ticketCode}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit — disabled when closed */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTicket(ticket);
                          setIsDialogOpen(true);
                        }}
                        disabled={isPending || ticket.status === "cerrado"}
                        aria-label={`Editar ${ticket.externalCode}`}
                        title={ticket.status === "cerrado" ? "No se puede editar un ticket cerrado" : "Editar"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Close / Reopen */}
                      {ticket.status === "en_proceso" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setClosingTicket(ticket)}
                          disabled={isPending}
                          aria-label={`Cerrar ${ticket.externalCode}`}
                          title="Cerrar ticket"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReopen(ticket.id)}
                          disabled={isPending}
                          aria-label={`Reabrir ${ticket.externalCode}`}
                          title="Reabrir ticket"
                        >
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(ticket.id)}
                        disabled={isPending}
                        aria-label={`Eliminar ${ticket.externalCode}`}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filteredTickets.length} de {providerTickets.length} ticket{providerTickets.length !== 1 ? "s" : ""} de proveedor{providerTickets.length !== 1 ? "es" : ""}
      </p>

      {/* Create/Edit Dialog — key forces re-mount so state resets properly */}
      <ProviderTicketDialog
        key={editingTicket?.id ?? "new"}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ticket={editingTicket}
        providers={providers}
        areaTickets={areaTickets}
      />

      {/* Close Dialog */}
      <CloseProviderTicketDialog
        key={`close-${closingTicket?.id ?? "none"}`}
        open={closingTicket !== null}
        onOpenChange={(open) => !open && setClosingTicket(null)}
        ticket={closingTicket}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="¿Eliminar ticket de proveedor?"
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el ticket de proveedor."
      />
    </div>
  );
}

// --- Status Badge ---

function StatusBadge({ status }: { status: ProviderTicketStatus }) {
  const label = PROVIDER_TICKET_STATUS_LABELS[status] || status;
  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        status === "en_proceso"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      )}
    >
      {label}
    </div>
  );
}

// --- Priority Badge ---

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const label = PROVIDER_TICKET_PRIORITY_LABELS[priority as ProviderTicketPriority] || priority;
  const style = PROVIDER_TICKET_PRIORITY_STYLES[priority as ProviderTicketPriority] || "";
  return (
    <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", style)}>
      {label}
    </div>
  );
}

// --- Ticket Combobox (searchable by code or title) ---

function TicketCombobox({
  tickets,
  value,
  onChange,
}: {
  tickets: AreaTicket[];
  value: number | null;
  onChange: (ticketId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const selectedTicket = tickets.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className={cn(
            "w-full justify-between text-left font-normal text-sm",
            !value && "text-muted-foreground"
          )}
        >
          {selectedTicket
            ? `${selectedTicket.ticketCode} — ${selectedTicket.title.length > 30 ? selectedTicket.title.slice(0, 30) + "…" : selectedTicket.title}`
            : "Buscar ticket por código o título..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar ticket..." />
            <CommandList id={listboxId}>
            <CommandEmpty>No se encontraron tickets.</CommandEmpty>
            <CommandGroup>
              {/* Option to clear selection */}
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">Sin ticket vinculado</span>
              </CommandItem>
              {tickets.map((ticket) => (
                <CommandItem
                  key={ticket.id}
                  value={`${ticket.ticketCode} ${ticket.title}`}
                  onSelect={() => {
                    onChange(ticket.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === ticket.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{ticket.ticketCode}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[320px]">
                      {ticket.title}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- Close Provider Ticket Dialog (completionDate obligatorio + encuesta opcional) ---

type ProviderSurveyKey = typeof PROVIDER_SURVEY_QUESTIONS[number]["key"];

function CloseProviderTicketDialog({
  open,
  onOpenChange,
  ticket,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: ProviderTicketRow | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completionDate, setCompletionDate] = useState<string>("");
  const [includeSurvey, setIncludeSurvey] = useState(false);
  const [ratings, setRatings] = useState<Partial<Record<ProviderSurveyKey, number>>>({});

  function resetForm() {
    setCompletionDate("");
    setIncludeSurvey(false);
    setRatings({});
  }

  const allRatingsFilled = includeSurvey
    ? PROVIDER_SURVEY_QUESTIONS.every((q) => ratings[q.key] !== undefined)
    : true;

  function handleClose() {
    if (!ticket) return;
    if (!completionDate) {
      toast.error("Selecciona la fecha de atención para cerrar el ticket");
      return;
    }
    if (includeSurvey && !allRatingsFilled) {
      toast.error("Completa todas las calificaciones antes de cerrar");
      return;
    }

    const formData = new FormData();
    formData.set("id", ticket.id.toString());
    formData.set("completionDate", completionDate);

    if (includeSurvey && allRatingsFilled) {
      PROVIDER_SURVEY_QUESTIONS.forEach((q) => {
        formData.set(q.key, ratings[q.key]!.toString());
      });
    }

    startTransition(async () => {
      const result = await closeProviderTicketAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          includeSurvey && allRatingsFilled
            ? "Ticket cerrado y evaluación registrada"
            : "Ticket de proveedor cerrado"
        );
        onOpenChange(false);
        resetForm();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cerrar ticket de proveedor</DialogTitle>
          <DialogDescription>
            {ticket
              ? `Vas a cerrar "${ticket.externalCode}". Indica la fecha de atención y, opcionalmente, evalúa al proveedor.`
              : "Indica la fecha de atención para cerrar el ticket."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Fecha de atención */}
          <div className="grid gap-2">
            <Label>Fecha de atención <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !completionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completionDate
                    ? dayjs(completionDate).format("D [de] MMMM [de] YYYY")
                    : "Selecciona la fecha de atención"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  locale={es}
                  mode="single"
                  selected={completionDate ? new Date(completionDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    setCompletionDate(date ? dayjs(date).format("YYYY-MM-DD") : "");
                  }}
                  disabled={(date) => {
                    if (!ticket) return false;
                    const selected = dayjs(date).startOf("day");
                    return selected.isBefore(dayjs(ticket.requestDate).startOf("day")) || selected.isAfter(dayjs().startOf("day"));
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Fecha en la que el proveedor atendió el requerimiento.
            </p>
          </div>

          {/* Toggle para encuesta */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIncludeSurvey((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                Evaluar al proveedor
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                includeSurvey
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {includeSurvey ? "Activada" : "Omitir"}
              </span>
            </button>

            {includeSurvey && (
              <div className="px-4 py-4 space-y-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Califica del 1 (muy malo) al 5 (excelente) el desempeño del proveedor.
                </p>

                {PROVIDER_SURVEY_QUESTIONS.map((q) => (
                  <div key={q.key} className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{q.label}</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">
                        {q.lowLabel}
                      </span>
                      <div className="flex gap-1.5 flex-1 justify-center">
                        {([1, 2, 3, 4, 5] as SurveyRating[]).map((val) => (
                          <button
                            key={val}
                            type="button"
                            disabled={isPending}
                            onClick={() => setRatings((prev) => ({ ...prev, [q.key]: val }))}
                            className={cn(
                              "h-9 w-9 rounded-lg border text-sm font-bold transition-all duration-200 cursor-pointer",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                              ratings[q.key] === val
                                ? SURVEY_RATING_SELECTED_STYLES[val]
                                : SURVEY_RATING_STYLES[val],
                              isPending && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                        {q.highLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={isPending || !completionDate || (includeSurvey && !allRatingsFilled)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {includeSurvey ? "Cerrar y evaluar" : "Cerrar ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// --- Create/Edit Dialog ---

function ProviderTicketDialog({
  open,
  onOpenChange,
  ticket,
  providers,
  areaTickets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: ProviderTicketRow | null;
  providers: Provider[];
  areaTickets: AreaTicket[];
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.input<typeof providerTicketSchema>, unknown, ProviderTicketValues>({
    resolver: zodResolver(providerTicketSchema),
    defaultValues: {
      externalCode: ticket?.externalCode || "",
      title: ticket?.title || "",
      providerId: ticket?.providerId || ("" as unknown as number),
      requestDate: ticket?.requestDate || "",
      description: ticket?.description || "",
      priority: (ticket?.priority as ProviderTicketValues["priority"]) || "none",
      ticketId: ticket?.ticketId || null,
    },
  });

  async function onSubmit(data: ProviderTicketValues) {
    const formData = new FormData();
    formData.set("externalCode", data.externalCode);
    formData.set("title", data.title);
    formData.set("providerId", data.providerId.toString());
    formData.set("requestDate", data.requestDate);
    formData.set("description", data.description);
    
    if (data.priority && data.priority !== "none") {
      formData.set("priority", data.priority);
    }
    if (data.ticketId) {
      formData.set("ticketId", data.ticketId.toString());
    }

    startTransition(async () => {
      if (ticket) {
        formData.append("id", ticket.id.toString());
        formData.set("status", ticket.status);
        if (ticket.completionDate) {
          formData.set("completionDate", ticket.completionDate);
        }
        const result = await updateProviderTicketAction(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Ticket de proveedor actualizado");
          onOpenChange(false);
        }
      } else {
        const result = await createProviderTicketAction(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Ticket de proveedor creado");
          onOpenChange(false);
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticket ? "Editar ticket de proveedor" : "Nuevo ticket de proveedor"}
          </DialogTitle>
          <DialogDescription>
            {ticket
              ? "Modifica los datos del ticket de proveedor."
              : "Registra un nuevo ticket de proveedor externo."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* External Code */}
            <FormField
              control={form.control}
              name="externalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código externo <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: TK-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción breve del requerimiento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Provider */}
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Request Date */}
            <FormField
              control={form.control}
              name="requestDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de requerimiento <span className="text-destructive">*</span></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            dayjs(field.value).format("D [de] MMMM [de] YYYY")
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        locale={es}
                        mode="single"
                        selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                        onSelect={(date) => field.onChange(date ? dayjs(date).format("YYYY-MM-DD") : "")}
                        disabled={(date) => date > new Date()}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle del requerimiento al proveedor"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad <span className="text-muted-foreground text-xs font-normal">(opcional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una prioridad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin prioridad</SelectItem>
                      {Object.entries(PROVIDER_TICKET_PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked Ticket (searchable combobox) */}
            <FormField
              control={form.control}
              name="ticketId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ticket vinculado <span className="text-muted-foreground text-xs font-normal">(opcional)</span></FormLabel>
                  <TicketCombobox
                    tickets={areaTickets}
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
