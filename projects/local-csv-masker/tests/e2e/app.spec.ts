import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CSV = 'name,email,tel\n山田,taro@example.com,03-1234-5678\n佐藤,,メモ\n';

test('pastes CSV, masks, reports, and downloads', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url());
  });
  await page.goto('/');
  await page.fill('#input', CSV);
  await expect(page.locator('#report')).toContainText('メールアドレス 1件');
  await expect(page.locator('#report')).toContainText('電話番号 1件');
  await expect(page.locator('#preview')).toContainText('[EMAIL]');
  await expect(page.locator('#preview')).not.toContainText('taro@example.com');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  const body = readFileSync((await dl.path()) as string, 'utf-8');
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body).toContain('山田,[EMAIL],[PHONE]');
  expect(external).toEqual([]);
  expect(consoleErrors).toEqual([]); // CSP違反などが無いこと
});

test('column rule drop and mask', async ({ page }) => {
  await page.goto('/');
  await page.fill('#input', CSV);
  await page.selectOption('.col-rule[data-col="0"]', 'mask');
  await page.selectOption('.col-rule[data-col="2"]', 'drop');
  await expect(page.locator('#preview')).toContainText('[MASKED]');
  await expect(page.locator('#preview th')).toHaveCount(2);
});

test('reads Shift_JIS file', async ({ page }) => {
  await page.goto('/');
  // "名前,メール\n山田,a@x.com\n" in Shift_JIS
  const sjis = Buffer.from([0x96, 0xbc, 0x91, 0x4f, 0x2c, 0x83, 0x81, 0x81, 0x5b, 0x83, 0x8b, 0x0a, 0x8e, 0x52, 0x93, 0x63, 0x2c, 0x61, 0x40, 0x78, 0x2e, 0x63, 0x6f, 0x6d, 0x0a]);
  await page.setInputFiles('#file', { name: 'sjis.csv', mimeType: 'text/csv', buffer: sjis });
  await expect(page.locator('#meta')).toContainText('Shift_JIS');
  await expect(page.locator('#preview')).toContainText('山田');
  await expect(page.locator('#preview')).toContainText('[EMAIL]');
});

test('empty input and invalid profile show no crash', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#download')).toBeDisabled();
  await page.setInputFiles('#import-profile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{oops') });
  await expect(page.locator('#error')).toContainText('設定を読み込めません');
});

test('profile export -> import round trip and persistence across reload', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#mode', 'pseudonym');
  await page.fill('#words', 'Acme');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-profile')]);
  const json = readFileSync((await dl.path()) as string, 'utf-8');
  expect(JSON.parse(json).mode).toBe('pseudonym');

  await page.reload();
  await expect(page.locator('#mode')).toHaveValue('pseudonym'); // localStorage で復元
  await page.selectOption('#mode', 'redact');
  await page.setInputFiles('#import-profile', { name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#mode')).toHaveValue('pseudonym');
  await expect(page.locator('#words')).toHaveValue('Acme');
});

test('works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.fill('#input', 'call 090-1111-2222');
  await page.uncheck('#mode-csv');
  await expect(page.locator('#preview')).toContainText('call [PHONE]');
});

test('mobile width has no horizontal page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await page.fill('#input', CSV);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('works when dist/index.html is opened via file:// (ZIP distribution)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.fill('#input', 'a,b\nx@y.com,1');
  await expect(page.locator('#preview')).toContainText('[EMAIL]');
  expect(errors).toEqual([]);
});
