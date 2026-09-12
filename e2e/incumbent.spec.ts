import { test, expect } from '@playwright/test'
import { sampleLayout } from '../src/lib/samples'

test('running incumbent appears, refreshes and survives cancellation', async ({ page }) => {
  const endpoint = 'https://solver.example.test'
  let revision = 'first', cancelled = false, requests = 0
  const fixture = { ...sampleLayout('mini', 'strip'), kind: 'solver_result', validated: true }
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { status: 'ready' }
    if (path.endsWith('/sessions')) json = { token: 'incumbent-fixture-token', expiresAt: Date.now() / 1000 + 86400 }
    if (path.endsWith('/instances')) json = { id: 'instance' }
    if (path.endsWith('/cancel')) cancelled = true
    if (path.includes('/jobs')) json = { id: 'incumbent', status: cancelled ? 'cancelled' : 'running', hasResult: true, resultRevision: revision }
    if (path.endsWith('/result')) {
      requests++
      json = { ...fixture, resultRevision: revision, status: cancelled ? 'cancelled' : 'running' }
    }
    await route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('./')
  await page.getByLabel('选择内置示例').selectOption('mini')
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await expect(page.getByRole('heading', { name: '当前最优排样', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeEnabled()
  await expect(page.getByRole('status')).toContainText('正在求解')
  expect(requests).toBe(1)
  const refreshed = page.waitForResponse(r => r.url().endsWith('/result'))
  revision = 'second'
  expect((await (await refreshed).json()).resultRevision).toBe('second')
  await page.getByRole('button', { name: '取消任务', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已取消')
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果 JSON' }).click()
  expect((await downloaded).suggestedFilename()).toContain('nesting-result')
})
