import { randomUUID } from "node:crypto";
import { UploadRequestError } from "@/lib/uploads/request-body";
import { uploadAttemptMetadataSchema } from "@/lib/validation/schemas";

export function parseUploadAttemptId(metadata: string | undefined): string {
  if (metadata === undefined) return randomUUID();
  if (metadata.length > 4096) throw new UploadRequestError("Metadata del archivo demasiado extensa", 400);
  let value: unknown;
  try {
    value = JSON.parse(metadata);
  } catch {
    throw new UploadRequestError("Metadata del archivo inválida", 400);
  }
  const result = uploadAttemptMetadataSchema.safeParse(value);
  if (!result.success) throw new UploadRequestError("Identificador de carga inválido", 400);
  // Compatibilidad con formularios que ya estaban abiertos y no enviaban un UUID estable.
  return result.data.uploadId ?? randomUUID();
}
