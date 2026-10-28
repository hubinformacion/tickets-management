import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/db";
import { ticketAttachments } from "@/db/schema";
import { uploadFileToDrive, deleteFileFromDrive } from "@/lib/drive/client";
import { eq, and, isNull } from "drizzle-orm";
import { uploadTokenSchema, attachmentIdSchema } from "@/lib/validation/schemas";
import { MAX_UPLOAD_BODY_BYTES, MAX_REVERT_BODY_BYTES } from "@/lib/constants/attachments";
import { readLimitedBody, UploadRequestError } from "@/lib/uploads/request-body";
import { validateAttachmentMetadata, validateAttachmentContent } from "@/lib/uploads/validate-attachment";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const uploadLimiter = createRateLimiter("RELAXED");

function rateLimitResponse(userId: string, operation: "post" | "delete") {
  const result = uploadLimiter(`uploads:${operation}:${userId}`);
  return result.success ? null : NextResponse.json(
    { error: "Demasiadas solicitudes de archivos. Intenta de nuevo en un momento." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) } },
  );
}

/**
 * POST /api/upload
 * Recibe un archivo (multipart) + uploadToken.
 * Sube a Google Drive y guarda metadatos en la BD con ticketId = null.
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
    const limited = rateLimitResponse(session.user.id, "post");
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
    const file = files[0];
    validateAttachmentMetadata(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = validateAttachmentContent(file, buffer);

    // Subir a Google Drive con la cuenta institucional
    const driveResult = await uploadFileToDrive(buffer, file.name, mimeType);

    // Guardar metadatos en la BD
    const [attachment] = await db.insert(ticketAttachments).values({
      ticketId: null,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      driveFileId: driveResult.fileId,
      driveViewLink: driveResult.viewLink,
      uploadToken,
      uploadedById: session.user.id,
    }).returning({ id: ticketAttachments.id });

    // FilePond espera un ID de texto plano como respuesta al proceso
    return new NextResponse(attachment.id, { status: 200 });
  } catch (error) {
    if (error instanceof UploadRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("No se pudo confirmar la carga del adjunto");
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Elimina un archivo no vinculado a un ticket (solo el uploader puede hacerlo).
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
    const limited = rateLimitResponse(session.user.id, "delete");
    if (limited) return limited;
    const attachmentId = new TextDecoder().decode(await readLimitedBody(request, MAX_REVERT_BODY_BYTES));

    if (!attachmentIdSchema.safeParse(attachmentId).success) {
      return NextResponse.json({ error: "ID de archivo requerido" }, { status: 400 });
    }

    // Buscar el attachment: debe pertenecer al usuario y NO estar vinculado a un ticket
    const [attachment] = await db
      .select()
      .from(ticketAttachments)
      .where(
        and(
          eq(ticketAttachments.id, attachmentId),
          eq(ticketAttachments.uploadedById, session.user.id),
          isNull(ticketAttachments.ticketId)
        )
      )
      .limit(1);

    if (!attachment) {
      return NextResponse.json(
        { error: "Archivo no encontrado o no se puede eliminar" },
        { status: 404 }
      );
    }

    // Eliminar de Google Drive
    try {
      await deleteFileFromDrive(attachment.driveFileId);
    } catch {
      console.error("No se confirmó el borrado en Drive");
      return NextResponse.json({ error: "No se pudo completar la eliminación del archivo" }, { status: 502 });
    }

    // Eliminar de la BD
    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId));

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
