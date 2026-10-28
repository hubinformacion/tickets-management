// Una fecha de calendario no representa un instante y no debe convertirse de zona horaria.
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatCalendarDate(value: string | null | undefined): string {
  if (!value || !isCalendarDate(value)) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
