import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/helpers";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ManualContent } from "@/components/shared/manual-content";
import fs from "fs/promises";
import path from "path";

const MANUALS: Record<string, { file: string; title: string; roles: string[] }> = {
  "usuario": {
    file: "manual-usuario.md",
    title: "Manual de usuario",
    roles: ["user", "agent", "admin"],
  },
  "agente": {
    file: "manual-agente.md",
    title: "Manual de agente",
    roles: ["agent", "admin"],
  },
  "admin": {
    file: "manual-admin.md",
    title: "Manual de administrador",
    roles: ["admin"],
  },
  "tecnico": {
    file: "manual-tecnico.md",
    title: "Manual técnico",
    roles: ["admin"],
  },
  "diagramas": {
    file: path.join("diagramas", "README.md"),
    title: "Diagramas del sistema",
    roles: ["user", "agent", "admin"],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manual = MANUALS[slug];
  if (!manual) return { title: "Manual no encontrado" };
  return { title: manual.title };
}

export default async function ManualPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, session] = await Promise.all([params, requireAuth()]);
  const userRole = (session.user as { role?: string }).role || "user";

  const manual = MANUALS[slug];
  if (!manual) notFound();

  // Check role access
  if (!manual.roles.includes(userRole)) notFound();

  // Read markdown file
  const filePath = path.join(process.cwd(), "docs", manual.file);
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    // Re-throw notFound errors, catch other errors and show 404
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div>
        <Breadcrumb items={[{ label: manual.title }]} />
      </div>

      <ManualContent content={content} />
    </div>
  );
}
