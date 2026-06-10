"use client";

import { formatFileSize } from "@/lib/utils/format";
import { FileIcon, ImageIcon, FileTextIcon, FileSpreadsheetIcon, FilmIcon, ExternalLinkIcon, PaperclipIcon } from "lucide-react";
import { DeleteAttachmentButton } from "@/components/tickets/delete-attachment-button";

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  const className = "h-4 w-4 text-muted-foreground shrink-0";
  if (mimeType.startsWith("image/")) return <ImageIcon className={className} />;
  if (mimeType.startsWith("video/")) return <FilmIcon className={className} />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return <FileSpreadsheetIcon className={className} />;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text/"))
    return <FileTextIcon className={className} />;
  return <FileIcon className={className} />;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  driveViewLink: string;
  uploadedById: string | null;
  uploadedBy?: { name: string } | null;
  createdAt: Date;
}

interface TicketAttachmentsProps {
  attachments: Attachment[];
  ticketId: number;
  isAdmin: boolean;
  isAgentForArea: boolean;
  currentUserId: string;
}

export function TicketAttachments({
  attachments,
  ticketId,
  isAdmin,
  isAgentForArea,
  currentUserId,
}: TicketAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="mx-6 border-t border-border" />
      <div className="px-6 pt-4 pb-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-sm font-medium">Archivos adjuntos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {attachments.map((file) => {
            const canDelete = isAdmin || isAgentForArea || file.uploadedById === currentUserId;
            return (
              <div
                key={file.id}
                className="group flex items-start p-3 rounded-lg border bg-background/50 hover:bg-accent/50 hover:border-accent-foreground/20 transition-all relative overflow-hidden"
              >
                <a
                  href={file.driveViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 flex-1 min-w-0 focus:outline-hidden"
                >
                  <div className="bg-muted p-2.5 rounded-md shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                    <AttachmentIcon mimeType={file.mimeType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:underline decoration-muted-foreground/50 underline-offset-4 text-foreground">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
                    {file.uploadedBy ? (
                      <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                        Por <span className="font-medium">{file.uploadedBy.name}</span>
                      </p>
                    ) : null}
                  </div>
                </a>

                <div className="flex flex-col gap-1 pl-2 ml-2 border-l border-border/40 justify-center min-h-[40px]">
                  {canDelete ? (
                    <DeleteAttachmentButton
                      attachmentId={file.id}
                      ticketId={ticketId}
                      fileName={file.fileName}
                    />
                  ) : null}
                  <a
                    href={file.driveViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    title="Ver documento"
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
