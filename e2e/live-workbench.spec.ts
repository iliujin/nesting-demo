import { test, expect } from '@playwright/test'
import { sampleLayout } from '../src/lib/samples'

const endpoint = 'https://solver.example.test'
const fixture = { ...sampleLayout('mini', 'strip'), kind: 'solver_result', validated: true, optimalityProven: false }

test('live protocol fixture: submission, completed result, download and stale result clearing', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null, polls = 0, uploads = 0
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { status: 'ready' }
    if (path.endsWith('/sessions')) json = { token: 'test-session-token-for-protocol-fixture', expiresAt: Date.now() / 1000 + 86400 }
    if (path.endsWith('/instances')) { uploads++; json = { id: 'instance-fixture' }; expect(route.request().postDataJSON().text).toContain('name: mini') }
    if (path.endsWith('/jobs')) { submitted = route.request().postDataJSON(); json = { id: 'job-fixture', status: 'queued', hasResult: false } }
    if (path.endsWith('/jobs/job-fixture')) json = { id: 'job-fixture', status: ++polls > 1 ? 'completed' : 'running', hasResult: polls > 1 }
    if (path.endsWith('/result')) json = fixture
    await route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('./')
  await page.getByLabel('选择内置示例').selectOption('mini')
  expect(uploads).toBe(0)
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible()
  expect(submitted).toMatchObject({ mode: 'strip', width: 100, timeLimitSeconds: 60 })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果 JSON' }).click()
  expect((await downloadPromise).suggestedFilename()).toContain('nesting-result')
  await page.getByLabel('容器宽度', { exact: true }).fill('110')
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toHaveCount(0)
})

test('live protocol fixture: cancellation does not display a synthetic result', async ({ page }) => {
  let cancelled = false
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = { status: 'ready' }
    if (path.endsWith('/sessions')) json = { token: 'test-session-token-for-protocol-fixture', expiresAt: Date.now() / 1000 + 86400 }
    if (path.endsWith('/instances')) json = { id: 'instance-fixture' }
    if (path.endsWith('/cancel')) cancelled = true
    if (path.includes('/jobs')) json = { id: 'job-fixture', status: cancelled ? 'cancelled' : 'queued', hasResult: false }
    return route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('./')
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await page.getByRole('button', { name: '取消任务', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已取消')
  await expect(page.getByRole('button', { name: '下载结果 JSON' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '开始求解', exact: true })).toBeEnabled()
})

test('live protocol fixture: service failure stays explicit', async ({ page }) => {
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: endpoint } }))
  await page.route(endpoint + '/api/v1/**', route => route.fulfill({ status: 503, json: { detail: '求解服务暂未就绪。' }, headers: { 'Access-Control-Allow-Origin': '*' } }))
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('求解服务暂未就绪')
  await expect(page.getByRole('button', { name: '开始求解', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '查看示例结果' })).toHaveCount(0)
})

test('real private solver: fresh upload solves both modes through configured endpoint', async ({ page }) => {
  const realEndpoint = process.env.REAL_API_URL
  test.skip(!realEndpoint, 'Set REAL_API_URL for actual deployed solver verification')
  test.setTimeout(180000)
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'live', apiBaseUrl: realEndpoint } }))
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto('./')
  await page.getByRole('button', { name: '上传实例', exact: true }).click()
  await page.getByLabel('上传 TXT 实例').setInputFiles({ name: 'fresh-browser-upload.txt', mimeType: 'text/plain',
    buffer: Buffer.from('name: browser-fresh\nsize: 2\nobject: width: 40\nno. quantity\n1 2 x 0 12 12 5 5 0\ny 0 0 5 5 10 10\n2 1 x 0 9 0\ny 0 0 7\n') })
  await expect(page.getByText('browser-fresh · 3 件')).toBeVisible()
  await page.getByLabel('容器宽度', { exact: true }).fill('40')
  await page.getByLabel('运行时间上限').selectOption('30')
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible({ timeout: 140000 })
  await expect(page.getByText('真实计算 · 已校验')).toBeVisible()
  await page.screenshot({ path: `docs/screenshots/live-${test.info().project.name}.png`, fullPage: true })
  const jsonResponse = page.waitForResponse(response => response.url().endsWith('/result') && response.request().method() === 'GET')
  await page.getByRole('button', { name: '固定容器', exact: true }).click()
  await page.getByRole('button', { name: '开始求解', exact: true }).click()
  const actual = await (await jsonResponse).json()
  expect(actual.kind).toBe('solver_result')
  expect(actual.area).toBe(201.5)
  expect(actual.placements).toHaveLength(3)
  expect(actual.mode).toBe('bin')
  await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible()
  expect(pageErrors).toEqual([])
})
