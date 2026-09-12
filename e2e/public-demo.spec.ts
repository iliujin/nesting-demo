import { expect, test } from '@playwright/test'

test('public demo replays both modes without contacting a solver', async ({ page }) => {
  const apiRequests: string[] = [], errors: string[] = []
  page.on('request', r => { if (r.url().includes('/api/v1/')) apiRequests.push(r.url()) })
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/config.json', r => r.fulfill({ json: { mode: 'preview', apiBaseUrl: '' } }))
  await page.goto('./')
  for (const mode of ['strip', 'bin']) {
    if (mode === 'bin') await page.getByRole('button', { name: '固定容器', exact: true }).click()
    await page.getByRole('button', { name: '播放优化演示', exact: true }).click()
    await expect(page.getByRole('heading', { name: '利用率提升演示' })).toBeVisible()
    await expect(page.getByText('演示播放中', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('演示播放完成', { timeout: 10000 })
    await expect(page.getByText('累计提升').locator('..')).not.toContainText('+0.0')
    await expect(page.getByText('人工合成步骤 · 时间为示意，不代表求解性能')).toBeVisible()
  }
  await page.screenshot({ path: `.qa/public-demo-${test.info().project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(apiRequests).toEqual([])
  expect(errors).toEqual([])
})
