import { describe, expect, it } from 'vitest'
import { area, bounds } from '../src/lib/geometry'
import { parseInstance } from '../src/lib/instances'
import { serializeSvg } from '../src/lib/export'

const source = 'name: Public example\nsize: 1\nobject: width: 100\nno. quantity\n1 2 x 0 10 10 0\n y 0 0 20 20\n'

describe('geometric display calculations', () => {
  it('computes actual area in either winding instead of reporting a fixed utilization', () => {
    expect(area([[0, 0], [10, 0], [10, 20], [0, 20]])).toBe(200)
    expect(area([[0, 0], [0, 20], [10, 20], [10, 0]])).toBe(200)
  })
  it('preserves negative coordinates when fitting uploaded shapes', () => {
    expect(bounds([[-8, -5], [2, 3], [0, 1]])).toEqual({ minX: -8, minY: -5, width: 10, height: 8 })
  })
})

describe('bounded TXT parsing', () => {
  it('expands quantities and preserves the optional width', () => {
    const result = parseInstance(source)
    expect(result).toMatchObject({ name: 'Public example', width: 100 })
    expect(result?.pieces).toHaveLength(2)
    expect(result?.pieces[1]).toMatchObject({ id: 2, typeId: 1, polygon: [[0, 0], [10, 0], [10, 20], [0, 20]] })
  })
  it('accepts no-quantity CRLF coordinate rows', () => {
    expect(parseInstance('name:\tTest\r\nsize:\t1\r\nno\r\n1\tx\t0\t3\t0\r\n\ty\t0\t0\t4')?.pieces).toHaveLength(1)
  })
  it('rejects x/y mismatch instead of silently losing vertices', () => {
    expect(() => parseInstance(source.replace('y 0 0 20 20', 'y 0 0 20'))).toThrow(/坐标/)
  })
  it('rejects quantity expansion that would freeze the browser', () => {
    expect(() => parseInstance(source.replace('1 2 x', '1 501 x'))).toThrow(/500/)
  })
  it('rejects nonfinite or malformed coordinate tokens', () => {
    expect(() => parseInstance(source.replace('x 0 10', 'x NaN 10'))).toThrow(/坐标/)
    expect(() => parseInstance(source.replace('x 0 10', 'x 0oops 10'))).toThrow(/坐标/)
  })
  it('rejects a mismatching declared piece type count', () => {
    expect(() => parseInstance(source.replace('size: 1', 'size: 2'))).toThrow(/数量/)
  })
  it('rejects self-crossing geometry and empty input', () => {
    expect(() => parseInstance('')).toThrow()
    expect(() => parseInstance('size: 1\nno\n1 x 0 4 0 3\ny 0 4 4 0')).toThrow(/自交/)
  })
  it('enforces the input byte limit before processing', () => {
    expect(() => parseInstance('x'.repeat(1024 * 1024 + 1))).toThrow(/1 MiB/)
  })
})

it('exports valid SVG with escaped title and a sample disclosure', () => {
  const svg = serializeSvg({ name: '<script>&"', mode: 'strip', width: 10, height: 20, containers: 1,
    placements: [{ id: 1, typeId: 1, container: 0, rotation: 0, polygon: [[0, 0], [10, 0], [0, 20]] }] }, 0, true)
  expect(svg).toContain('&lt;script&gt;&amp;')
  expect(svg).not.toContain('<script>')
  expect(svg).toContain('预计算示例')
  expect(svg).toContain('0,0 10,0 0,20')
})
