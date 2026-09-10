import type { Layout } from '../types'

export type AppConfig = { mode: 'preview' | 'live'; apiBaseUrl: string }
export type Job = { id: string; status: 'queued' | 'running' | 'stopping' | 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'interrupted'; hasResult: boolean; error?: string | null; startedAt?: number; finishedAt?: number }
export type RealResult = Layout & { kind: 'solver_result'; validated: true; jobId?: string; elapsedSeconds?: number; status?: string; [key: string]: unknown }

export function parseConfig(raw: unknown, localDevelopment = false): AppConfig {
  const data = raw as Partial<AppConfig>
  if (data?.mode === 'preview') return { mode: 'preview', apiBaseUrl: '' }
  if (data?.mode !== 'live' || typeof data.apiBaseUrl !== 'string') throw new Error('页面连接配置无效。')
  const url = new URL(data.apiBaseUrl)
  const loopback = localDevelopment && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  if ((!loopback && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash) throw new Error('在线服务必须使用不含凭证的 HTTPS 地址。')
  return { mode: 'live', apiBaseUrl: url.href.replace(/\/$/, '') }
}

export async function loadConfig(): Promise<AppConfig> {
  const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('无法读取页面连接配置。')
  return parseConfig(await response.json(), ['localhost', '127.0.0.1'].includes(window.location.hostname))
}

export function parseResult(raw: unknown, expectedPieces: number): RealResult {
  const result = raw as RealResult
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  if (!result || result.kind !== 'solver_result' || result.validated !== true || !['strip', 'bin'].includes(result.mode)
      || !finite(result.width) || !finite(result.height) || result.width <= 0 || result.height <= 0
      || !Number.isInteger(result.containers) || result.containers < 1 || result.containers > expectedPieces
      || !Array.isArray(result.placements) || result.placements.length !== expectedPieces) throw new Error('服务器返回的排样结果不完整。')
  const ids = new Set<number>()
  for (const piece of result.placements) {
    if (!Number.isInteger(piece.id) || piece.id < 1 || piece.id > expectedPieces || ids.has(piece.id)
        || !Number.isInteger(piece.typeId) || ![0, 90, 180, 270].includes(piece.rotation)
        || !Number.isInteger(piece.container) || piece.container < 0 || piece.container >= result.containers
        || !Array.isArray(piece.polygon) || piece.polygon.length < 3 || piece.polygon.length > 500
        || piece.polygon.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(finite))) throw new Error('服务器返回的零件数据无效。')
    ids.add(piece.id)
  }
  return result
}

export class ApiError extends Error { constructor(message: string, public status: number) { super(message) } }

export class SolverApi {
  private token = ''
  private expiresAt = 0
  private instanceCache = new Map<string, string>()
  constructor(private base: string) {}

  private async request(path: string, method = 'GET', body?: unknown, authenticate = true): Promise<any> {
    if (authenticate && !this.token) await this.session()
    let response: Response
    try {
      response = await fetch(this.base + '/api/v1' + path, { method, credentials: 'omit',
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticate ? { Authorization: `Bearer ${this.token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000), cache: 'no-store' })
    } catch {
      throw new Error(method === 'GET' ? '无法连接求解服务，请检查网络后重试。' : '请求未得到确认。任务可能已提交，请稍后重试，避免连续提交。')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new ApiError(typeof data.detail === 'string' ? data.detail : `服务请求失败（${response.status}）。`, response.status)
    return data
  }

  private async session() {
    // Renew only before a NEW submission; existing jobs retain their owner identity.
    if (this.token && this.expiresAt > Date.now() / 1000 + 3600) return
    const data = await this.request('/sessions', 'POST', undefined, false)
    if (typeof data.token !== 'string' || typeof data.expiresAt !== 'number') throw new Error('无法建立访客会话。')
    this.token = data.token; this.expiresAt = data.expiresAt; this.instanceCache.clear()
  }

  ready() { return this.request('/health/ready', 'GET', undefined, false) }
  async submit(text: string, parameters: { mode: string; width?: number; sizeFactor: number; timeLimitSeconds: number }): Promise<Job> {
    await this.session()
    let instanceId = this.instanceCache.get(text)
    if (!instanceId) {
      const instance = await this.request('/instances', 'POST', { text })
      instanceId = instance.id
      if (typeof instanceId !== 'string') throw new Error('实例上传未返回编号。')
      this.instanceCache.set(text, instanceId)
    }
    return this.request('/jobs', 'POST', { instanceId, ...parameters })
  }
  async status(id: string): Promise<Job> {
    const job = await this.request('/jobs/' + encodeURIComponent(id))
    if (!['queued', 'running', 'stopping', 'completed', 'failed', 'cancelled', 'timed_out', 'interrupted'].includes(job.status)) throw new Error('服务器返回了未知任务状态。')
    return job
  }
  cancel(id: string): Promise<Job> { return this.request('/jobs/' + encodeURIComponent(id) + '/cancel', 'POST') }
  async result(id: string, expectedPieces: number) {
    return parseResult(await this.request('/jobs/' + encodeURIComponent(id) + '/result'), expectedPieces)
  }
}
