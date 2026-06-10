"use client";

import { useRef, useState, useId } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { STATUS_LABELS, STATUS_DB_TO_URL } from "@/lib/constants/tickets";
import type { TicketStatus } from "@/types";

const STATUS_OPTIONS: { value: string; label: string }[] = (
  Object.entries(STATUS_DB_TO_URL) as [TicketStatus, string][]
).map(([dbValue, urlSlug]) => ({
  value: urlSlug,
  label: STATUS_LABELS[dbValue],
}));

interface StatusFilterProps {
  /** Slugs en español seleccionados (ej: ["abierto", "en_progreso"]) */
  value: string[];
  onChange: (values: string[]) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const toggleValue = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((v) => v !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const getLabel = () => {
    if (value.length === 0) return "Todos los estados";
    if (value.length === 1) {
      const option = STATUS_OPTIONS.find((o) => o.value === value[0]);
      return option?.label ?? value[0];
    }
    return `${value.length} estados`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className="w-[200px] justify-between bg-transparent font-normal"
        >
          <span className="truncate">{getLabel()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[200px]"
        align="start"
      >
        <Command>
          <CommandList id={listboxId}>
            <CommandGroup>
              {STATUS_OPTIONS.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleValue(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px]",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-neutral-400 dark:border-neutral-500"
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5 text-white stroke-3" /> : null}
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
