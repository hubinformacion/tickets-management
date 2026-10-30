import { parsePage, getPagination, buildPageHref } from "@/lib/utils/pagination";

export const SURVEY_PAGE_SIZE = 25;

export const parseSurveyPage = parsePage;
export const buildSurveyPageHref = buildPageHref;

export function getSurveyPagination(requestedPage: number, total: number) {
  return getPagination(requestedPage, total, SURVEY_PAGE_SIZE);
}
