"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { YearFilter } from "@/components/tickets/year-filter";
import { StatusFilter } from "@/components/tickets/status-filter";
import { dayjs } from "@/lib/utils/date";

interface TicketFiltersProps {
  assignedUsers: Array<{ id: string; name: string }>;
  categories?: Array<{ id: number; name: string }>;
  subcategories?: Array<{ id: number; name: string; categoryId: number | null }>;
  attentionAreas?: Array<{ id: number; name: string }>;
}

const EMPTY_ARRAY: Array<never> = [];

export function TicketFilters({ assignedUsers, categories = EMPTY_ARRAY, subcategories = EMPTY_ARRAY, attentionAreas = EMPTY_ARRAY }: TicketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const estado = searchParams.get("estado") ?? "";
  const asignado = searchParams.get("asignado") ?? "";
  const area = searchParams.get("area") ?? "";
  const categoria = searchParams.get("categoria") ?? "";
  const subcategoria = searchParams.get("subcategoria") ?? "";
  const anio = searchParams.get("anio") ?? "all";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  // Rango derivado de la URL (fuente de verdad)
  // IMPORTANTE: usar dayjs() en vez de new Date() para parsear como hora local.
  // new Date("2026-03-01") interpreta como UTC → se desfasa un día en UTC-5.
  const urlDateRange: DateRange | undefined = desde
    ? { from: dayjs(desde).toDate(), to: hasta ? dayjs(hasta).toDate() : undefined }
    : undefined;

  // Estado local para la selección interactiva del rango
  // Permite al usuario hacer 2 clics sin que la URL se actualice en cada clic
  const [localRange, setLocalRange] = useState<DateRange | undefined>(urlDateRange);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sincronizar estado local cuando la URL cambia externamente (ej: limpiar filtros)
  useEffect(() => {
    setLocalRange(urlDateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  // Parsear estado como array de slugs
  const estadoValues = estado ? estado.split(",").filter(Boolean) : [];

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pagina");
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleStatusChange = (values: string[]) => {
    updateParams({ estado: values.length > 0 ? values.join(",") : "" });
  };

  const handleAssignedToChange = (value: string) => {
    updateParams({ asignado: value === "all" ? "" : value });
  };

  const handleLocalRangeChange = (range: DateRange | undefined) => {
    setLocalRange(range);

    // Solo actualizar URL cuando el rango esté completo (from + to)
    if (range?.from && range?.to) {
      updateParams({
        desde: dayjs(range.from).format("YYYY-MM-DD"),
        hasta: dayjs(range.to).format("YYYY-MM-DD"),
      });
    }
  };

  // Al cerrar el popover, si solo hay from sin to, limpiar el estado local
  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (!open && localRange?.from && !localRange?.to) {
      // El usuario cerró sin completar el rango, restaurar al estado de la URL
      setLocalRange(urlDateRange);
    }
  };

  const clearDateRange = () => {
    setLocalRange(undefined);
    updateParams({ desde: "", hasta: "" });
  };

  const handleCategoryChange = (value: string) => {
    updateParams({
      categoria: value === "all" ? "" : value,
      subcategoria: ""
    });
  };

  const handleSubcategoryChange = (value: string) => {
    updateParams({ subcategoria: value === "all" ? "" : value });
  };

  const handleYearChange = (value: string) => {
    updateParams({ anio: value });
  };

  const clearFilters = () => {
    setLocalRange(undefined);
    router.push("?", { scroll: false });
  };

  // Usar urlDateRange para "active filters" (sólo filtros ya aplicados)
  const hasActiveFilters = estado || asignado || area || urlDateRange || categoria || subcategoria || (anio && anio !== "all");

  const availableSubcategories = categoria && categoria !== 'all'
    ? subcategories.filter(s => s.categoryId === Number(categoria))
    : [];

  // Texto de display del rango — usar urlDateRange (lo aplicado)
  const displayRange = urlDateRange;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <StatusFilter value={estadoValues} onChange={handleStatusChange} />

      <Select value={asignado || "all"} onValueChange={handleAssignedToChange}>
        <SelectTrigger className="w-[200px] bg-transparent">
          <SelectValue placeholder="Asignado a" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="sin_asignar">Sin asignar</SelectItem>
          {assignedUsers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {attentionAreas.length > 0 && (
        <Select
          value={area || "all"}
          onValueChange={(v) => updateParams({ area: v === "all" ? "" : v, pagina: "" })}
        >
          <SelectTrigger className="w-[200px] bg-transparent">
            <SelectValue placeholder="Área de atención" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {attentionAreas.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {categories.length > 0 && (
        <Select value={categoria || "all"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px] bg-transparent">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {categoria && availableSubcategories.length > 0 && (
        <Select value={subcategoria || "all"} onValueChange={handleSubcategoryChange}>
          <SelectTrigger className="w-[200px] bg-transparent">
            <SelectValue placeholder="Subcategoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las subcategorías</SelectItem>
            {availableSubcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id.toString()}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[280px] justify-start text-left font-normal bg-transparent">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayRange?.from ? (
              displayRange.to ? (
                <>
                  {dayjs(displayRange.from).format("DD MMM")} -{" "}
                  {dayjs(displayRange.to).format("DD MMM YYYY")}
                </>
              ) : (
                dayjs(displayRange.from).format("DD MMM YYYY")
              )
            ) : (
              <span>Rango de fechas</span>
            )}
            {displayRange ? (
              <span
                role="button"
                tabIndex={0}
                className="ml-auto rounded-sm opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDateRange();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    clearDateRange();
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={localRange?.from}
            selected={localRange}
            onSelect={handleLocalRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <YearFilter value={anio} onChange={handleYearChange} />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
