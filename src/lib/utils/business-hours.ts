/**
 * Utilidades para cálculo de horas hábiles por área de atención.
 *
 * Los horarios configurados en cada área no cierran formularios;
 * sirven exclusivamente para calcular métricas de tiempo de atención.
 */

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
 * considerando el horario de operación del área y excluyendo fines de semana.
 *
 * @param startDate - Fecha/hora de inicio (ej. creación del ticket)
 * @param endDate - Fecha/hora de fin (ej. resolución del ticket)
 * @param businessStart - Hora de inicio del horario hábil en formato "HH:MM"
 * @param businessEnd - Hora de fin del horario hábil en formato "HH:MM"
 * @returns Total de horas hábiles (number con decimales)
 */
export function calculateBusinessHours(
  startDate: Date,
  endDate: Date,
  businessStart: string,
  businessEnd: string,
): number {
  if (endDate <= startDate) return 0;

  const startMinutes = timeToMinutes(businessStart);
  const endMinutes = timeToMinutes(businessEnd);
  const dailyBusinessMinutes = endMinutes - startMinutes;

  if (dailyBusinessMinutes <= 0) return 0;

  let totalMinutes = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay(); // 0 = domingo, 6 = sábado

    // Solo contar lunes a viernes
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
