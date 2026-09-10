import { afterEach, expect, it, vi } from 'vitest'
import { SolverApi } from '../src/lib/api'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

it('retains the existing job owner when the session approaches expiry', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-10T00:00:00Z'))
  const expiresAt = Date.now() / 1000 + 86400
  let sessions = 0
  const authorizations: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/sessions')) { sessions++; return Response.json({ token: `owner-${sessions}`, expiresAt }) }
    authorizations.push((init?.headers as Record<string, string>).Authorization)
    if (url.endsWith('/instances')) return Response.json({ id: 'instance' })
    return Response.json({ id: 'job', status: 'running', hasResult: false })
  })
  const api = new SolverApi('https://example.test')
  await api.submit('fixture', { mode: 'strip', width: 100, sizeFactor: 1.5, timeLimitSeconds: 60 })
  vi.setSystemTime(new Date('2026-09-10T23:59:30Z'))
  await api.status('job')
  expect(sessions).toBe(1)
  expect(authorizations.at(-1)).toBe('Bearer owner-1')
})
