"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Agent {
  id: string;
  name: string;
}

interface AttentionArea {
  id: number;
  name: string;
}

interface SurveyFiltersProps {
  agents: Agent[];
  attentionAreas?: AttentionArea[];
}

export function SurveyFilters({ agents, attentionAreas = [] }: SurveyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get("agentId") ?? "";
  const currentArea = searchParams.get("areaId") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const hasFilters = currentAgent || currentArea || currentDateFrom || currentDateTo;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const clearFilters = () => {
    router.push("?", { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Area filter (admin only) */}
      {attentionAreas.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="area-filter" className="text-sm text-muted-foreground whitespace-nowrap">
            Área
          </label>
          <select
            id="area-filter"
            value={currentArea}
            onChange={(e) => updateParams({ areaId: e.target.value })}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="">Todas las áreas</option>
            {attentionAreas.map((a) => (
              <option key={a.id} value={a.id.toString()}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Agent filter */}
      {agents.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="agent-filter" className="text-sm text-muted-foreground whitespace-nowrap">
            Agente
          </label>
          <select
            id="agent-filter"
            value={currentAgent}
            onChange={(e) => updateParams({ agentId: e.target.value })}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
          >
            <option value="">Todos</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date from */}
      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-sm text-muted-foreground whitespace-nowrap">
          Desde
        </label>
        <input
          id="date-from"
          type="date"
          value={currentDateFrom}
          onChange={(e) => updateParams({ dateFrom: e.target.value })}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
        />
      </div>

      {/* Date to */}
      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-sm text-muted-foreground whitespace-nowrap">
          Hasta
        </label>
        <input
          id="date-to"
          type="date"
          value={currentDateTo}
          onChange={(e) => updateParams({ dateTo: e.target.value })}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

