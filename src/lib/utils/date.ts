import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatCalendarDate } from "@/lib/utils/calendar-date";

dayjs.extend(utc);
dayjs.extend(timezone);

const PERU_TIMEZONE = "America/Lima";

dayjs.locale("es");
dayjs.tz.setDefault(PERU_TIMEZONE);

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return formatCalendarDate(date);
  const instant = dayjs(date);
  return instant.isValid() ? instant.tz(PERU_TIMEZONE).format("DD/MM/YYYY HH:mm") : "-";
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return formatCalendarDate(date);
  const instant = dayjs(date);
  return instant.isValid() ? instant.tz(PERU_TIMEZONE).format("DD/MM/YYYY") : "-";
}

export { formatCalendarDate } from "@/lib/utils/calendar-date";
export { dayjs, PERU_TIMEZONE };
