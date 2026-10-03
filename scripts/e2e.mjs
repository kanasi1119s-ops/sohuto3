// ブラウザでの通しテスト（Playwright）: node scripts/e2e.mjs <URL> <スクリーンショット出力先>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
const url = process.argv[2]
const out = process.argv[3] ?? '.'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch())
const errors = []
async function playGame(viewport, tag, mode) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag}: ${m.text()}`))
  await page.goto(url)
  await page.screenshot({ path: `${out}/${tag}-home.png` })
  await page.click('text=遊び方（ルール）を読む')
  await page.waitForSelector('.md h1')
  await page.screenshot({ path: `${out}/${tag}-rules.png` })
  await page.click('.dialog.rules >> text=とじる')
  if (mode === 'hot') await page.click('text=ふたりで対戦')
  if (mode === 'cpu2') { await page.click('text=後手で遊ぶ'); await page.click('text=CPU: やさしい') }
  await page.click('text=はじめる')
  let shot = false
  if (mode === 'hot') {
    // 取り消し: 1手置く → ひとつ戻す → ログが元に戻る
    const before = await page.locator('.log div').count()
    await page.locator('.space.can').first().click()
    const ch = page.locator('.dialog .choices button')
    if (await ch.count()) await ch.first().click()
    if ((await page.locator('.log div').count()) !== before + 1) throw new Error('手が反映されていない')
    await page.click('text=ひとつ戻す')
    if ((await page.locator('.log div').count()) !== before) throw new Error('取り消せていない')
  }
  for (let i = 0; i < 400; i++) {
    if (await page.locator('.turnbar.over').count()) break
    const can = page.locator('.space.can')
    const pass = page.locator('button.pass')
    if (await pass.count()) { await pass.click(); continue }
    if (await can.count()) {
      // 納品所を優先、次に注文所、それ以外は先頭
      const pri = ['納品所', '注文所']
      let target = can.first()
      for (const p of pri) { const l = can.filter({ hasText: p }); if (await l.count()) { target = l.first(); break } }
      await target.click()
      const ch = page.locator('.dialog .choices button')
      if (await ch.count()) { await ch.first().click() }
      if (!shot && i > 8) { await page.screenshot({ path: `${out}/${tag}-game.png`, fullPage: true }); shot = true }
    } else await page.waitForTimeout(100)
  }
  await page.waitForSelector('.turnbar.over', { timeout: 20000 })
  await page.screenshot({ path: `${out}/${tag}-result.png` })
  console.log(tag, 'OK:', await page.locator('.turnbar').innerText())
  await page.close()
}
await playGame({ width: 1100, height: 900 }, 'pc-cpu', 'cpu')
await playGame({ width: 390, height: 844 }, 'sp-cpu', 'cpu')
await playGame({ width: 390, height: 844 }, 'sp-hot', 'hot')
await playGame({ width: 820, height: 1180 }, 'ipad-cpu2', 'cpu2')
await browser.close()
if (errors.length) { console.log('ERRORS', errors); process.exit(1) }
console.log('コンソールエラーなし')
