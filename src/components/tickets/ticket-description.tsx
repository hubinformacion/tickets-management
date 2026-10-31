"use client";

import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/shared/rich-text-editor").then(mod => ({ default: mod.RichTextEditor })),
  { ssr: false }
);

interface TicketDescriptionProps {
  content: string;
}

export function TicketDescription({ content }: TicketDescriptionProps) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none">
      <RichTextEditor
        aria-label="Descripción del ticket"
        value={content}
        disabled={true}
        className="border-0 px-0 bg-transparent min-h-0 p-0 shadow-none"
      />
    </div>
  );
}
