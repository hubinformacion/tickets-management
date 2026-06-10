"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Plus, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { updateWatchersAction } from "@/actions/tickets";

interface User {
  id: string;
  name: string;
  image: string | null;
  email: string;
}

interface WatchersManagerProps {
  ticketId: number;
  currentWatchers: string[];
  allUsers: User[];
  currentUserId: string;  // Add current user ID to prevent self-watching
}

export function WatchersManager({ ticketId, currentWatchers, allUsers, currentUserId }: WatchersManagerProps) {
  const [open, setOpen] = useState(false);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>(currentWatchers);
  const [loading, setLoading] = useState(false);

  // Filter out current user from available watchers
  const availableUsers = allUsers.filter(user => user.id !== currentUserId);

  // Reset state when dialog opens to reflect current prop values
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedWatchers(currentWatchers);
    }
  };

  const handleToggleWatcher = (userId: string) => {
    setSelectedWatchers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateWatchersAction(ticketId, selectedWatchers);
      if (result.success) {
        toast.success("Observadores actualizados correctamente");
        setOpen(false);
      } else {
        toast.error(result.error || "Error al actualizar observadores");
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestionar seguimiento</DialogTitle>
          <DialogDescription>
            Añade o elimina usuarios que recibirán notificaciones sobre este ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedWatchers.map(watcherId => {
              const user = allUsers.find(u => u.id === watcherId);
              if (!user) return null;
              return (
                <Badge key={watcherId} variant="secondary" className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={user.image || undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {user.name}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1 hover:text-destructive"
                    onClick={() => handleToggleWatcher(watcherId)}
                  />
                </Badge>
              );
            })}
            {selectedWatchers.length === 0 && (
              <span className="text-sm text-muted-foreground italic">No hay observadores seleccionados</span>
            )}
          </div>

          <div className="border rounded-md">
            <Command>
              <CommandInput placeholder="Buscar usuario..." />
              <CommandList>
                <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                <CommandGroup heading="Usuarios">
                  {availableUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleToggleWatcher(user.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.image || undefined} referrerPolicy="no-referrer" />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      {selectedWatchers.includes(user.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
