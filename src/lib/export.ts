import type { Layout } from '../types'
import { centroid, colors, pointsText } from './geometry'
const escapeXml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
export function serializeSvg(layout: Layout, container: number, labels: boolean, real = false): string {
  const pieces = layout.placements.filter(p => p.container === container)
  const polygons = pieces.map(p => `<polygon points="${pointsText(p.polygon)}" fill="${colors[(p.id - 1) % colors.length]}" stroke="#334569" stroke-width="0.25"/>`).join('\n')
  const text = labels ? pieces.map(p => {
    const position = centroid(p.polygon)
    return `<text x="${position[0]}" y="${layout.height - position[1]}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="3">${p.id}</text>`
  }).join('\n') : ''
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${layout.width + 4} ${layout.height + 4}" width="1200" role="img"><title>${escapeXml(layout.name)} — ${real ? '真实求解结果' : '预计算示例'} / 容器 ${container + 1}</title><desc>${real ? '私有求解器计算的可行排样，未证明全局最优。' : '仅用于界面展示，不代表求解器性能。'}坐标单位为实例单位。</desc><rect width="${layout.width}" height="${layout.height}" fill="white" stroke="#334569" stroke-width="0.3"/><g transform="translate(0 ${layout.height}) scale(1 -1)">${polygons}</g>${text}</svg>`
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
