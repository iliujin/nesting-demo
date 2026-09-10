import type { Point } from '../types'
export function area(points: Point[]): number {
  return Math.abs(points.reduce((sum, [x, y], i) => {
    const next = points[(i + 1) % points.length]
    return sum + x * next[1] - next[0] * y
  }, 0)) / 2
}
export function bounds(points: Point[]) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const minX = Math.min(...xs), minY = Math.min(...ys)
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY }
}
function cross(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
function onSegment(a: Point, b: Point, c: Point) {
  return Math.abs(cross(a, b, c)) < 1e-9 && c[0] >= Math.min(a[0], b[0]) && c[0] <= Math.max(a[0], b[0]) && c[1] >= Math.min(a[1], b[1]) && c[1] <= Math.max(a[1], b[1])
}
export function hasSelfIntersection(points: Point[]): boolean {
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    if (a[0] === b[0] && a[1] === b[1]) return true
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue
      const c = points[j], d = points[(j + 1) % points.length]
      if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return true
    }
  }
  return false
}
export const colors = ['#86d6ed', '#f7a6b2', '#9ee5c9', '#c5aff0', '#f7d88e', '#97b5f4', '#eab3dc', '#95dcd7', '#b9a1e9', '#88c5f3', '#f8b5aa', '#f8df9a']
export const pointsText = (points: Point[]) => points.map(p => p.join(',')).join(' ')
export const numberText = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
export function centroid(points: Point[]): Point {
  let crossSum = 0, xSum = 0, ySum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const weight = a[0] * b[1] - b[0] * a[1]
    crossSum += weight
    xSum += (a[0] + b[0]) * weight
    ySum += (a[1] + b[1]) * weight
  }
  return [xSum / (3 * crossSum), ySum / (3 * crossSum)]
}
