import { queryUsersPaginated } from "@/db/queries";
import { getSession } from "@/lib/auth/helpers";
import { RolesTable } from "@/components/admin/roles-table";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestión de usuarios",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UsuariosPage({ searchParams }: PageProps) {
  // Authorization handled by (admin) layout
  const session = await getSession();
  if (!session?.user) return null;

  const params = await searchParams;
  const search = typeof params.buscar === "string" ? params.buscar : undefined;
  const page = typeof params.pagina === "string" ? Number(params.pagina) : 1;
  const perPage = typeof params.porPagina === "string" ? Number(params.porPagina) : 10;

  const { getActiveAttentionAreas } = await import("@/actions/config/get-config");
  const [paginatedUsers, attentionAreas] = await Promise.all([
    queryUsersPaginated(search, page, perPage),
    getActiveAttentionAreas(),
  ]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb items={[{ label: "Gestión de usuarios" }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de usuarios</h1>
        <p className="text-muted-foreground mt-1">Administra los roles de los usuarios del sistema</p>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-lg" />}>
        <RolesTable
          users={paginatedUsers.rows}
          totalCount={paginatedUsers.totalCount}
          currentUserId={session.user.id}
          attentionAreas={attentionAreas}
        />
      </Suspense>
    </div>
  );
}
