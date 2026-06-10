import { db } from "@/db";
import { tickets, users, comments, attentionAreas } from "@/db/schema";
import { sql, count, eq, desc, and } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users as UsersIcon,
  MessageSquare,
  Building2,
  Activity,
  HourglassIcon,
  TrendingUp,
  Timer,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

function avgDays(val: number): string {
  return val > 0 ? val.toFixed(1) : "—";
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export async function AdminDashboard() {
  const [
    [totalTicketsRes],
    statusStats,
    usersByRole,
    [totalAreasRes],
    [totalCommentsRes],
    recentUsers,
    ticketsByArea,
    [avgTimeRes],
  ] = await Promise.all([
    db.select({ count: count() }).from(tickets),
    db.select({ status: tickets.status, count: count() }).from(tickets).groupBy(tickets.status),
    db.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
    db.select({ count: count() }).from(attentionAreas),
    db.select({ count: count() }).from(comments),
    db.query.users.findMany({ limit: 5, orderBy: (users, { desc }) => [desc(users.createdAt)] }),
    db.select({
      areaId: tickets.attentionAreaId,
      status: tickets.status,
      count: count(),
    })
      .from(tickets)
      .where(sql`${tickets.attentionAreaId} IS NOT NULL`)
      .groupBy(tickets.attentionAreaId, tickets.status),
    // Avg attention time (days) globally
    db.select({
      avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${tickets.closedAt} - ${tickets.createdAt})) / 86400), 0)`,
    })
      .from(tickets)
      .where(and(eq(tickets.status, "resolved"), sql`${tickets.closedAt} IS NOT NULL`)),
  ]);

  const getStat = (status: string) => statusStats.find(s => s.status === status)?.count || 0;
  const getUsersStat = (role: string) => usersByRole.find(r => r.role === role)?.count || 0;

  const totalTickets = totalTicketsRes.count;
  const resolvedCount = getStat("resolved");
  const activeCount = getStat("open") + getStat("in_progress") + getStat("pending_validation");
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  // Resolve area names
  const uniqueAreaIds = [...new Set(ticketsByArea.map(t => t.areaId!))].filter(Boolean);
  const areasWithTickets = uniqueAreaIds.length > 0
    ? await db.query.attentionAreas.findMany({
      where: (areas, { inArray }) => inArray(areas.id, uniqueAreaIds),
    })
    : [];

  // Build area ranking rows
  const areaRows = areasWithTickets.map((area) => {
    const getStatusCount = (st: string) =>
      ticketsByArea.find((t) => t.areaId === area.id && t.status === st)?.count ?? 0;
    const open = getStatusCount("open");
    const inProgress = getStatusCount("in_progress");
    const pendingValidation = getStatusCount("pending_validation");
    const resolved = getStatusCount("resolved");
    const total = open + inProgress + pendingValidation + resolved + getStatusCount("voided");
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { name: area.name, open, inProgress, pendingValidation, resolved, total, rate };
  }).sort((a, b) => (b.open + b.inProgress + b.pendingValidation) - (a.open + a.inProgress + a.pendingValidation));

  const mainKpis = [
    { title: "Total tickets", value: totalTickets, icon: Ticket, iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400", barColor: "bg-blue-500", max: totalTickets || 1 },
    { title: "Abiertos", value: getStat("open"), icon: AlertCircle, iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400", barColor: "bg-orange-500", max: activeCount || 1 },
    { title: "En proceso", value: getStat("in_progress"), icon: Clock, iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400", barColor: "bg-blue-500", max: activeCount || 1 },
    { title: "Pend. validación", value: getStat("pending_validation"), icon: HourglassIcon, iconBg: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400", barColor: "bg-yellow-500", max: activeCount || 1 },
    { title: "Resueltos", value: resolvedCount, icon: CheckCircle2, iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400", barColor: "bg-emerald-500", max: totalTickets || 1 },
    { title: "Tasa de resolución", value: `${resolutionRate}%`, rawValue: resolutionRate, icon: TrendingUp, iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400", barColor: resolutionRate >= 70 ? "bg-emerald-500" : resolutionRate >= 40 ? "bg-yellow-500" : "bg-red-500", max: 100 },
    { title: "T. prom. atención", value: `${avgDays(Number(avgTimeRes?.avgDays ?? 0))}d`, rawValue: 0, icon: Timer, iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400", barColor: "bg-indigo-500", max: 1 },
  ];

  const totalUsers = getUsersStat("user") + getUsersStat("agent") + getUsersStat("admin");

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Panel de control" }]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de control</h1>
        <p className="text-muted-foreground mt-1">Bienvenido, administrador. Aquí tienes un resumen del sistema.</p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {mainKpis.map(({ title, value, rawValue, icon: Icon, iconBg, barColor, max }) => (
          <Card key={title}>
            <CardContent className="pt-4 pb-4">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground leading-tight mb-1">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <MiniBar value={rawValue ?? (value as number)} max={max} color={barColor} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area Ranking Table */}
      {areaRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Ranking por área de atención
            </CardTitle>
            <CardDescription>Comparativa de carga activa y tasa de resolución por departamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Área</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Abiertos</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">En proceso</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Pend. val.</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Resueltos</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-36">% Resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {areaRows.map((row) => (
                    <tr key={row.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{row.name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("font-semibold", row.open > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>{row.open}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("font-semibold", row.inProgress > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>{row.inProgress}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("font-semibold", row.pendingValidation > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground")}>{row.pendingValidation}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn("font-semibold", row.resolved > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{row.resolved}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">{row.total}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", row.rate >= 70 ? "bg-emerald-500" : row.rate >= 40 ? "bg-yellow-500" : "bg-red-500")}
                              style={{ width: `${row.rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums w-8 text-right">{row.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* System Activity + Recent Users */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividad del sistema</CardTitle>
            <CardDescription>Estadísticas de participación y comunidad</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center">
              <div className="bg-muted p-3 rounded-full mr-4">
                <UsersIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Usuarios totales</p>
                <p className="text-sm text-muted-foreground">
                  {getUsersStat("user")} usuarios · {getUsersStat("agent")} agentes · {getUsersStat("admin")} admins
                </p>
              </div>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </div>

            <div className="flex items-center">
              <div className="bg-muted p-3 rounded-full mr-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Actividad total</p>
                <p className="text-sm text-muted-foreground">Comentarios y eventos en tickets</p>
              </div>
              <div className="text-2xl font-bold">{totalCommentsRes.count}</div>
            </div>

            <div className="flex items-center">
              <div className="bg-muted p-3 rounded-full mr-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Áreas de atención</p>
                <p className="text-sm text-muted-foreground">Departamentos activos del sistema</p>
              </div>
              <div className="text-2xl font-bold">{totalAreasRes.count}</div>
            </div>

            <div className="flex items-center">
              <div className="bg-muted p-3 rounded-full mr-4">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Tickets anulados</p>
                <p className="text-sm text-muted-foreground">Solicitudes que no procedieron</p>
              </div>
              <div className="text-2xl font-bold">{getStat("voided")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Usuarios recientes</CardTitle>
            <CardDescription>Últimos usuarios que se unieron al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-muted-foreground/80 text-background font-bold">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">{user.name || "Sin nombre"}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.role === "admin" ? "Administrador" : user.role === "agent" ? "Agente" : "Usuario"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
