"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useImperativeHandle } from "react";
import type { AriaAttributes, Ref } from "react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Bold, Italic, List, ListOrdered, Heading1, Quote, Palette } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface RichTextEditorProps extends Pick<AriaAttributes, "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "aria-required"> {
  id?: string;
  ref?: Ref<{ focus: () => void }>;
  onBlur?: () => void;
  value: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    link: false,
  }),
  TextStyle,
  Color,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-foreground underline cursor-pointer hover:text-foreground/80',
    },
  }),
];

const COLOR_PALETTE = [
  { value: "#000000", label: "Negro" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#f97316", label: "Naranja" },
  { value: "#f59e0b", label: "Ámbar" },
  { value: "#10b981", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#d946ef", label: "Fucsia" },
  { value: "#64748b", label: "Gris" },
];

export function RichTextEditor({
  value, onChange, onBlur, disabled, className, id, ref, placeholder,
  "aria-label": ariaLabel = "Editor de texto",
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    immediatelyRender: false,
    content: value,
    editable: !disabled,
    onBlur: () => onBlur?.(),
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: disabled ? "document" : "textbox",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : { "aria-label": ariaLabel }),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        ...(ariaInvalid !== undefined ? { "aria-invalid": String(ariaInvalid) } : {}),
        ...(!disabled ? {
          "aria-multiline": "true",
          ...(ariaRequired !== undefined ? { "aria-required": String(ariaRequired) } : {}),
          ...(placeholder ? { "aria-placeholder": placeholder } : {}),
        } : {}),
        class: "prose prose-sm dark:prose-invert max-w-none p-3 min-h-[60px] outline-none break-words [&_a]:break-all [&_p]:my-1",
      },
    },
  });

  useImperativeHandle(ref, () => ({ focus: () => { editor?.commands.focus(); } }), [editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  // Limpiar el contenido tras enviar una actividad.
  useEffect(() => {
    if (editor && value === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      "border border-input rounded-md bg-transparent overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all",
      disabled ? 'border-none bg-transparent' : 'bg-sidebar',
      className
    )}>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1 p-1 border-b border-input bg-muted/30">
          <Toggle
            type="button"
            aria-label="Negrita"
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            className="cursor-pointer"
          >
            <Bold className="h-4 w-4" aria-hidden="true" />
          </Toggle>
          <Toggle
            type="button"
            aria-label="Cursiva"
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            className="cursor-pointer"
          >
            <Italic className="h-4 w-4" aria-hidden="true" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          <Toggle
            type="button"
            aria-label="Encabezado"
            size="sm"
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="cursor-pointer"
          >
            <Heading1 className="h-4 w-4" aria-hidden="true" />
          </Toggle>

          <Toggle
            type="button"
            aria-label="Lista con viñetas"
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            className="cursor-pointer"
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </Toggle>
          <Toggle
            type="button"
            aria-label="Lista numerada"
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            className="cursor-pointer"
          >
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          <Toggle
            type="button"
            aria-label="Cita"
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            className="cursor-pointer"
          >
            <Quote className="h-4 w-4" aria-hidden="true" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" aria-label="Color de texto">
                <Palette className="h-4 w-4" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2" align="start">
              <div className="grid grid-cols-5 gap-1">
                {COLOR_PALETTE.map(({ value: color, label }) => (
                  <button
                    type="button"
                    key={color}
                    className="h-6 w-6 rounded-md border border-muted"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                    aria-label={`Color ${label.toLocaleLowerCase("es")}`}
                    aria-pressed={editor.isActive("textStyle", { color })}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="col-span-5 text-[10px] h-6 mt-1"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                >
                  Limpiar color
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <EditorContent editor={editor} className={disabled ? "" : "min-h-[60px]"} />
    </div>
  );
}
