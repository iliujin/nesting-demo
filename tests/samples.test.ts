import { expect, it } from 'vitest'
import { area, bounds, hasSelfIntersection } from '../src/lib/geometry'
import { parseInstance } from '../src/lib/instances'
import { sampleLayout, sampleText } from '../src/lib/samples'

for (const id of ['puzzle', 'mini']) for (const mode of ['strip', 'bin'] as const) {
  it(`${id}/${mode} uses complete nonoverlapping geometry inside containers`, () => {
    const layout = sampleLayout(id, mode)
    expect(layout.placements).toHaveLength(id === 'puzzle' ? 12 : 6)
    expect(parseInstance(sampleText(id)).pieces).toHaveLength(id === 'puzzle' ? 12 : 6)
    const totalArea = layout.placements.reduce((sum, p) => sum + area(p.polygon), 0)
    expect(totalArea).toBe(id === 'puzzle' ? 9546.5 : 4468.5)
    for (const piece of layout.placements) {
      expect(hasSelfIntersection(piece.polygon)).toBe(false)
      const b = bounds(piece.polygon)
      expect(b.minX).toBeGreaterThanOrEqual(0)
      expect(b.minY).toBeGreaterThanOrEqual(0)
      expect(b.minX + b.width).toBeLessThanOrEqual(layout.width)
      expect(b.minY + b.height).toBeLessThanOrEqual(layout.height)
      for (const other of layout.placements.filter(p => p.id > piece.id && p.container === piece.container)) {
        const c = bounds(other.polygon)
        // These authored fixtures use disjoint cells, so bounding-box separation proves no overlap.
        expect(b.minX + b.width <= c.minX || c.minX + c.width <= b.minX || b.minY + b.height <= c.minY || c.minY + c.height <= b.minY).toBe(true)
      }
    }
  })
}
