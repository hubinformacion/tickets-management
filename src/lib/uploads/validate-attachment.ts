import { getAttachmentFormat, getAttachmentMimeType, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_SIZE_LABEL } from "@/lib/constants/attachments";
import { UploadRequestError } from "@/lib/uploads/request-body";

interface ZipEntry { name: string; encrypted: boolean }

// Lee solo el directorio y las cabeceras; nunca extrae ni descomprime archivos.
function zipEntries(bytes: Buffer): ZipEntry[] | null {
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (bytes.readUInt32LE(at) === 0x06054b50 && at + 22 + bytes.readUInt16LE(at + 20) === bytes.length) {
      end = at;
      break;
    }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0) return null;
  const count = bytes.readUInt16LE(end + 10);
  const size = bytes.readUInt32LE(end + 12);
  const offset = bytes.readUInt32LE(end + 16);
  if (count === 0xffff || count !== bytes.readUInt16LE(end + 8) || offset + size !== end || count * 46 > size) return null;

  const entries: ZipEntry[] = [];
  let at = offset;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || bytes.readUInt32LE(at) !== 0x02014b50 || bytes.readUInt16LE(at + 34) !== 0) return null;
    const compressed = bytes.readUInt32LE(at + 20);
    const nameSize = bytes.readUInt16LE(at + 28);
    const next = at + 46 + nameSize + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
    const local = bytes.readUInt32LE(at + 42);
    if (next > end || local + 30 > offset || bytes.readUInt32LE(local) !== 0x04034b50) return null;
    const localNameSize = bytes.readUInt16LE(local + 26);
    if ((bytes.readUInt16LE(local + 6) & 1) !== (bytes.readUInt16LE(at + 8) & 1)) return null;
    const dataStart = local + 30 + localNameSize + bytes.readUInt16LE(local + 28);
    if (dataStart + compressed > offset || localNameSize !== nameSize) return null;
    const nameBytes = bytes.subarray(at + 46, at + 46 + nameSize);
    if (!nameBytes.equals(bytes.subarray(local + 30, local + 30 + localNameSize))) return null;
    entries.push({ name: nameBytes.toString("utf8"), encrypted: Boolean(bytes.readUInt16LE(at + 8) & 1) });
    at = next;
  }
  return at === end ? entries : null;
}

export function validateAttachmentMetadata(file: Pick<File, "name" | "size" | "type">) {
  if (!file.name.trim() || file.name.length > 255 || [...file.name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === "/" || char === "\\")) {
    throw new UploadRequestError("Nombre de archivo inválido", 400);
  }
  if (file.size === 0) throw new UploadRequestError("El archivo está vacío", 400);
  if (file.size > MAX_ATTACHMENT_BYTES) throw new UploadRequestError(`El archivo excede el límite de ${MAX_ATTACHMENT_SIZE_LABEL}`, 413);
  const format = getAttachmentFormat(file.name);
  if (!format) throw new UploadRequestError("Formato no permitido. Usa PDF, Office, imágenes, texto/CSV o ZIP", 415);
  if (!getAttachmentMimeType(file.name, file.type)) {
    throw new UploadRequestError("El tipo de archivo no coincide con su extensión", 415);
  }
  return format;
}

/** Comprueba firmas/contenedores; no sustituye un análisis antivirus ni valida todo el formato. */
export function validateAttachmentContent(file: Pick<File, "name" | "size" | "type">, bytes: Buffer): string {
  const format = validateAttachmentMetadata(file);
  if (bytes.length !== file.size) throw new UploadRequestError("El tamaño del archivo es inconsistente", 400);
  const starts = (hex: string) => bytes.subarray(0, hex.length / 2).equals(Buffer.from(hex, "hex"));
  let valid = false;
  switch (format.kind) {
    case "pdf": valid = bytes.subarray(0, 5).toString("ascii") === "%PDF-"; break;
    case "jpeg": valid = starts("ffd8ff"); break;
    case "png": valid = starts("89504e470d0a1a0a"); break;
    case "gif": valid = ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")); break;
    case "webp": valid = bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"; break;
    case "ole": valid = bytes.length >= 512 && starts("d0cf11e0a1b11ae1"); break;
    case "text": valid = !bytes.some(byte => byte < 32 && ![9, 10, 12, 13].includes(byte)); break;
    case "zip": valid = zipEntries(bytes) !== null; break;
    case "docx": case "xlsx": case "pptx": {
      const entries = zipEntries(bytes);
      const required = { docx: "word/document.xml", xlsx: "xl/workbook.xml", pptx: "ppt/presentation.xml" }[format.kind];
      valid = entries !== null && !entries.some(entry => entry.encrypted || entry.name.toLowerCase().endsWith("vbaproject.bin"))
        && entries.some(entry => entry.name === "[Content_Types].xml") && entries.some(entry => entry.name === required);
      break;
    }
  }
  if (!valid) throw new UploadRequestError("El contenido no corresponde al formato permitido o está incompleto", 415);
  return format.mimeType;
}
