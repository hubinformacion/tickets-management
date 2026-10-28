import { auth, drive as createDriveClient } from "googleapis/build/src/apis/drive";
import { Readable } from 'stream';
import { UploadPersistenceError } from '@/lib/uploads/upload-attempt-types';
import type { UploadDrive, UploadAttemptInput } from '@/lib/uploads/upload-attempt-types';

// Reutiliza las mismas credenciales OAuth2 que el cliente de Gmail
const oauth2Client = new auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`
);

if (process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
}

const drive = createDriveClient({ version: 'v3', auth: oauth2Client });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export interface DriveUploadResult {
  fileId: string;
  viewLink: string;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("response" in error && typeof error.response === "object" && error.response !== null &&
      "status" in error.response && typeof error.response.status === "number") return error.response.status;
  if ("code" in error && typeof error.code === "number") return error.code;
  return undefined;
}

function requireFolder(): string {
  if (!FOLDER_ID) throw new Error("GOOGLE_DRIVE_FOLDER_ID no está configurado");
  return FOLDER_ID;
}

export type UploadFolderStatus = "ready" | "not_configured" | "not_found" | "forbidden" | "invalid_folder" | "unavailable";

/** Comprobación operativa de solo lectura; no expone IDs ni credenciales. */
export async function getUploadFolderStatus(signal: AbortSignal): Promise<UploadFolderStatus> {
  if (!FOLDER_ID) return "not_configured";
  try {
    const response = await drive.files.get({ fileId: FOLDER_ID, fields: 'id,mimeType,trashed' },
      { signal, timeout: 10_000, retry: false });
    return response.data.id === FOLDER_ID && response.data.mimeType === 'application/vnd.google-apps.folder' &&
      response.data.trashed !== true ? "ready" : "invalid_folder";
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 404) return "not_found";
    if (status === 401 || status === 403) return "forbidden";
    return "unavailable";
  }
}

async function findTrackedFile(id: string, input: UploadAttemptInput, signal: AbortSignal): Promise<DriveUploadResult | null> {
  const folderId = requireFolder();
  try {
    const response = await drive.files.get({
      fileId: id,
      fields: 'id,size,mimeType,md5Checksum,trashed,parents,appProperties,webViewLink',
    }, { signal, timeout: 10_000, retry: false });
    const file = response.data;
    if (file.id !== id || file.trashed === true || file.size !== String(input.fileSize) ||
        file.mimeType !== input.mimeType || file.md5Checksum?.toLowerCase() !== input.md5 ||
        !file.parents?.includes(folderId) || file.appProperties?.uploadAttemptId !== input.id ||
        file.appProperties?.uploadSha256 !== input.sha256) {
      throw new UploadPersistenceError("El archivo de Drive no coincide con esta carga. Revisa el intento antes de continuar.", 409);
    }
    return { fileId: id, viewLink: file.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` };
  } catch (error) {
    // Crear de nuevo con el mismo ID es seguro incluso si el 404 representa pérdida de acceso.
    if (getErrorStatus(error) === 404) return null;
    throw error;
  }
}

export const trackedUploadDrive: UploadDrive = {
  async generateId(signal) {
    requireFolder();
    const response = await drive.files.generateIds({ count: 1, space: 'drive', type: 'files' },
      { signal, timeout: 10_000, retry: false });
    const id = response.data.ids?.[0];
    if (!id) throw new Error("Drive no retornó un ID reservado");
    return id;
  },

  find: findTrackedFile,

  async upload(id, input, buffer, signal) {
    const folderId = requireFolder();
    try {
      const response = await drive.files.create({
        requestBody: {
          id, name: input.fileName, mimeType: input.mimeType, parents: [folderId],
          appProperties: { uploadAttemptId: input.id, uploadSha256: input.sha256 },
        },
        media: { mimeType: input.mimeType, body: Readable.from(buffer) },
        fields: 'id,webViewLink',
      }, { signal, timeout: 25_000, retry: false });
      if (response.data.id !== id) throw new Error("Drive no confirmó el ID reservado");
      return { fileId: id, viewLink: response.data.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` };
    } catch (error) {
      if (getErrorStatus(error) !== 409) throw error;
      const existing = await findTrackedFile(id, input, signal);
      if (!existing) throw new Error("Drive no confirmó el archivo del intento anterior");
      return existing;
    }
  },
};

/**
 * Elimina un archivo de Google Drive.
 */
export async function deleteFileFromDrive(
  driveFileId: string,
  options?: { signal: AbortSignal; timeout: number },
): Promise<void> {
  await drive.files.delete({
    fileId: driveFileId,
  }, options ? { ...options, retry: false } : undefined);
}
