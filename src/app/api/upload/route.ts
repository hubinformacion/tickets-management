import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/db";
import { ticketAttachments } from "@/db/schema";
import { uploadFileToDrive, deleteFileFromDrive } from "@/lib/drive/client";
import { eq, and, isNull } from "drizzle-orm";
import { uploadTokenSchema, attachmentIdSchema } from "@/lib/validation/schemas";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    const formData = await request.formData();

    // FilePond envía dos campos "file": un string con metadata y luego el File real
    const fileEntries = formData.getAll("file");
    const file = fileEntries.find((entry): entry is File => entry instanceof File) ?? null;
    const uploadToken = formData.get("uploadToken") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    if (!uploadTokenSchema.safeParse(uploadToken).success) {
      return NextResponse.json({ error: "Token de carga inválido" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el límite de 5 MB` },
        { status: 413 }
      );
    }

    // Leer el archivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Google Drive con la cuenta institucional
    const driveResult = await uploadFileToDrive(buffer, file.name, file.type || "application/octet-stream");

    // Guardar metadatos en la BD
    const [attachment] = await db.insert(ticketAttachments).values({
      ticketId: null,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      driveFileId: driveResult.fileId,
      driveViewLink: driveResult.viewLink,
      uploadToken,
      uploadedById: session.user.id,
    }).returning({ id: ticketAttachments.id });

    // FilePond espera un ID de texto plano como respuesta al proceso
    return new NextResponse(attachment.id, { status: 200 });
  } catch (error) {
    console.error("Error en upload:", error);
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
    const attachmentId = await request.text();

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
    } catch (driveError) {
      console.error("No se confirmó el borrado en Drive:", driveError);
      return NextResponse.json({ error: "No se pudo completar la eliminación del archivo" }, { status: 502 });
    }

    // Eliminar de la BD
    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error en delete:", error);
    return NextResponse.json(
      { error: "Error al eliminar el archivo" },
      { status: 500 }
    );
  }
}
