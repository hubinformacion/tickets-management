import { calculateBusinessHours, parseBusinessDays } from "@/lib/utils/business-hours";

export interface ResolutionCycle {
  areaId: number;
  areaName: string;
  startedAt: string;
  resolvedAt: string;
  businessStart: string;
  businessEnd: string;
  businessDays: string;
  slaHours: number | null;
}

interface AreaResolutionStats {
  areaName: string;
  totalHours: number;
  measuredCycles: number;
  totalResolved: number;
  withinSLA: number;
}

/** El horario y SLA actuales se aplican al historial; no existen versiones históricas. */
export function summarizeResolutionCycles(cycles: readonly ResolutionCycle[]) {
  const areas = new Map<number, AreaResolutionStats>();
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const cycle of cycles) {
    const start = new Date(cycle.startedAt);
    const end = new Date(cycle.resolvedAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start ||
        !validTime.test(cycle.businessStart) || !validTime.test(cycle.businessEnd) ||
        cycle.businessStart >= cycle.businessEnd || !parseBusinessDays(cycle.businessDays).size) continue;

    // Comparar sin redondear: unos segundos por encima del límite no cumplen el SLA.
    const hours = calculateBusinessHours(start, end, cycle.businessStart, cycle.businessEnd, cycle.businessDays, false);
    const stats = areas.get(cycle.areaId) ?? {
      areaName: cycle.areaName, totalHours: 0, measuredCycles: 0, totalResolved: 0, withinSLA: 0,
    };
    stats.totalHours += hours;
    stats.measuredCycles++;
    if (cycle.slaHours !== null && Number.isFinite(cycle.slaHours) && cycle.slaHours > 0) {
      stats.totalResolved++;
      if (hours <= cycle.slaHours) stats.withinSLA++;
    }
    areas.set(cycle.areaId, stats);
  }
  return Array.from(areas.values());
}
