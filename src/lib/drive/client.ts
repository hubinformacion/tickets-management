import { auth, drive as createDriveClient } from "googleapis/build/src/apis/drive";
import { Readable } from 'stream';

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

/**
 * Sube un archivo a Google Drive en la carpeta institucional.
 * El archivo conserva los permisos efectivos de la carpeta de destino.
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
  if (!FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado');
  }

  // Subir archivo
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Google Drive no retornó un ID de archivo');
  }

  const viewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, viewLink };
}

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
