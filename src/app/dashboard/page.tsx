import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/helpers";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi panel",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default async function DashboardRootPage() {
  const session = await requireAuth();

  // Direct render based on role - NO redirects for instant loading
  if (session.user.role === "admin") {
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (session.user.role === "agent") {
    // Check if agent has area assigned
    if (!session.user.attentionAreaId) {
      return (
        <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-background px-4">
          <div className="rounded-lg border bg-card p-8 text-center max-w-md shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-destructive">Acceso Restringido</h1>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Tu usuario tiene asignado el rol de <strong>Agente</strong>, pero no cuenta con un <strong>Área de Atención</strong> configurada en el sistema.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Por favor, contacta al administrador general para que habilite tu departamento.
            </p>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <AgentDashboard
          userId={session.user.id}
          attentionAreaId={session.user.attentionAreaId}
        />
      </Suspense>
    );
  }

  // Regular users
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UserDashboard userId={session.user.id} />
    </Suspense>
  );
}
