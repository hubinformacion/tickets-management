"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/client";
import {
  Loader2,
  Monitor,
  TicketCheck,
  MessagesSquare,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const features = [
  {
    icon: TicketCheck,
    title: "Registro de solicitudes",
    description: "Crea y da seguimiento a tus requerimientos técnicos.",
  },
  {
    icon: MessagesSquare,
    title: "Comunicación directa",
    description: "Comentarios y actualizaciones en tiempo real.",
  },
  {
    icon: BarChart3,
    title: "Visibilidad del estado",
    description:
      "Consulta el progreso y la prioridad de cada solicitud.",
  },
];

interface LoginFormProps {
  accountInactive?: boolean;
}

export function LoginForm({ accountInactive = false }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.refresh(),
          onError: () => {
            toast.error("No se pudo cerrar la sesión. Intenta de nuevo.");
          },
        },
      });
    } catch {
      toast.error("No se pudo cerrar la sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al iniciar sesión");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Panel de branding - visible en desktop */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-foreground text-background flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-background/10 border border-background/15">
            <Monitor className="size-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium tracking-wide uppercase opacity-80">
            Tecnologías y sistemas de información
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1]">
            Gestión de{" "}
            <span className="block">requerimientos</span>
          </h1>
          <p className="text-background/60 text-lg leading-relaxed max-w-md">
            Registra, consulta y da seguimiento a tus solicitudes de
            soporte técnico desde un solo lugar.
          </p>
        </div>

        <p className="text-background/40 text-sm">
          Acceso exclusivo para personal autorizado
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-10">
          {/* Header con branding - solo mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
              <Monitor className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                Gestión de requerimientos
              </p>
              <p className="text-xs text-muted-foreground">
                Continental
              </p>
            </div>
          </div>

          {/* Título y acción */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Te damos la bienvenida
              </h2>
              {accountInactive ? (
                <p role="alert" className="text-destructive text-sm">
                  Tu cuenta está desactivada. Contacta al administrador para recuperar el acceso.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Ingresa con tu cuenta institucional para continuar.
                </p>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              onClick={accountInactive ? handleSignOut : handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2.5 size-4 animate-spin" />
              ) : accountInactive ? null : (
                <svg
                  className="mr-2.5 size-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {accountInactive
                ? isLoading ? "Cerrando sesión..." : "Cerrar sesión"
                : isLoading ? "Redirigiendo..." : "Ingresar con Google"}
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="space-y-5">
            <Separator />
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <feature.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-tight">
                      {feature.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
