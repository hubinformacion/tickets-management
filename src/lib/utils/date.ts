import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const PERU_TIMEZONE = "America/Lima";

dayjs.locale("es");
dayjs.tz.setDefault(PERU_TIMEZONE);

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format("DD/MM/YYYY HH:mm");
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format("DD/MM/YYYY");
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format("HH:mm");
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format("D [de] MMMM [de] YYYY, HH:mm");
}

function formatForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  return dayjs(date).tz(PERU_TIMEZONE).format("YYYY-MM-DD");
}

function formatForDisplay(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format("DD MMM YYYY");
}

function formatRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  if (!startDate) return "-";
  const start = dayjs(startDate).tz(PERU_TIMEZONE);
  if (!endDate) return start.format("DD MMM YYYY");
  const end = dayjs(endDate).tz(PERU_TIMEZONE);
  return `${start.format("DD MMM")} - ${end.format("DD MMM YYYY")}`;
}

export function differenceInDays(date: Date | string, baseDate: Date | string = new Date()): number {
  return dayjs(baseDate).diff(dayjs(date), "day");
}

function nowInPeru(): dayjs.Dayjs {
  return dayjs().tz(PERU_TIMEZONE);
}

function toPeruTime(date: Date | string): dayjs.Dayjs {
  return dayjs(date).tz(PERU_TIMEZONE);
}

function formatDateWithTimezone(
  date: Date | string | null | undefined,
  formatStr: string = "DD/MM/YYYY HH:mm"
): string {
  if (!date) return "-";
  return dayjs(date).tz(PERU_TIMEZONE).format(formatStr);
}

export { dayjs, PERU_TIMEZONE };
