import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { getAppSetting } from "@/db/queries";
import dynamic from "next/dynamic";
import { getActiveCategories, getActiveAttentionAreas } from "@/actions/config/get-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuevo ticket",
};

const NewTicketForm = dynamic(
  () => import("@/components/tickets/ticket-form").then(mod => ({ default: mod.NewTicketForm }))
);

export default async function NuevoTicketPage() {
  await requireAuth();

  // All queries are independent after session — run in parallel
  const [
    availableUsers,
    allowNewTicketsSetting,
    categories,
    attentionAreas,
    disabledMessage,
    priorityConfigs,
  ] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image
    }).from(users),
    getAppSetting("allow_new_tickets"),
    getActiveCategories(),
    getActiveAttentionAreas(),
    getAppSetting("ticket_disabled_message"),
    db.query.priorityConfig.findMany(),
  ]);

  const allowNewTickets = allowNewTicketsSetting !== "false";

  return (
    <NewTicketForm
      availableUsers={availableUsers}
      allowNewTickets={allowNewTickets}
      categories={categories}
      attentionAreas={attentionAreas}
      disabledMessage={disabledMessage}
      priorityConfigs={priorityConfigs}
    />
  );
}
