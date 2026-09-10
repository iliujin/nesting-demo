import type { Instance, Piece, Point } from '../types'
import { area, hasSelfIntersection } from './geometry'
const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i
function coordinates(text: string, line: number): number[] {
  const tokens = text.trim().split(/\s+/)
  if (tokens.length > 500) throw new Error(`第 ${line} 行：每个零件最多 500 个顶点。`)
  if (tokens.some(t => !numeric.test(t) || !Number.isFinite(Number(t)) || Math.abs(Number(t)) > 1e6)) throw new Error(`第 ${line} 行：坐标必须为有限数值，绝对值不超过 1,000,000。`)
  return tokens.map(Number)
}
export function parseInstance(source: string): Instance {
  if (new TextEncoder().encode(source).length > 1024 * 1024) throw new Error('文件大小不能超过 1 MiB。')
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).map((text, index) => ({ text: text.trim(), line: index + 1 })).filter(l => l.text && !l.text.startsWith('#'))
  let name = '上传实例', width: number | undefined, declared: number | undefined, vertices = 0
  const pieces: Piece[] = [], seen = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    const { text, line } = lines[i]
    if (/^name\s*:/i.test(text)) { name = text.replace(/^name\s*:/i, '').trim().slice(0, 120) || name; continue }
    if (/^size\s*:/i.test(text)) {
      declared = Number(text.replace(/^size\s*:/i, '').trim())
      if (!Number.isInteger(declared) || declared < 1 || declared > 500) throw new Error(`第 ${line} 行：类型数量须为 1–500。`)
      continue
    }
    if (/^(object\s*:|width\s*:)/i.test(text)) {
      const match = text.match(/width\s*:\s*(\S+)/i)
      if (match) {
        width = Number(match[1])
        if (!Number.isFinite(width) || width <= 0 || width > 1e6) throw new Error(`第 ${line} 行：容器宽度无效。`)
      } else if (!/^object\s*:\s*$/i.test(text)) throw new Error(`第 ${line} 行：无法识别容器信息。`)
      continue
    }
    if (/^no\.?\s*(quantity)?\s*$/i.test(text)) continue
    const row = text.match(/^(\d+)(?:\s+(\d+))?\s+x\s+(.+)$/i)
    if (!row) throw new Error(`第 ${line} 行：需要“编号 [数量] x 坐标…”；下一行为“y 坐标…”。`)
    const typeId = Number(row[1]), quantity = Number(row[2] ?? 1)
    if (!Number.isSafeInteger(typeId) || typeId < 1 || seen.has(typeId)) throw new Error(`第 ${line} 行：编号须为不重复的正整数。`)
    if (!Number.isSafeInteger(quantity) || quantity < 1 || pieces.length + quantity > 500) throw new Error('零件总数量须为 1–500。')
    const next = lines[++i], yRow = next?.text.match(/^y\s+(.+)$/i)
    if (!yRow) throw new Error(`第 ${line} 行之后缺少 y 坐标。`)
    const xs = coordinates(row[3], line), ys = coordinates(yRow[1], next.line)
    if (xs.length !== ys.length || xs.length < 3) throw new Error(`第 ${line} 行：x/y 坐标数量必须相等，且至少 3 个顶点。`)
    const polygon: Point[] = xs.map((x, k) => [x, ys[k]])
    if (polygon[0][0] === polygon.at(-1)![0] && polygon[0][1] === polygon.at(-1)![1]) polygon.pop()
    vertices += polygon.length * quantity
    if (vertices > 10_000) throw new Error('展开后总顶点数不能超过 10,000。')
    if (hasSelfIntersection(polygon)) throw new Error(`第 ${line} 行：零件存在自交或重复边。`)
    if (polygon.length < 3 || area(polygon) < 1e-9) throw new Error(`第 ${line} 行：零件面积须大于 0。`)
    seen.add(typeId)
    for (let k = 0; k < quantity; k++) pieces.push({ id: pieces.length + 1, typeId, polygon })
  }
  if (!pieces.length) throw new Error('文件中没有可预览的零件。请参考下载的 TXT 模板。')
  if (declared !== undefined && declared !== seen.size) throw new Error('size 声明的类型数量与文件不一致。')
  return { name, width, pieces }
}
