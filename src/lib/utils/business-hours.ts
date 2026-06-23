/**
 * Utilidades para cálculo de horas hábiles por área de atención.
 *
 * Los horarios configurados en cada área no cierran formularios;
 * sirven exclusivamente para calcular métricas de tiempo de atención.
 */

/**
 * Nombres de los días de la semana (índice = Date.getDay()).
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
 */
export const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/** Abreviaciones cortas de los días */
export const DAY_SHORT_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

/** Días de la semana en orden lunes-domingo para la UI */
export const WEEKDAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Default: Lunes a Viernes */
export const DEFAULT_BUSINESS_DAYS = "1,2,3,4,5";

/**
 * Convierte un string CSV de días ("1,2,3,4,5") a un Set de números.
 */
export function parseBusinessDays(businessDays: string): Set<number> {
  return new Set(businessDays.split(",").map(Number).filter(n => n >= 0 && n <= 6));
}

/**
 * Formatea los días hábiles como texto legible.
 * Ejemplo: "1,2,3,4,5" → "Lun – Vie"
 * Ejemplo: "1,2,3,4,5,6" → "Lun – Sáb"
 * Ejemplo: "1,3,5" → "Lun, Mié, Vie"
 */
export function formatBusinessDays(businessDays: string): string {
  const days = businessDays.split(",").map(Number).sort((a, b) => {
    // Ordenar con lunes primero (1,2,3,4,5,6,0)
    const orderA = a === 0 ? 7 : a;
    const orderB = b === 0 ? 7 : b;
    return orderA - orderB;
  });

  if (days.length === 0) return "Sin días hábiles";

  // Verificar si son consecutivos para mostrar rango
  const ordered = days.map(d => d === 0 ? 7 : d);
  const isConsecutive = ordered.every((val, i) => i === 0 || val === ordered[i - 1] + 1);

  if (isConsecutive && days.length > 2) {
    return `${DAY_SHORT_LABELS[days[0]]} – ${DAY_SHORT_LABELS[days[days.length - 1]]}`;
  }

  return days.map(d => DAY_SHORT_LABELS[d]).join(", ");
}

/**
 * Convierte un string "HH:MM" a minutos desde medianoche.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Formatea un horario "HH:MM" (24h) a formato legible en español.
 * Ejemplo: "08:30" → "8:30 a.m.", "18:30" → "6:30 p.m."
 */
export function formatBusinessTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "p.m." : "a.m.";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Formatea el rango de horario de un área.
 * Ejemplo: "8:30 a.m. – 6:30 p.m."
 */
export function formatBusinessHoursRange(startTime: string, endTime: string): string {
  return `${formatBusinessTime(startTime)} – ${formatBusinessTime(endTime)}`;
}

/**
 * Calcula las horas hábiles transcurridas entre dos fechas,
 * considerando el horario de operación del área y los días hábiles configurados.
 *
 * @param startDate - Fecha/hora de inicio (ej. creación del ticket)
 * @param endDate - Fecha/hora de fin (ej. resolución del ticket)
 * @param businessStart - Hora de inicio del horario hábil en formato "HH:MM"
 * @param businessEnd - Hora de fin del horario hábil en formato "HH:MM"
 * @param businessDays - Días hábiles como CSV (ej. "1,2,3,4,5"). Default: L-V
 * @returns Total de horas hábiles (number con decimales)
 */
export function calculateBusinessHours(
  startDate: Date,
  endDate: Date,
  businessStart: string,
  businessEnd: string,
  businessDays: string = DEFAULT_BUSINESS_DAYS,
): number {
  if (endDate <= startDate) return 0;

  const startMinutes = timeToMinutes(businessStart);
  const endMinutes = timeToMinutes(businessEnd);
  const dailyBusinessMinutes = endMinutes - startMinutes;
  const workDays = parseBusinessDays(businessDays);

  if (dailyBusinessMinutes <= 0 || workDays.size === 0) return 0;

  let totalMinutes = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay(); // 0 = domingo, 6 = sábado

    // Solo contar días hábiles configurados
    if (workDays.has(dayOfWeek)) {
      const currentDayStart = new Date(current);
      currentDayStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const currentDayEnd = new Date(current);
      currentDayEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      // Determinar el rango efectivo para este día
      const effectiveStart = current > currentDayStart ? current : currentDayStart;
      const effectiveEnd = endDate < currentDayEnd ? endDate : currentDayEnd;

      if (effectiveStart < effectiveEnd) {
        totalMinutes += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);
      }
    }

    // Avanzar al inicio del siguiente día
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return Math.round((totalMinutes / 60) * 100) / 100;
}
