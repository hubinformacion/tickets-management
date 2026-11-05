/** Comparte el envío progresivo de los dos reportes HTML, sin acumularlos completos. */
export function surveyReportResponse(
  request: Request,
  generate: (write: (html: string) => Promise<void>, signal: AbortSignal) => Promise<void>,
) {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const cancelled = new AbortController();
  // Cancelar la lectura también debe detener nuevas consultas del productor.
  void writer.closed.catch(error => cancelled.abort(error));
  const abort = () => {
    cancelled.abort();
    void writer.abort(new Error("Descarga cancelada")).catch(() => {});
  };
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();

  const run = async () => {
    try {
      await generate(async html => {
        cancelled.signal.throwIfAborted();
        await writer.write(encoder.encode(html));
      }, cancelled.signal);
      await writer.close();
    } catch {
      if (!cancelled.signal.aborted) console.error("No se pudo completar el reporte de encuestas");
      await writer.abort(new Error("No se pudo completar el reporte de encuestas")).catch(() => {});
    } finally {
      request.signal.removeEventListener("abort", abort);
      writer.releaseLock();
    }
  };
  void run();

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
