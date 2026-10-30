"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { searchProviderLinkedTicketsAction } from "@/actions/agent/search-provider-tickets";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import type { LinkedTicketOption } from "@/actions/agent/search-provider-tickets";

interface ProviderTicketPickerProps {
  value: number | null;
  onChange: (id: number | null) => void;
  initialTicket: LinkedTicketOption | null;
}

export function ProviderTicketPicker({ value, onChange, initialTicket }: ProviderTicketPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkedTicketOption[]>([]);
  const [picked, setPicked] = useState<LinkedTicketOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const listboxId = useId();
  const selected = results.find(item => item.id === value) ??
    (picked?.id === value ? picked : initialTicket?.id === value ? initialTicket : null);
  const tooShort = query.trim().length === 1;

  useEffect(() => {
    if (!open || query.trim().length === 1) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await searchProviderLinkedTicketsAction(query);
        if (!active) return;
        if ("error" in result) setError(result.error ?? "No se pudo realizar la búsqueda");
        else { setResults(result.tickets); setHasMore(result.hasMore); }
      } catch {
        if (active) setError("No se pudo realizar la búsqueda. Vuelve a intentar.");
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, retry]);

  return (
    <Popover open={open} onOpenChange={next => {
      setOpen(next);
      if (next) { setQuery(""); setResults([]); setHasMore(false); setError(null); setSearching(true); }
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-controls={listboxId} className={cn("w-full justify-between text-left text-sm font-normal", !value ? "text-muted-foreground" : "")}>
          <span className="truncate">{selected ? `${selected.ticketCode} — ${selected.title}` : "Buscar ticket por código o título..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar por código o título..." value={query} maxLength={120} onValueChange={next => {
            setQuery(next); setResults([]); setError(null); setHasMore(false); setSearching(next.trim().length !== 1);
          }} />
          <CommandList id={listboxId} aria-busy={searching}>
            <CommandGroup>
              <CommandItem value="clear" onSelect={() => { setPicked(null); onChange(null); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />Sin ticket vinculado
              </CommandItem>
            </CommandGroup>
            {tooShort ? <p role="status" className="p-3 text-sm text-muted-foreground">Escribe al menos dos caracteres.</p> : searching ? (
              <p role="status" className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando tickets...</p>
            ) : error ? (
              <div className="p-3"><p role="alert" className="text-sm text-destructive">{error}</p><Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setError(null); setSearching(true); setRetry(current => current + 1); }}>Reintentar</Button></div>
            ) : results.length === 0 ? <p role="status" className="p-3 text-sm text-muted-foreground">No se encontraron tickets.</p> : (
              <CommandGroup>{results.map(item => (
                <CommandItem key={item.id} value={String(item.id)} onSelect={() => { setPicked(item); onChange(item.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0"><span className="block font-mono text-xs">{item.ticketCode}</span><span className="block truncate text-xs text-muted-foreground">{item.title}</span></span>
                </CommandItem>
              ))}</CommandGroup>
            )}
            {!searching && !error && hasMore ? <p className="p-3 text-xs text-muted-foreground">Se muestran 25 resultados. Precisa la búsqueda para encontrar otros tickets.</p> : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
