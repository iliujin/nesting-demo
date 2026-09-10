import type { Layout, Mode, Point } from '../types'
// Original synthetic geometry. No private datasets or solver output.
const shapes: Point[][] = [
  [[0, 0], [36, 0], [36, 15], [12, 15], [12, 29], [0, 29]],
  [[0, 0], [36, 4], [25, 29], [0, 29]],
  [[0, 0], [36, 0], [18, 29]],
  [[8, 0], [36, 2], [36, 29], [0, 29], [0, 12], [8, 12]],
  [[0, 0], [27, 0], [36, 29], [9, 29]],
  [[0, 0], [20, 0], [36, 16], [24, 29], [2, 20]],
  [[0, 0], [36, 0], [36, 16], [18, 16], [18, 29], [0, 29]],
  [[0, 0], [36, 0], [29, 29], [6, 28]],
  [[12, 0], [36, 5], [36, 23], [24, 29], [0, 29], [0, 13]],
  [[0, 0], [36, 0], [24, 29], [0, 29]],
  [[10, 4], [36, 0], [36, 29], [0, 29]],
  [[0, 0], [36, 0], [36, 6], [20, 29], [0, 29]],
]
export const sampleOptions = [{ id: 'puzzle', label: '几何拼图 · 12 件', count: 12 }, { id: 'mini', label: '小型拼图 · 6 件', count: 6 }]
export function sampleLayout(id: string, mode: Mode): Layout {
  const sample = sampleOptions.find(s => s.id === id) ?? sampleOptions[0]
  const columns = mode === 'bin' ? 2 : sample.count === 12 ? 4 : 3
  return { name: sample.label, mode, width: mode === 'bin' ? 100 : columns * 40,
    height: mode === 'bin' || sample.count === 12 ? 100 : 68,
    containers: mode === 'bin' ? Math.ceil(sample.count / 6) : 1,
    placements: shapes.slice(0, sample.count).map((polygon, i) => {
      const position = mode === 'bin' ? i % 6 : i
      return { id: i + 1, typeId: i + 1, container: mode === 'bin' ? Math.floor(i / 6) : 0, rotation: 0,
        polygon: polygon.map(([x, y]): Point => [x + (position % columns) * 40 + 2, y + (mode === 'bin' || sample.count === 12 ? 100 : 68) - Math.floor(position / columns) * 33 - 31]) }
    }) }
}
export function sampleText(id: string): string {
  const sample = sampleOptions.find(s => s.id === id) ?? sampleOptions[0]
  return `name: ${sample.id}\nsize: ${sample.count}\nobject: width: 100\nno. quantity\n` + shapes.slice(0, sample.count).map((p, i) => `${i + 1} 1 x ${p.map(v => v[0]).join(' ')}\n    y ${p.map(v => v[1]).join(' ')}`).join('\n') + '\n'
}
