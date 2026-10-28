import type { DriveUploadResult } from "@/lib/drive/client";

export class UploadPersistenceError extends Error {
  constructor(message: string, public status: 409 | 410 | 502 | 503, public retryAfter?: number) {
    super(message);
  }
}

export interface UploadAttemptInput {
  id: string;
  userId: string;
  uploadToken: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  md5: string;
}

export interface UploadClaim {
  id: string;
  attachmentId: string;
  token: string;
  driveFileId: string | null;
}

export interface UploadAttemptStore {
  claim(input: UploadAttemptInput): Promise<
    { kind: "stored"; attachmentId: string } | { kind: "claimed"; claim: UploadClaim }
  >;
  assignDriveId(claim: UploadClaim, driveFileId: string): Promise<void>;
  complete(claim: UploadClaim, input: UploadAttemptInput, file: DriveUploadResult): Promise<string>;
  uncertain(claim: UploadClaim): Promise<void>;
}

export interface UploadDrive {
  generateId(signal: AbortSignal): Promise<string>;
  find(id: string, input: UploadAttemptInput, signal: AbortSignal): Promise<DriveUploadResult | null>;
  upload(id: string, input: UploadAttemptInput, buffer: Buffer, signal: AbortSignal): Promise<DriveUploadResult>;
}
