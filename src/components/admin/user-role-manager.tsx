"use client";

import { updateUserRole } from "@/actions/admin/user-management";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings, Shield, User, UserCog } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AttentionArea {
  id: number;
  name: string;
}

interface UserRoleManagerProps {
  userId: string;
  userName: string;
  currentRole: string;
  currentAttentionAreaId?: number | null;
  attentionAreas: AttentionArea[];
  disabled?: boolean;
}

export function UserRoleManager({
  userId,
  userName,
  currentRole,
  currentAttentionAreaId,
  attentionAreas,
  disabled
}: UserRoleManagerProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedAreaId, setSelectedAreaId] = useState<number | undefined>(
    currentAttentionAreaId ? Number(currentAttentionAreaId) : undefined
  );
  const [isPending, startTransition] = useTransition();

  // Reset state when dialog opens to reflect current prop values
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedRole(currentRole);
      setSelectedAreaId(currentAttentionAreaId ? Number(currentAttentionAreaId) : undefined);
    }
  };

  const handleSave = () => {
    if (selectedRole === "agent" && !selectedAreaId) {
      toast.error("Debes seleccionar un área de atención para el agente");
      return;
    }

    startTransition(async () => {
      const result = await updateUserRole(userId, selectedRole, selectedAreaId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Rol actualizado correctamente");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Settings className="mr-2 h-4 w-4" />
          Gestionar rol
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestionar rol de usuario</DialogTitle>
          <DialogDescription>
            Configura el rol y permisos para {userName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Rol del Sistema</Label>
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole(val);
                // Reset area if not agent
                if (val !== "agent") {
                  setSelectedAreaId(undefined);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    Usuario
                    <span className="ml-2 text-xs text-muted-foreground">(Acceso básico)</span>
                  </div>
                </SelectItem>
                <SelectItem value="agent">
                  <div className="flex items-center">
                    <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                    Agente
                    <span className="ml-2 text-xs text-muted-foreground">(Atención de Tickets)</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center">
                    <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                    Administrador
                    <span className="ml-2 text-xs text-muted-foreground">(Control total)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === "agent" && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <Label>Área de Atención</Label>
              <Select
                value={selectedAreaId?.toString()}
                onValueChange={(val) => setSelectedAreaId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área..." />
                </SelectTrigger>
                <SelectContent>
                  {attentionAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.8rem] text-muted-foreground">
                El agente solo podrá ver y gestionar tickets de esta área.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
