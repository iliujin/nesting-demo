import { expect, it } from 'vitest'
import { demoLayout } from '../src/lib/demo'
import { area } from '../src/lib/geometry'

it.each(['strip', 'bin'] as const)('illustrates %s improvements without changing piece geometry', mode => {
  const stages = [0, 1, 2].map(step => demoLayout('puzzle', mode, step))
  const utilizations = stages.map(layout => layout.placements.reduce((sum, p) => sum + area(p.polygon), 0) / (layout.width * layout.height * layout.containers))
  expect(utilizations[0]).toBeLessThan(utilizations[1]!)
  expect(utilizations[1]).toBeLessThan(utilizations[2]!)
  for (const layout of stages) {
    expect(layout.placements).toHaveLength(12)
    layout.placements.forEach((p, i) => expect(area(p.polygon)).toBeCloseTo(area(stages[2]!.placements[i]!.polygon), 8))
    expect(layout.placements.every(p => p.container < layout.containers && p.polygon.every(([x, y]) => x >= 0 && y >= 0 && x <= layout.width && y <= layout.height))).toBe(true)
  }
})
