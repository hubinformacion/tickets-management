import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_BYTES } from "@/lib/constants/attachments";
import { getUploadFolderStatus } from "@/lib/drive/client";
import { isUploadAttemptStoreReady } from "@/lib/uploads/upload-attempt-store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Inspección independiente: nunca ejecuta uploads, cancelaciones ni escrituras de negocio.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const [database, drive] = await Promise.allSettled([
    isUploadAttemptStoreReady(),
    getUploadFolderStatus(AbortSignal.timeout(10_000)),
  ]);
  const databaseReady = database.status === "fulfilled" && database.value;
  const driveStatus = drive.status === "fulfilled" ? drive.value : "unavailable";
  return NextResponse.json({
    databaseReady,
    driveStatus,
    policy: { maxFileBytes: MAX_ATTACHMENT_BYTES, unlimitedFiles: true },
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || null,
  }, {
    status: databaseReady && driveStatus === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
