import { test, expect } from '@playwright/test'
import { sampleLayout } from '../src/lib/samples'

test('pending result keeps its input locked until the correct job result arrives', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const endpoint = 'https://solver.example.test'
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { status: 'ready' }
    if (path.endsWith('/sessions')) json = { token: 'test-token', expiresAt: Date.now() / 1000 + 86400 }
    if (path.endsWith('/instances')) json = { id: 'instance' }
    if (path.endsWith('/jobs')) json = { id: 'job', status: 'queued', hasResult: false }
    if (path.endsWith('/jobs/job')) json = { id: 'job', status: 'completed', hasResult: true }
    if (path.endsWith('/result')) { await pending; json = { ...sampleLayout('mini', 'strip'), kind: 'solver_result', validated: true } }
    await route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('./')
  await page.getByLabel('选择内置示例').selectOption('mini')
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await expect(page.getByRole('button', { name: '正在加载结果', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '固定容器', exact: true })).toBeDisabled()
  await expect(page.getByLabel('容器宽度', { exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '固定容器', exact: true }).click()
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toHaveCount(0)
})
