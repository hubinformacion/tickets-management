import { surveyPageSchema } from "@/lib/validation/schemas";

export const SURVEY_PAGE_SIZE = 25;

export function parseSurveyPage(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1;
  const parsed = surveyPageSchema.safeParse(value);
  return parsed.success ? parsed.data : 1;
}

export function getSurveyPagination(requestedPage: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / SURVEY_PAGE_SIZE));
  const page = Math.min(parseSurveyPage(requestedPage), pageCount);
  const offset = (page - 1) * SURVEY_PAGE_SIZE;
  return { page, pageCount, pageSize: SURVEY_PAGE_SIZE, total, offset,
    from: total ? offset + 1 : 0, to: Math.min(offset + SURVEY_PAGE_SIZE, total) };
}

export function buildSurveyPageHref(query: string, page: number): string {
  const params = new URLSearchParams(query);
  if (page <= 1) params.delete("page");
  else params.set("page", String(parseSurveyPage(page)));
  return `?${params.toString()}`;
}
