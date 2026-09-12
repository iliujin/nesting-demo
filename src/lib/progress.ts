export type ProgressPoint = { seconds: number; utilization: number }

export function addProgress(history: ProgressPoint[], seconds: number, area: number, width: number, height: number, containers: number): ProgressPoint[] {
  if (![seconds, area, width, height, containers].every(Number.isFinite) || seconds < 0 || Math.min(area, width, height, containers) <= 0) return history
  const utilization = area / (width * height * containers) * 100
  if (utilization > 100 + 1e-6) return history
  const last = history.at(-1)
  if (last && Math.abs(last.utilization - utilization) < 1e-8) return history
  return [...history, { seconds: Math.max(seconds, last?.seconds ?? 0), utilization: Math.min(100, utilization) }]
}
