"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRIORITY_STYLES } from "@/lib/constants/ticket-display";
import { PRIORITY_LABELS } from "@/lib/constants/tickets";
import { PRIORITY_DEFINITIONS } from "@/lib/constants/priority-info";
import { cn } from "@/lib/utils/cn";
import type { TicketPriority } from "@/types";

const PRIORITIES = (Object.keys(PRIORITY_STYLES) as TicketPriority[]).map((value) => {
  const style = PRIORITY_STYLES[value];
  return {
    value,
    label: PRIORITY_LABELS[value],
    activeColor: `${style.bg} ${style.text} ${style.border}`,
    inactiveColor: "bg-muted hover:bg-muted/80 text-muted-foreground border-transparent",
    hover: style.hover,
  };
});

interface PrioritySelectorProps {
  value: TicketPriority | null | undefined;
  onChange: (value: TicketPriority) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PRIORITIES.map((priority) => (
        <Tooltip key={priority.value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange(priority.value)}
              className={cn(
                "py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer text-center",
                value === priority.value
                  ? priority.activeColor
                  : cn("bg-background text-muted-foreground border-input/30 hover:border-input", priority.hover)
              )}
            >
              {priority.label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[200px] p-3 space-y-1.5" align="center">
            <p className="font-semibold opacity-90">{priority.label}</p>
            <p className="opacity-70 leading-snug">{PRIORITY_DEFINITIONS[priority.value].description}</p>
            <div className="flex items-center gap-1.5 pt-1 border-t border-background/20 mt-1">
              <span className="text-[10px] font-medium opacity-90">SLA:</span>
              <span className="text-[10px] opacity-70">{PRIORITY_DEFINITIONS[priority.value].sla}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
