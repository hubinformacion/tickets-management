"use client";

import { useState, useMemo, useId } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface UserSelectorProps {
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
}

export function UserSelector({
  users,
  selectedUserIds,
  onSelectionChange,
  placeholder = "Seleccionar usuarios...",
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );

  const toggleUser = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUserIds.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            className="w-full justify-between text-xs bg-background hover:bg-[color-mix(in_oklab,var(--input)_50%,transparent)]"
          >
            <span className="truncate">
              {selectedUsers.length > 0
                ? `${selectedUsers.length} usuario${selectedUsers.length > 1 ? 's' : ''} seleccionado${selectedUsers.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuario..." />
            <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
            <CommandGroup id={listboxId} className="max-h-64 overflow-auto">
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => toggleUser(user.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserIds.includes(user.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.image || ""} referrerPolicy="no-referrer" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="max-h-36 overflow-y-auto rounded-md border border-border p-2 space-y-1">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-muted/50 group cursor-pointer"
            >
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={user.image || ""} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-[8px]">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate flex-1 min-w-0">{user.name}</span>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
