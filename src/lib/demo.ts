import { sampleLayout } from './samples'
import type { Layout, Mode, Point } from '../types'

// Hand-authored illustration only. No solver, search algorithm, or private data.
export function demoLayout(id: string, mode: Mode, step: number): Layout {
  const base = sampleLayout(id, mode)
  const stage = Math.max(0, Math.min(2, step))
  if (mode === 'strip') {
    const extra = (2 - stage) * 40
    const columns = base.placements.length === 12 ? 4 : 3
    return { ...base, width: base.width + extra, placements: base.placements.map((p, i) => ({ ...p,
      polygon: p.polygon.map(([x, y]): Point => [x + (i % columns) * extra / (columns - 1), y]) })) }
  }
  const capacity = [2, 3, 6][stage]!
  return { ...base, containers: Math.ceil(base.placements.length / capacity), placements: base.placements.map((p, i) => {
    const previous = i % 6, next = i % capacity
    return { ...p, container: Math.floor(i / capacity), polygon: p.polygon.map(([x, y]): Point => [
      x + ((next % 2) - (previous % 2)) * 40,
      y + (Math.floor(previous / 2) - Math.floor(next / 2)) * 33,
    ]) }
  }) }
}
