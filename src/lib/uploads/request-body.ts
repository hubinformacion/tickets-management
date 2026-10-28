export class UploadRequestError extends Error {
  constructor(message: string, public status: 400 | 413 | 415) {
    super(message);
  }
}

/** Limita los bytes reales antes de parsear multipart, incluso sin Content-Length. */
export async function readLimitedBody(request: Request, maxBytes: number): Promise<ArrayBuffer> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) {
    throw new UploadRequestError("Longitud de solicitud inválida", 400);
  }
  if (length !== null && Number(length) > maxBytes) {
    throw new UploadRequestError("La solicitud excede el tamaño permitido", 413);
  }
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  let bytes = new Uint8Array(Math.min(maxBytes, 64 * 1024));
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maxBytes) {
        // No leer más bytes ni iniciar el parser multipart.
        // No forzar la cancelación de un productor multipart que aún pueda estar emitiendo.
        throw new UploadRequestError("La solicitud excede el tamaño permitido", 413);
      }
      if (size + value.byteLength > bytes.byteLength) {
        const expanded = new Uint8Array(Math.min(maxBytes, Math.max(size + value.byteLength, bytes.byteLength * 2)));
        expanded.set(bytes);
        bytes = expanded;
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    if (length !== null && Number(length) !== size) throw new UploadRequestError("Longitud de solicitud inconsistente", 400);
    return bytes.slice(0, size).buffer;
  } finally {
    reader.releaseLock();
  }
}
