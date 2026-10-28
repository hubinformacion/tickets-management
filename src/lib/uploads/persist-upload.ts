import { trackedUploadDrive } from "@/lib/drive/client";
import { uploadAttemptStore } from "@/lib/uploads/upload-attempt-store";
import { UploadPersistenceError } from "@/lib/uploads/upload-attempt-types";
import type { UploadAttemptInput, UploadAttemptStore, UploadDrive } from "@/lib/uploads/upload-attempt-types";

export async function persistUpload(
  input: UploadAttemptInput,
  buffer: Buffer,
  requestSignal: AbortSignal,
  store: UploadAttemptStore = uploadAttemptStore,
  drive: UploadDrive = trackedUploadDrive,
): Promise<string> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(40_000)]);
  signal.throwIfAborted();
  const result = await store.claim(input);
  if (result.kind === "stored") return result.attachmentId;
  const { claim } = result;
  try {
    let id = claim.driveFileId;
    let file = id ? await drive.find(id, input, signal) : null;
    if (!id) {
      id = await drive.generateId(signal);
      // No enviar bytes hasta que esta escritura haya sido confirmada.
      await store.assignDriveId(claim, id);
    }
    file ??= await drive.upload(id, input, buffer, signal);
    if (file.fileId !== id) throw new UploadPersistenceError("Drive no confirmó el archivo esperado", 502);
    return await store.complete(claim, input, file);
  } catch (error) {
    // Un commit perdido puede haber confirmado la carga; el guard impide degradar un estado stored.
    await store.uncertain(claim).catch(() => {});
    if (error instanceof UploadPersistenceError) throw error;
    throw new UploadPersistenceError("No se pudo confirmar la carga del archivo. Reintenta la misma carga.", 502);
  }
}
