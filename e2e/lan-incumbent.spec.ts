import { expect, test } from '@playwright/test'

test('real LAN solvers publish an incumbent before finishing', async ({ page }) => {
  test.skip(!process.env.LAN_DEMO_URL, 'Requires private LAN deployment')
  test.setTimeout(150000)
  await page.goto(process.env.LAN_DEMO_URL!)
  for (const mode of ['strip', 'bin']) {
    if (mode === 'bin') await page.getByRole('button', { name: '固定容器', exact: true }).click()
    await page.getByLabel('运行时间上限').selectOption('60')
    const received = page.waitForResponse(r => r.url().endsWith('/result') && r.request().method() === 'GET', { timeout: 65000 })
    await page.getByRole('button', { name: '开始求解', exact: true }).click()
    const result = await (await received).json()
    expect(result).toMatchObject({ mode, status: 'running', validated: true, clearance: 0 })
    expect(result.elapsedSeconds).toBeLessThan(60)
    expect(result.placements).toHaveLength(12)
    expect(result.resultRevision).toBeTruthy()
    await expect(page.getByRole('heading', { name: '当前最优排样', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeEnabled()
    console.log(`${mode}: first visible validated incumbent at ${result.elapsedSeconds}s, width=${result.width}, bins=${result.containers}`)
    await page.screenshot({ path: `.qa/incumbent-${mode}-${test.info().project.name}.png`, fullPage: true })
    await page.getByRole('button', { name: '取消任务', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('已取消', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: '排样结果', exact: true })).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载结果 JSON' }).click()
    expect((await download).suggestedFilename()).toContain('nesting-result')
  }
})
