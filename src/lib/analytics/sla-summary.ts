/** Pondera por ciclos evaluables; un área pequeña no pesa igual que una grande. */
export function getSLACompliancePercent(areas: readonly { totalResolved: number; withinSLA: number }[]): number | null {
  const total = areas.reduce((sum, area) => sum + area.totalResolved, 0);
  const within = areas.reduce((sum, area) => sum + area.withinSLA, 0);
  return total > 0 ? Math.round(within / total * 100) : null;
}
