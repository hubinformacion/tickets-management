"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface ManualContentProps {
  content: string;
}

export function ManualContent({ content }: ManualContentProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80 prose-img:rounded-lg prose-pre:bg-muted prose-pre:text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children, ...props }) => {
            let normalizedHref = href;

            // Handle relative markdown links to manuals or diagrams
            if (
              normalizedHref.includes("diagramas/README.md") ||
              normalizedHref === "./diagramas/README.md" ||
              normalizedHref === "diagramas/README.md"
            ) {
              normalizedHref = "/dashboard/manual/diagramas";
            } else if (normalizedHref.includes("manual-usuario.md") || normalizedHref === "./manual-usuario.md") {
              normalizedHref = "/dashboard/manual/usuario";
            } else if (normalizedHref.includes("manual-agente.md") || normalizedHref === "./manual-agente.md") {
              normalizedHref = "/dashboard/manual/agente";
            } else if (normalizedHref.includes("manual-admin.md") || normalizedHref === "./manual-admin.md") {
              normalizedHref = "/dashboard/manual/admin";
            } else if (normalizedHref.includes("manual-tecnico.md") || normalizedHref === "./manual-tecnico.md") {
              normalizedHref = "/dashboard/manual/tecnico";
            } else if (
              normalizedHref.startsWith("./diagramas/") ||
              normalizedHref.startsWith("diagramas/")
            ) {
              normalizedHref = "/" + normalizedHref.replace(/^\.?\/?/, "");
            }

            // External links or static HTML/SVG diagram viewer in public/
            if (
              normalizedHref.startsWith("http://") ||
              normalizedHref.startsWith("https://") ||
              normalizedHref.endsWith(".html") ||
              normalizedHref.endsWith(".svg")
            ) {
              return (
                <a
                  href={normalizedHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  {...props}
                >
                  {children}
                  <span className="text-xs opacity-75 font-mono">↗</span>
                </a>
              );
            }

            return (
              <Link href={normalizedHref} className="font-medium text-primary hover:underline" {...props}>
                {children}
              </Link>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
