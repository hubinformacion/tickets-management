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

export { dayjs, PERU_TIMEZONE };
