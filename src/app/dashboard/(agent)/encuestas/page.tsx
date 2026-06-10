import { Breadcrumb } from "@/components/shared/breadcrumb";
import { requireAgent } from "@/lib/auth/helpers";
import Link from "next/link";
import { Star, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encuestas de satisfacción",
};

const sections = [
  {
    href: "/dashboard/encuestas/usuarios",
    icon: Star,
    title: "Encuestas de usuarios",
    description:
      "Resultados de las encuestas post-atención completadas por usuarios al confirmar la resolución de sus tickets.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  {
    href: "/dashboard/encuestas/proveedores",
    icon: Package,
    title: "Evaluaciones de proveedores",
    description:
      "Resultados de las evaluaciones internas registradas por agentes al cerrar tickets de proveedor.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-900",
  },
];

export default async function SurveyHubPage() {
  await requireAgent();

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500">
      <Breadcrumb items={[{ label: "Encuestas" }]} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Encuestas de satisfacción</h1>
        <p className="text-muted-foreground">
          Selecciona el tipo de encuesta que deseas consultar.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description, color, bg, border }) => (
          <Link key={href} href={href} className="group focus:outline-none">
            <Card className={`h-full border-2 transition-all duration-200 hover:shadow-md group-hover:border-current ${border}`}>
              <CardHeader className="pb-3">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${bg} mb-3`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
