// ブラウザ操作の通しテスト: 単一ファイル版(play/index.html)を file:// で開き、最後まで遊ぶ
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
const dir = readdirSync(base).find((d) => d.startsWith('chromium'));
const exe = existsSync(`${base}/chromium`) ? `${base}/chromium` : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : { executablePath: `${base}/${dir}/chrome-linux/chrome` });
const url = 'file://' + resolve('play/index.html');
const shot = process.env.SHOT_DIR;
async function run(label, startSel, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await page.click(startSel);
  let steps = 0, shotDone = false;
  while (steps++ < 4000) {
    if (await page.locator('text=ゲーム終了').count()) break;
    if (await page.locator('[data-act=show]').count()) { await page.click('[data-act=show]'); continue; }
    if (await page.locator('[data-act=next]').count()) { await page.click('[data-act=next]'); continue; }
    const bid = page.locator('[data-bid]:not([disabled])');
    if (await bid.count()) { if (shot && !shotDone) { await page.screenshot({ path: `${shot}/${label}-bid.png` }); } await bid.nth(Math.min(2, (await bid.count()) - 1)).click(); continue; }
    const card = page.locator('[data-card]:not([disabled])');
    if (await card.count()) { if (shot && !shotDone && steps > 12) { await page.screenshot({ path: `${shot}/${label}-play.png` }); shotDone = true; } await card.first().click(); continue; }
    await page.waitForTimeout(100);
  }
  const done = await page.locator('text=ゲーム終了').count();
  if (shot) await page.screenshot({ path: `${shot}/${label}-end.png` });
  console.log(label, done ? 'OK 最後まで完了' : 'NG 未完了', 'errors:', errors.length ? errors : 'なし');
  await page.close();
  return done && !errors.length;
}
const ok = [
  await run('pc-ai', '[data-start="1:smart"]', { width: 1000, height: 800 }),
  await run('phone-ai', '[data-start="1:random"]', { width: 375, height: 700 }),
  await run('phone-hotseat', '[data-start="3:smart"]', { width: 375, height: 700 }),
];
await browser.close();
process.exit(ok.every(Boolean) ? 0 : 1);
