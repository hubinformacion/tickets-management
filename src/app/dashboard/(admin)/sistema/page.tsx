import { db } from "@/db";
import { ticketCategories, ticketSubcategories, attentionAreas, providers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getAppSetting } from "@/db/queries";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración del sistema",
};

export default async function SistemaPage() {
  const [
    allowNewTicketsSetting,
    disabledMessageSetting,
    knowledgeBaseUrlSetting,
    categories,
    subcategories,
    attentionAreasList,
    priorityConfigs,
    providersList,
  ] = await Promise.all([
    getAppSetting("allow_new_tickets"),
    getAppSetting("ticket_disabled_message"),
    getAppSetting("knowledge_base_url"),
    db.query.ticketCategories.findMany({
      orderBy: [asc(ticketCategories.attentionAreaId), asc(ticketCategories.displayOrder), asc(ticketCategories.id)],
      with: {
        subcategories: true,
      },
    }),
    db.query.ticketSubcategories.findMany({
      orderBy: [asc(ticketSubcategories.categoryId), asc(ticketSubcategories.displayOrder), asc(ticketSubcategories.id)],
      with: {
        category: true,
      },
    }),
    db.query.attentionAreas.findMany({
      orderBy: [asc(attentionAreas.name)],
    }),
    db.query.priorityConfig.findMany(),
    db.query.providers.findMany({
      orderBy: [asc(providers.name)],
    }),
  ]);

  const allowNewTickets = allowNewTicketsSetting === null || allowNewTicketsSetting === "true";
  const disabledMessage = disabledMessageSetting || "";
  const knowledgeBaseUrl = knowledgeBaseUrlSetting || "";

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Configuración del sistema" }]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración del sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">Administra las opciones globales del sistema</p>
      </div>

      <AdminSettingsTabs
        initialAllowNewTickets={allowNewTickets}
        initialDisabledMessage={disabledMessage}
        initialKnowledgeBaseUrl={knowledgeBaseUrl}
        initialCategories={categories}
        initialSubcategories={subcategories}
        initialAttentionAreas={attentionAreasList}
        initialPriorityConfigs={priorityConfigs}
        initialProviders={providersList}
      />
    </div>
  );
}

import { AdminSettingsTabs } from "@/components/admin/admin-settings-tabs";
