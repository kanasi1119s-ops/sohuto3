import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pdf = (name: string, body = '%PDF-1.4 test') => ({ name, mimeType: 'application/pdf', buffer: Buffer.from(body) });

test('ファイル追加→推測→命名→ZIP/台帳出力', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', [pdf('請求書_株式会社サンプル_2026-10-15_12,345円.pdf'), pdf('scan001.pdf')]);
  await expect(page.locator('#rows tr')).toHaveCount(2);
  await expect(page.locator('#rows tr').first().locator('td.name')).toHaveText('20261015_株式会社サンプル_12345円.pdf');
  await expect(page.locator('#zip')).toBeDisabled(); // 2行目は未入力

  const r2 = page.locator('#rows tr').nth(1);
  await r2.locator('input[data-field=date]').fill('令和8年10月20日');
  await r2.locator('input[data-field=vendor]').fill('(株)テスト');
  await r2.locator('input[data-field=amount]').fill('¥3,000');
  await expect(r2.locator('td.name')).toHaveText('20261020_(株)テスト_3000円.pdf');
  await expect(page.locator('#zip')).toBeEnabled();

  await page.locator('#bulkKind').fill('領収書');
  await page.click('#applyKind');
  await expect(r2.locator('td.name')).toHaveText('20261020_(株)テスト_3000円_領収書.pdf');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#zip')]);
  expect(dl.suggestedFilename()).toBe('denchou-data.zip');
  const buf = readFileSync(await dl.path());
  const text = buf.toString('utf8');
  expect(buf.readUInt32LE(0)).toBe(0x04034b50);
  expect(text).toContain('20261015_株式会社サンプル_12345円_領収書.pdf');
  expect(text).toContain('索引台帳.csv');
});

test('取引先辞書で表記ゆれを統一し、再読込後も保持される', async ({ page }) => {
  await page.goto('/');
  await page.locator('summary').click();
  await page.fill('#alias', '(株)サンプル');
  await page.fill('#canon', '株式会社サンプル');
  await page.click('#addDict');
  await page.setInputFiles('#file', [pdf('x.pdf')]);
  const row = page.locator('#rows tr').first();
  await row.locator('input[data-field=date]').fill('2026-01-02');
  await row.locator('input[data-field=vendor]').fill('（株）サンプル');
  await row.locator('input[data-field=amount]').fill('500');
  await expect(row.locator('td.name')).toHaveText('20260102_株式会社サンプル_500円.pdf');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.locator('#dictList li')).toHaveCount(1);
});

test('台帳CSVはBOM付きでインジェクション対策される', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', [pdf('a.pdf')]);
  const row = page.locator('#rows tr').first();
  await row.locator('input[data-field=date]').fill('2026-03-04');
  await row.locator('input[data-field=vendor]').fill('=cmd|x');
  await row.locator('input[data-field=amount]').fill('1');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  const buf = readFileSync(await dl.path());
  expect(buf.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  expect(buf.toString('utf8')).toContain("'=cmdx");
});

test('オフラインでも再読込して動作する', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // SW制御下で一度読み込み、キャッシュを温める
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await page.setInputFiles('#file', [pdf('b.pdf')]);
  await expect(page.locator('#rows tr')).toHaveCount(1);
});

test('スマホ幅で横スクロールが発生しない(ページ全体)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await page.setInputFiles('#file', [pdf('a.pdf')]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('外部への通信が発生しない', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) external.push(r.url()); });
  await page.goto('/');
  await page.setInputFiles('#file', [pdf('a.pdf')]);
  expect(external).toEqual([]);
});

test('IME変換中に入力欄が再生成されない(日本語入力の保護)', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', [pdf('a.pdf')]);
  const input = page.locator('#rows tr').first().locator('input[data-field=vendor]');
  await input.focus();
  await input.evaluate((el) => ((el as HTMLInputElement & { __m?: number }).__m = 1));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', { text: 'かぶ', selectionStart: 2, selectionEnd: 2 });
  await cdp.send('Input.imeSetComposition', { text: '株', selectionStart: 1, selectionEnd: 1 });
  expect(await input.evaluate((el) => (el as HTMLInputElement & { __m?: number }).__m)).toBe(1);
  await expect(input).toBeFocused();
});
