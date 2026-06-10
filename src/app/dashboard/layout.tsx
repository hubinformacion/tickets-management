"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Ticket, LogOut, Menu, X, Shield, Eye, Settings,
  ChevronLeft, ChevronRight, ChevronDown, BookOpen, PlusCircle, Share2,
  Inbox, ExternalLink, FileText, BarChart3, Star, Package,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { SidebarUserInfo } from "@/components/dashboard/sidebar-user-info";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/cn";
import { getAppSettingAction } from "@/actions/admin/settings";

const DEFAULT_KNOWLEDGE_BASE_URL = "https://docs.google.com/spreadsheets/d/140VQoMEDkztJ1vmJ68ULwKlQ1y1BdQixU5w7AGZ5QZ4/";

interface NavSubItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  subItems?: NavSubItem[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(() => pathname.startsWith("/dashboard/manual/"));
  const [isEncuestasOpen, setIsEncuestasOpen] = useState(() => pathname.startsWith("/dashboard/encuestas"));
  const [knowledgeBaseUrl, setKnowledgeBaseUrl] = useState(DEFAULT_KNOWLEDGE_BASE_URL);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isSidebarOpen, handleEscape]);

  useEffect(() => {
    getAppSettingAction("knowledge_base_url").then((url) => {
      if (url) setKnowledgeBaseUrl(url);
    });
  }, []);

  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  };

  const userRole = (session?.user as { role?: string })?.role || "user";

  const navigationGroups = useMemo<NavGroup[]>(() => {
    const groups: NavGroup[] = [];

    // 1. Dashboard & Tickets
    if (userRole === "admin") {
      groups.push(
        { items: [{ href: "/dashboard", label: "Panel de control", icon: LayoutDashboard }] },
        { groupLabel: "Tickets", items: [{ href: "/dashboard/explorador", label: "Explorador de tickets", icon: Ticket }] }
      );
    } else if (userRole === "agent") {
      groups.push(
        { items: [{ href: "/dashboard", label: "Mi panel", icon: LayoutDashboard }] },
        {
          groupLabel: "Tickets", items: [
            { href: "/dashboard/tickets/nuevo", label: "Nuevo ticket", icon: PlusCircle },
            { href: "/dashboard/mis-tickets", label: "Mis tickets", icon: Ticket },
            { href: "/dashboard/seguimiento", label: "En seguimiento", icon: Eye },
            { href: "/dashboard/area", label: "Tickets del área", icon: Inbox },
          ]
        },
        { groupLabel: "Proveedores", items: [{ href: "/dashboard/proveedores", label: "Tickets de proveedores", icon: Share2 }] }
      );
    } else {
      groups.push(
        {
          items: [
            { href: "/dashboard", label: "Mi panel", icon: LayoutDashboard },
            { href: "/dashboard/tickets/nuevo", label: "Nuevo ticket", icon: PlusCircle },
            { href: "/dashboard/mis-tickets", label: "Mis tickets", icon: Ticket },
            { href: "/dashboard/seguimiento", label: "En seguimiento", icon: Eye },
          ]
        }
      );
    }

    // 2. Análisis
    if (userRole === "admin" || userRole === "agent") {
      groups.push({
        groupLabel: "Análisis",
        items: [
          {
            label: "Encuestas",
            icon: BarChart3,
            subItems: [
              { href: "/dashboard/encuestas/usuarios", label: "Encuestas de usuarios", icon: Star },
              { href: "/dashboard/encuestas/proveedores", label: "Evaluaciones de proveedores", icon: Package },
            ],
            isOpen: isEncuestasOpen,
            onOpenChange: setIsEncuestasOpen,
          }
        ]
      });
    }

    // 3. Recursos
    const manualSubItems: NavSubItem[] = [
      { href: knowledgeBaseUrl, label: "Capacitaciones / Formatos", icon: ExternalLink, external: true },
      { href: "/dashboard/manual/usuario", label: "Manual de usuario", icon: FileText }
    ];
    if (userRole === "admin" || userRole === "agent") {
      manualSubItems.push({ href: "/dashboard/manual/agente", label: "Manual de agente", icon: FileText });
    }
    if (userRole === "admin") {
      manualSubItems.push(
        { href: "/dashboard/manual/admin", label: "Manual de administrador", icon: FileText },
        { href: "/dashboard/manual/tecnico", label: "Manual técnico", icon: FileText }
      );
    }

    const resourceItems: NavItem[] = [
      {
        label: "Base de conocimiento",
        icon: BookOpen,
        subItems: manualSubItems,
        isOpen: isKnowledgeBaseOpen,
        onOpenChange: setIsKnowledgeBaseOpen,
      }
    ];

    if (userRole === "admin") {
      resourceItems.push({ href: "/dashboard/usuarios", label: "Gestión de usuarios", icon: Shield });
    }

    if (userRole === "admin" || userRole === "agent") {
      resourceItems.push({
        href: userRole === "admin" ? "/dashboard/sistema" : "/dashboard/configuracion",
        label: userRole === "admin" ? "Configuración del sistema" : "Configuración del área",
        icon: Settings
      });
    }

    groups.push({ groupLabel: "Recursos", items: resourceItems });

    return groups;
  }, [userRole, knowledgeBaseUrl, isEncuestasOpen, isKnowledgeBaseOpen]);

  // Shared inner rendering function for subitems
  const renderSubItem = (sub: NavSubItem, mobile = false) => {
    const Icon = sub.icon;
    const isActive = pathname === sub.href;
    const className = cn(
      "group flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
      mobile && "py-2 rounded-lg",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

    return (
      <Link
        key={sub.href}
        href={sub.href}
        target={sub.external ? "_blank" : undefined}
        rel={sub.external ? "noopener noreferrer" : undefined}
        onClick={mobile ? () => setIsSidebarOpen(false) : undefined}
        className={className}
      >
        <Icon className="h-4 w-4 shrink-0 mr-2" aria-hidden="true" />
        <span>{sub.label}</span>
      </Link>
    );
  };

  // Shared inner rendering function for NavItems
  const renderNavLink = (item: NavItem, mobile = false) => {
    const Icon = item.icon;

    if (item.subItems) {
      return (
        <Collapsible key={item.label} open={item.isOpen} onOpenChange={item.onOpenChange}>
          <CollapsibleTrigger
            className={cn(
              "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
              mobile && "py-3 text-base rounded-lg",
              !mobile && isCollapsed ? "justify-center" : "",
              item.subItems.some(sub => pathname === sub.href)
                ? "text-sidebar-accent-foreground bg-sidebar-accent"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            title={!mobile && isCollapsed ? item.label : undefined}
          >
            <Icon className={cn("shrink-0", mobile ? "mr-4 h-6 w-6" : cn("h-5 w-5", !isCollapsed && "mr-3"))} aria-hidden="true" />
            {(mobile || !isCollapsed) && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  item.isOpen && "rotate-180"
                )} />
              </>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {(mobile || !isCollapsed) && (
              <div className={cn("space-y-1 mt-1", mobile ? "ml-6" : "ml-4")}>
                {item.subItems.map(sub => renderSubItem(sub, mobile))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href || item.label}
        href={item.href!}
        onClick={mobile ? () => setIsSidebarOpen(false) : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
          mobile && "py-3 text-base rounded-lg",
          !mobile && isCollapsed ? "justify-center" : "",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        title={!mobile && isCollapsed ? item.label : undefined}
      >
        <Icon className={cn("shrink-0", mobile ? "mr-4 h-6 w-6" : cn("h-5 w-5", !isCollapsed && "mr-3", isActive && "text-primary"))} aria-hidden="true" />
        {(mobile || !isCollapsed) && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* DESKTOP SIDEBAR */}
      <aside
        aria-label="Menú principal"
        className={cn(
          "hidden md:flex flex-col shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out z-20 border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className={cn(
          "relative flex border-b border-sidebar-border transition-all duration-300",
          isCollapsed ? "flex-col items-center justify-center py-4 px-2 gap-4" : "flex-col items-start py-6 px-6 gap-3"
        )}>
          {!isCollapsed && (
            <div className="absolute top-4 right-4 z-20">
              <ModeToggle />
            </div>
          )}

          {isPending ? (
            <>
              <Skeleton className={cn("rounded-full shrink-0", isCollapsed ? "h-8 w-8" : "h-12 w-12")} />
              {!isCollapsed && (
                <div className="flex flex-col items-start w-full min-w-0 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-5 w-20 mt-1" />
                </div>
              )}
            </>
          ) : (
            <>
              <Avatar className={cn("transition-all duration-300 ring-2 ring-sidebar-ring shrink-0", isCollapsed ? "h-8 w-8" : "h-12 w-12")}>
                <AvatarImage src={session?.user?.image || undefined} referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {session?.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              {!isCollapsed && (
                <div className="flex flex-col items-start w-full min-w-0 space-y-1">
                  <h2 className="font-semibold text-sm w-full wrap-break-word leading-tight" title={session?.user?.name || ""}>
                    {session?.user?.name || "Usuario"}
                  </h2>
                  <p className="text-xs text-muted-foreground w-full break-all" title={session?.user?.email || ""}>
                    {session?.user?.email || ""}
                  </p>
                  <div className="pt-2">
                    <SidebarUserInfo role={userRole} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {isPending ? (
            <div className="px-3 space-y-3">
              {!isCollapsed && <Skeleton className="h-3 w-16 mb-3" />}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn("flex items-center px-3 py-2 rounded-md", isCollapsed ? "justify-center" : "")}>
                  <Skeleton className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <Skeleton className="h-4 w-24 ml-3" />}
                </div>
              ))}
              <div className="mx-1 border-t border-sidebar-border my-4" />
              {!isCollapsed && <Skeleton className="h-3 w-14 mb-3" />}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={cn("flex items-center px-3 py-2 rounded-md", isCollapsed ? "justify-center" : "")}>
                  <Skeleton className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <Skeleton className="h-4 w-28 ml-3" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 space-y-1">
              {navigationGroups.filter(g => g.items.length > 0).map((group, gi) => (
                <div key={gi} className="mb-2 last:mb-0">
                  {gi > 0 && group.groupLabel && (
                    <div className={cn("pt-3 pb-1", !isCollapsed && "px-3")}>
                      {!isCollapsed ? (
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider animate-in fade-in duration-300">
                          {group.groupLabel}
                        </h3>
                      ) : (
                        <div className="border-t border-sidebar-border" />
                      )}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => renderNavLink(item))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border bg-sidebar mt-auto">
          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-6 justify-center" : "gap-2 flex-row")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(prev => !prev)}
              className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent h-9 w-9 border border-sidebar-border transition-all order-2"
              )}
              aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                "flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 rounded-md transition-colors cursor-pointer",
                isCollapsed ? "justify-center p-3 order-1" : "flex-1 px-3 py-2 order-1"
              )}
              aria-label="Cerrar sesión"
            >
              <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} aria-hidden="true" />
              {!isCollapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        aria-label="Menú principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 h-full overflow-hidden transform bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <span className="text-base font-semibold">Menú</span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cerrar menú"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-6 border-b border-sidebar-border flex flex-col items-center relative">
            <div className="absolute top-4 right-4">
              <ModeToggle />
            </div>
            {isPending ? (
              <>
                <Skeleton className="h-16 w-16 mb-3 rounded-full" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-5 w-20" />
              </>
            ) : (
              <>
                <Avatar className="h-16 w-16 mb-3 ring-2 ring-sidebar-ring">
                  <AvatarImage src={session?.user?.image || undefined} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {session?.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-lg">{session?.user?.name || "Usuario"}</h2>
                <p className="text-sm text-muted-foreground mb-2">{session?.user?.email || ""}</p>
                <SidebarUserInfo role={userRole} />
              </>
            )}
          </div>

          <nav className="flex-1 px-4 py-6 space-y-6">
            {isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-3 w-16 mb-3" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center px-3 py-3 rounded-lg">
                    <Skeleton className="h-6 w-6 mr-4 shrink-0" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Navegación
                </h3>
                <div className="space-y-2">
                  {navigationGroups.filter(g => g.items.length > 0).map((group, gi) => (
                    <div key={gi} className="mb-4 last:mb-0">
                      {gi > 0 && group.groupLabel && (
                        <div className="pt-2 pb-1 px-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {group.groupLabel}
                          </h3>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {group.items.map((item) => renderNavLink(item, true))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center px-4 py-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="text-muted-foreground focus:outline-none"
            aria-label="Abrir menú"
            aria-expanded={isSidebarOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-base font-semibold">Gestión de tickets</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
