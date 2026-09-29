import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('作成→保存→リロード復元→オフライン動作→エクスポート/インポート往復', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.locator('#settings-box summary').click();
  await page.fill('#s-name', 'テスト商店');
  await page.fill('#s-reg', 'T1234567890123');
  await page.fill('#e-client', '株式会社サンプル');
  await page.locator('.l-name').first().fill('制作費');
  await page.locator('.l-price').first().fill('10000');
  await expect(page.locator('#preview')).toContainText('¥11,000');
  await page.click('#add-line');
  await page.locator('.l-name').nth(1).fill('お菓子');
  await page.locator('.l-price').nth(1).fill('1000');
  await page.locator('.l-rate').nth(1).selectOption('8');
  await expect(page.locator('#preview')).toContainText('¥12,080');
  await page.click('#save-inv');
  await expect(page.locator('#msg')).toHaveText('保存しました');

  // 再起動後の復元（オフライン状態で）
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#list li')).toHaveCount(1);
  await expect(page.locator('#list li')).toContainText('¥12,080');
  await expect(page.locator('#s-name')).toHaveValue('テスト商店');
  await context.setOffline(false);

  // エクスポート → 全削除 → インポート
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-json')]);
  const path = await dl.path();
  const text = readFileSync(path, 'utf8');
  page.on('dialog', (d) => d.accept());
  await page.locator('#list .del').click();
  await expect(page.locator('#list li')).toHaveCount(0);
  await page.setInputFiles('#import-json', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#list li')).toHaveCount(1);
  await expect(page.locator('#list li')).toContainText('株式会社サンプル');
});

test('不正なJSONの読み込みはエラー表示でデータを壊さない', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', (d) => d.accept());
  await page.setInputFiles('#import-json', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"version":9}') });
  await expect(page.locator('#msg')).toContainText('失敗');
});

test('不正な明細は保存できない', async ({ page }) => {
  await page.goto('/');
  await page.locator('.l-price').first().fill('-5');
  await expect(page.locator('#line-err')).toContainText('単価');
  await page.click('#save-inv');
  await expect(page.locator('#list li')).toHaveCount(0);
});

test('二重保存しても1件のまま／巨大金額は拒否', async ({ page }) => {
  await page.goto('/');
  await page.locator('.l-price').first().fill('100');
  await page.click('#save-inv');
  await page.click('#save-inv');
  await expect(page.locator('#list li')).toHaveCount(1);
  await page.locator('.l-price').first().fill('99999999999999');
  await expect(page.locator('#line-err')).toContainText('上限');
});

test('新規作成の請求書番号は削除後も重複しない', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', (d) => d.accept());
  await page.click('#save-inv');
  await page.click('#new-inv');
  await page.click('#save-inv');
  await page.locator('#list .del').first().click();
  await page.click('#new-inv');
  await page.click('#save-inv');
  const texts = await page.locator('#list li span').allInnerTexts();
  const nums = texts.map((t) => t.split(' / ')[0]);
  expect(new Set(nums).size).toBe(nums.length);
});

test('スマホ幅で横スクロールが発生しない', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.click('#add-line');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
