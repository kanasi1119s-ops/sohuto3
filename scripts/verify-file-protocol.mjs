// Regression check: dist/index.html must work when opened directly via
// file:// (double-click), not just from a dev/preview HTTP server. ES module
// scripts and crossorigin-tagged assets are blocked by CORS under file://
// origins, so this exercises the real user journey end-to-end.
import { chromium } from '@playwright/test'
import path from 'node:path'
import { existsSync } from 'node:fs'

const distIndex = path.resolve('dist/index.html')
if (!existsSync(distIndex)) {
  console.error('dist/index.html not found - run `npm run build` first.')
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(err.message))
page.on('requestfailed', (req) => errors.push(`request failed: ${req.url()}`))

await page.goto('file://' + distIndex)
await page.waitForSelector('text=Kinko Vault をはじめる', { timeout: 5000 })

await page.getByLabel('マスターパスワード (8文字以上)').fill('file-protocol-check-1')
await page.getByLabel('確認').fill('file-protocol-check-1')
await page.getByRole('button', { name: '保管庫を作成' }).click()
await page.getByRole('button', { name: '+ 新規エントリ' }).click()
await page.getByLabel('タイトル').fill('file:// smoke test')
await page.getByRole('button', { name: '保存' }).click()
await page.waitForSelector('text=file:// smoke test', { timeout: 5000 })

await browser.close()

if (errors.length > 0) {
  console.error('FAIL: console/page errors while running via file://')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log('OK: dist/index.html works when opened via file:// (double-click), including the full setup -> add entry flow.')
