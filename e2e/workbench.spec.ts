import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.route('**/config.json', route => route.fulfill({ json: { mode: 'preview', apiBaseUrl: '' } }))
})

test('honest default, labels, selection, zoom and fit', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '让每一块材料，物尽其用。' })).toBeVisible()
  await expect(page.getByText('示例预览：当前展示预计算结果，真实求解需连接后端服务。')).toBeVisible()
  await expect(page.locator('.layout-svg polygon')).toHaveCount(12)
  await page.screenshot({ path: `.qa/${testInfo.project.name}.png`, fullPage: true })
  await page.getByLabel('零件编号', { exact: true }).uncheck()
  await expect(page.locator('.piece-labels')).toHaveCount(0)
  await page.getByRole('button', { name: '选择零件 1', exact: true }).click()
  await expect(page.getByText(/零件 1 · 面积/)).toBeVisible()
  await page.getByRole('button', { name: '放大画布' }).click()
  await expect(page.getByRole('group', { name: '画布缩放' }).getByText('125%', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '适应画布' }).click()
  await expect(page.getByRole('group', { name: '画布缩放' }).getByText('100%', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('mode and sample changes clear stale results; bins can be selected', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '固定容器', exact: true }).click()
  await expect(page.getByText('未求解', { exact: true })).toBeVisible()
  await expect(page.locator('.layout-svg')).toHaveCount(0)
  await page.getByRole('button', { name: '查看示例结果' }).click()
  await expect(page.locator('.layout-svg polygon')).toHaveCount(6)
  await page.getByLabel('查看容器', { exact: true }).selectOption('1')
  await expect(page.getByRole('button', { name: '选择零件 7', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '选择零件 1', exact: true })).toHaveCount(0)
  await page.getByLabel('选择内置示例').selectOption('mini')
  await expect(page.locator('.layout-svg')).toHaveCount(0)
  await page.getByRole('button', { name: '查看示例结果' }).click()
  await expect(page.getByLabel('查看容器', { exact: true })).toHaveValue('0')
})

test('upload stays local and never produces a fake solved result', async ({ page }) => {
  const writes: string[] = []
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()) })
  await page.goto('./')
  await page.getByRole('button', { name: '上传实例', exact: true }).click()
  await page.getByLabel('上传 TXT 实例').setInputFiles({ name: 'pieces.txt', mimeType: 'text/plain', buffer: Buffer.from('name: My parts\nsize: 1\nno. quantity\n1 2 x -5 5 5 -5\ny 0 0 20 20\n') })
  await expect(page.getByRole('status')).toContainText('已在本地解析 2 件零件')
  await expect(page.locator('.parts-grid figure')).toHaveCount(2)
  await expect(page.getByText('未求解', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '真实求解尚未接入' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下载 SVG' })).toHaveCount(0)
  await page.getByLabel('上传 TXT 实例').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('size: 1\nno\n1 x 0 3 0\ny 0 NaN 4') })
  await expect(page.getByRole('alert')).toContainText('坐标')
  await expect(page.locator('.parts-grid figure')).toHaveCount(0)
  expect(writes).toEqual([])
})

test('SVG and JSON downloads contain actual geometry and disclosure', async ({ page }) => {
  await page.goto('./')
  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 SVG' }).click()
  const svg = await svgDownload
  expect(svg.suggestedFilename()).toBe('nesting-example-strip-container-1.svg')
  const content = await readFile((await svg.path())!, 'utf-8')
  expect(content.match(/<polygon /g)).toHaveLength(12)
  expect(content).toContain('预计算示例')
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果 JSON' }).click()
  const json = JSON.parse(await readFile((await (await jsonDownload).path())!, 'utf-8'))
  expect(json.kind).toBe('illustrative_precomputed')
  expect(json.placements).toHaveLength(12)
})

test('help opens and closes with keyboard and focus returns', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '使用说明', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: '使用说明', exact: true })).toBeFocused()
})
