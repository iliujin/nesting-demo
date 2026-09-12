import { test, expect } from '@playwright/test'
import { sampleLayout } from '../src/lib/samples'

test('utilization trend shows real improvement and clears for a new input', async ({ page }) => {
  const endpoint = 'https://solver.example.test'
  const fixture = { ...sampleLayout('mini', 'strip'), kind: 'solver_result', validated: true }
  let revision = 1, done = false
  await page.route('**/config.json', r => r.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', async r => {
    const path = new URL(r.request().url()).pathname
    let json: unknown = { status: 'ready' }
    if (path.endsWith('/sessions')) json = { token: 'trend-test', expiresAt: Date.now() / 1000 + 86400 }
    if (path.endsWith('/instances')) json = { id: 'instance' }
    if (path.includes('/jobs')) json = { id: 'trend', status: done ? 'completed' : 'running', hasResult: true, resultRevision: String(revision) }
    if (path.endsWith('/result')) json = { ...fixture, width: revision === 1 ? 200 : 160, elapsedSeconds: revision === 1 ? 2 : 8, resultRevision: String(revision) }
    await r.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('./')
  await page.getByLabel('选择内置示例').selectOption('mini')
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await expect(page.getByRole('heading', { name: '利用率提升趋势' })).toBeVisible()
  await expect(page.getByText('累计提升').locator('..')).toContainText('0.0')
  const first = await page.getByRole('img', { name: /^利用率趋势/ }).getAttribute('aria-label')
  revision = 2
  await expect(page.getByRole('img', { name: /^利用率趋势/ })).not.toHaveAttribute('aria-label', first!)
  await page.getByText('查看采样记录（2）').click()
  await expect(page.getByRole('cell', { name: '2.0 秒', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '8.0 秒', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `.qa/trend-${test.info().project.name}.png`, fullPage: true })
  done = true
  await expect(page.getByRole('button', { name: '开始求解', exact: true })).toBeEnabled()
  await page.getByLabel('容器宽度', { exact: true }).fill('110')
  await expect(page.getByRole('heading', { name: '利用率提升趋势' })).toHaveCount(0)
})
