"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STORAGE_KEY = "dashboard-collapsed-sections";

/** Lee el mapa de secciones colapsadas desde localStorage */
function getCollapsedMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** Persiste el estado colapsado de una sección */
function setCollapsedState(id: string, collapsed: boolean) {
  try {
    const map = getCollapsedMap();
    map[id] = collapsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Silently fail si localStorage no está disponible
  }
}

interface CollapsibleSectionProps {
  /** Identificador único para persistencia (ej: "agent-area-kpis") */
  id: string;
  /** Icono ya renderizado que se muestra al lado del título */
  icon: React.ReactNode;
  /** Título de la sección */
  title: string;
  /** Contenido del lado derecho del encabezado (ej: link "Ver todo el historial") */
  headerRight?: React.ReactNode;
  /** Contenido colapsable */
  children: React.ReactNode;
  /** Si la sección inicia colapsada por defecto (primera visita) */
  defaultCollapsed?: boolean;
}

export function CollapsibleSection({
  id,
  icon,
  title,
  headerRight,
  children,
  defaultCollapsed = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [hydrated, setHydrated] = useState(false);

  // Hidratar estado desde localStorage después del mount
  useEffect(() => {
    const map = getCollapsedMap();
    if (id in map) {
      setTimeout(() => setIsOpen(!map[id]), 0);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [id]);

  const handleToggle = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      setCollapsedState(id, !open);
    },
    [id]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 group cursor-pointer rounded-md px-1.5 -mx-1.5 py-1 hover:bg-muted/50 transition-colors"
          >
            {icon}
            <h2 className="text-base font-semibold select-none">{title}</h2>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                isOpen ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
        </CollapsibleTrigger>
        {headerRight ? (
          <div
            className={cn(
              "transition-opacity duration-200",
              !isOpen && "opacity-0 pointer-events-none"
            )}
          >
            {headerRight}
          </div>
        ) : null}
      </div>

      <CollapsibleContent
        className={cn(
          "overflow-hidden",
          hydrated &&
            "data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up"
        )}
      >
        <div className="pt-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
