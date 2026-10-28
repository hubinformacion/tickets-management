// MB decimales: deja margen bajo el límite de solicitudes de Vercel Functions (4,5 MB).
export const MAX_ATTACHMENT_BYTES = 4_000_000;
export const MAX_ATTACHMENT_SIZE_LABEL = "4 MB";
export const MAX_UPLOAD_BODY_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024;
export const MAX_REVERT_BODY_BYTES = 128;

export interface AttachmentFormat {
  extensions: readonly string[];
  mimeType: string;
  aliases?: readonly string[];
  kind: "pdf" | "jpeg" | "png" | "gif" | "webp" | "ole" | "docx" | "xlsx" | "pptx" | "text" | "zip";
}

export const ATTACHMENT_FORMATS: readonly AttachmentFormat[] = [
  { extensions: ["pdf"], mimeType: "application/pdf", kind: "pdf" },
  { extensions: ["jpg", "jpeg"], mimeType: "image/jpeg", kind: "jpeg" },
  { extensions: ["png"], mimeType: "image/png", kind: "png" },
  { extensions: ["gif"], mimeType: "image/gif", kind: "gif" },
  { extensions: ["webp"], mimeType: "image/webp", kind: "webp" },
  { extensions: ["doc"], mimeType: "application/msword", aliases: ["application/cdfv2"], kind: "ole" },
  { extensions: ["xls"], mimeType: "application/vnd.ms-excel", aliases: ["application/cdfv2", "application/excel", "application/x-excel"], kind: "ole" },
  { extensions: ["ppt"], mimeType: "application/vnd.ms-powerpoint", aliases: ["application/cdfv2", "application/mspowerpoint"], kind: "ole" },
  { extensions: ["docx"], mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "docx" },
  { extensions: ["xlsx"], mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "xlsx" },
  { extensions: ["pptx"], mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "pptx" },
  { extensions: ["txt", "log"], mimeType: "text/plain", kind: "text" },
  { extensions: ["csv"], mimeType: "text/csv", aliases: ["text/plain", "application/csv", "application/vnd.ms-excel"], kind: "text" },
  { extensions: ["zip"], mimeType: "application/zip", aliases: ["application/x-zip-compressed"], kind: "zip" },
];

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [...new Set(ATTACHMENT_FORMATS.flatMap(format => [format.mimeType, ...(format.aliases ?? [])]))];

export function getAttachmentFormat(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const extension = fileName.slice(dot + 1).toLowerCase();
  return ATTACHMENT_FORMATS.find(format => format.extensions.includes(extension));
}

export function getAttachmentMimeType(fileName: string, reportedMime: string) {
  const format = getAttachmentFormat(fileName);
  const mime = reportedMime.toLowerCase();
  return format && (!mime || mime === "application/octet-stream" || mime === format.mimeType || format.aliases?.includes(mime))
    ? format.mimeType : undefined;
}
