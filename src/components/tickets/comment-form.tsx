"use client";

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
import { addCommentAction } from "@/actions/comments";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CommentFormProps {
  ticketId: number;
}

export function CommentForm({ ticketId }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    if (!content || content.trim() === "<p></p>") {
      toast.error("El comentario no puede estar vacío");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticketId.toString());
      formData.append("content", content);

      const result = await addCommentAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Comentario agregado");
        setContent(""); // Clear editor
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <RichTextEditor
        aria-label="Comentario o actualización del ticket"
        value={content}
        onChange={setContent}
        disabled={isPending}
        placeholder="Escribe un comentario o actualización sobre este ticket..."
        className="min-h-[120px] border-0 focus-visible:ring-0 px-4 py-3 bg-transparent text-sm shadow-none"
      />
      <div className="flex justify-between items-center bg-muted/10 px-4 py-3 border-t">
        <span className="text-xs text-muted-foreground hidden sm:inline-block">
          Cuanta más información compartas, mejor podremos ayudarte.
        </span>
        <Button onClick={handleSubmit} disabled={isPending || !content || content.trim() === "<p></p>"} size="sm" className="h-9 px-5 ml-auto cursor-pointer">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar comentario
        </Button>
      </div>
    </div>
  );
}
