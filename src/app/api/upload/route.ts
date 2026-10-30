import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { uploadTokenSchema, attachmentIdSchema } from "@/lib/validation/schemas";
import { MAX_UPLOAD_BODY_BYTES, MAX_REVERT_BODY_BYTES } from "@/lib/constants/attachments";
import { readLimitedBody, UploadRequestError } from "@/lib/uploads/request-body";
import { validateAttachmentMetadata, validateAttachmentContent } from "@/lib/uploads/validate-attachment";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { revertPendingAttachment } from "@/lib/uploads/pending-attachments";
import { persistUpload } from "@/lib/uploads/persist-upload";
import { parseUploadAttemptId } from "@/lib/uploads/upload-attempt-input";
import { UploadPersistenceError } from "@/lib/uploads/upload-attempt-types";

export const maxDuration = 60;

const uploadLimiters = {
  post: createRateLimiter("RELAXED", "uploads:post"),
  delete: createRateLimiter("RELAXED", "uploads:delete"),
};

async function rateLimitResponse(userId: string, operation: "post" | "delete") {
  const result = await uploadLimiters[operation](userId);
  return result.success ? null : NextResponse.json(
    { error: result.error ?? "Demasiadas solicitudes de archivos. Intenta de nuevo en un momento." },
    { status: result.reason === "unavailable" ? 503 : 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/**
 * POST /api/upload
 * Recibe un archivo (multipart) + uploadToken.
 * Registra el intento antes de Drive y confirma el adjunto sin duplicar reintentos.
 * Retorna el ID del attachment (compatible con FilePond server process).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!session.user.isActive) {
    return NextResponse.json({ error: "Usuario desactivado" }, { status: 403 });
  }

  try {
    const limited = await rateLimitResponse(session.user.id, "post");
    if (limited) return limited;
    const contentType = request.headers.get("content-type");
    if (!contentType || contentType.length > 200 || !/^multipart\/form-data(?:\s*;|$)/i.test(contentType)) {
      throw new UploadRequestError("Se requiere un formulario multipart válido", 415);
    }
    const body = await readLimitedBody(request, MAX_UPLOAD_BODY_BYTES);
    let formData: FormData;
    try {
      formData = await new Response(body, { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new UploadRequestError("El formulario de archivos no es válido", 400);
    }
    if ([...formData.keys()].some(key => key !== "file" && key !== "uploadToken")) {
      throw new UploadRequestError("El formulario contiene campos no permitidos", 400);
    }

    // FilePond envía metadata opcional y un único File por solicitud.
    const fileEntries = formData.getAll("file");
    const files = fileEntries.filter((entry): entry is File => entry instanceof File);
    if (files.length !== 1 || fileEntries.length > 2) {
      throw new UploadRequestError("Envía un único archivo por solicitud", 400);
    }
    const parsedToken = uploadTokenSchema.safeParse(formData.get("uploadToken"));
    if (formData.getAll("uploadToken").length !== 1 || !parsedToken.success) {
      throw new UploadRequestError("Token de carga inválido", 400);
    }
    const uploadToken = parsedToken.data;
    const uploadId = parseUploadAttemptId(fileEntries.find((entry): entry is string => typeof entry === "string"));
    const file = files[0];
    validateAttachmentMetadata(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = validateAttachmentContent(file, buffer);

    const attachmentId = await persistUpload({
      id: uploadId,
      userId: session.user.id,
      uploadToken,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      // Solo para contrastar el checksum binario que expone Drive; no sustituye SHA-256.
      md5: createHash("md5").update(buffer).digest("hex"),
    }, buffer, request.signal);

    // FilePond espera un ID de texto plano como respuesta al proceso
    return new NextResponse(attachmentId, { status: 200 });
  } catch (error) {
    if (error instanceof UploadRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof UploadPersistenceError) {
      return NextResponse.json({ error: error.message }, {
        status: error.status,
        headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined,
      });
    }
    console.error("No se pudo confirmar la carga del adjunto");
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Cancela un archivo no vinculado a un ticket (solo el uploader puede hacerlo).
 * Conserva la referencia en BD y registra el resultado de Drive.
 * FilePond envía el ID del attachment como body de texto plano.
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!session.user.isActive) {
    return NextResponse.json({ error: "Usuario desactivado" }, { status: 403 });
  }

  try {
    const limited = await rateLimitResponse(session.user.id, "delete");
    if (limited) return limited;
    const attachmentId = new TextDecoder().decode(await readLimitedBody(request, MAX_REVERT_BODY_BYTES));

    if (!attachmentIdSchema.safeParse(attachmentId).success) {
      return NextResponse.json({ error: "ID de archivo requerido" }, { status: 400 });
    }

    const result = await revertPendingAttachment(attachmentId, session.user.id);
    if (result === "missing") {
      return NextResponse.json({ error: "Archivo no encontrado o no se puede eliminar" }, { status: 404 });
    }
    if (result === "busy") {
      return NextResponse.json({ error: "La cancelación del archivo ya está en curso. Intenta nuevamente en un momento." },
        { status: 409, headers: { "Retry-After": "30" } });
    }
    if (result === "failed") {
      return NextResponse.json({ error: "No se pudo confirmar la cancelación del archivo" }, { status: 502 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UploadRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("No se pudo confirmar la eliminación del adjunto");
    return NextResponse.json(
      { error: "Error al eliminar el archivo" },
      { status: 500 }
    );
  }
}
