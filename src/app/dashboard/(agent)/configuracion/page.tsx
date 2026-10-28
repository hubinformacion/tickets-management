import { db } from "@/db";
import { attentionAreas, ticketCategories, ticketSubcategories, priorityConfig, providers } from "@/db/schema";
import { getSession } from "@/lib/auth/helpers";
import { eq, asc } from "drizzle-orm";
import { SettingsTabs } from "@/components/agent/config-settings-tabs";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración del área",
};

export default async function ConfiguracionAgentePage() {
  // Authorization handled by (agent) layout
  const session = await getSession();
  if (!session?.user) return null;

  if (!session.user.attentionAreaId) {
    return <div>Error: No tienes área asignada.</div>;
  }

  // areaConfig and categories are independent — run in parallel
  const [areaConfig, categories, areaPriorityConfigs, areaProviders] = await Promise.all([
    db.query.attentionAreas.findFirst({
      where: eq(attentionAreas.id, session.user.attentionAreaId),
    }),
    db.query.ticketCategories.findMany({
      where: eq(ticketCategories.attentionAreaId, session.user.attentionAreaId),
      with: {
        subcategories: {
          orderBy: [asc(ticketSubcategories.displayOrder), asc(ticketSubcategories.id)],
        },
      },
      orderBy: [asc(ticketCategories.displayOrder), asc(ticketCategories.id)],
    }),
    db.query.priorityConfig.findMany({
      where: eq(priorityConfig.attentionAreaId, session.user.attentionAreaId),
    }),
    db.query.providers.findMany({
      where: eq(providers.attentionAreaId, session.user.attentionAreaId),
      orderBy: [asc(providers.name)],
    }),
  ]);

  if (!areaConfig) {
    return <div>Error: No se encontró la configuración del área.</div>;
  }

  // Subcategories depend on categories result
  const subcategories = await db.query.ticketSubcategories.findMany({
    where: (subcategories, { inArray }) =>
      inArray(subcategories.categoryId, categories.map(c => c.id)),
    with: {
      category: true,
    },
    orderBy: [asc(ticketSubcategories.categoryId), asc(ticketSubcategories.displayOrder), asc(ticketSubcategories.id)],
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb items={[{ label: "Configuración del área" }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del área</h1>
        <p className="text-muted-foreground mt-1">
          Administra las preferencias para {areaConfig.name}
        </p>
      </div>

      <SettingsTabs
        initialData={areaConfig}
        categories={categories}
        subcategories={subcategories}
        areaId={session.user.attentionAreaId}
        priorityConfigs={areaPriorityConfigs}
        providers={areaProviders}
      />
    </div>
  );
}
