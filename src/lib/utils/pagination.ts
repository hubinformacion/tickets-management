import { paginationPageSchema } from "@/lib/validation/schemas";

export function parsePage(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1;
  const parsed = paginationPageSchema.safeParse(value);
  return parsed.success ? parsed.data : 1;
}

export function getPagination(requestedPage: number, total: number, pageSize = 25) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(parsePage(requestedPage), pageCount);
  const offset = (page - 1) * pageSize;
  return { page, pageCount, pageSize, total, offset,
    from: total ? offset + 1 : 0, to: Math.min(offset + pageSize, total) };
}

export function buildPageHref(query: string, page: number): string {
  const params = new URLSearchParams(query);
  if (page <= 1) params.delete("page");
  else params.set("page", String(parsePage(page)));
  return `?${params.toString()}`;
}
