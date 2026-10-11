import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });

async function fill(page: import('@playwright/test').Page, vendor: string, amount: string) {
  const li = page.locator('li').last();
  await li.locator('[data-key=vendor]').fill(vendor);
  await li.locator('[data-key=amount]').fill(amount);
  await li.locator('[data-key=date]').fill('2026-10-11');
  await li.locator('[data-key=regNo]').fill('T1234567890123');
}

test('main flow: add, name, persist across reload, export, import round trip', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
  await page.goto('/');
  await page.setInputFiles('#file', pdf('scan1.pdf'));
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('#export')).toBeDisabled();
  await fill(page, '株式会社テスト', '１１，０００');
  await expect(page.locator('.name').last()).toHaveText('20261011_株式会社テスト_11000_領収書.pdf');
  await expect(page.locator('#export')).toBeEnabled();

  // reload: data restored from IndexedDB
  await page.reload();
  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.name')).toHaveText('20261011_株式会社テスト_11000_領収書.pdf');

  // duplicate naming
  await page.setInputFiles('#file', pdf('scan2.pdf'));
  await fill(page, '株式会社テスト', '11000');
  await expect(page.locator('.name').last()).toHaveText('20261011_株式会社テスト_11000_領収書_2.pdf');

  // offline: still works
  await context.setOffline(true);
  await page.setInputFiles('#file', pdf('scan3.pdf'));
  await expect(page.locator('li')).toHaveCount(3);
  await context.setOffline(false);

  // export
  await page.locator('li').last().locator('button.danger').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  const path = await dl.path();
  const buf = readFileSync(path);
  expect(buf.subarray(0, 2).toString()).toBe('PK');
  expect(buf.includes(Buffer.from('index.csv'))).toBe(true);

  // clear then import round trip
  page.once('dialog', (d) => d.accept());
  await page.click('#clear');
  await expect(page.locator('li')).toHaveCount(0);
  await page.setInputFiles('#import', path);
  await expect(page.locator('li')).toHaveCount(2);
  await expect(page.locator('.name').first()).toHaveText('20261011_株式会社テスト_11000_領収書.pdf');

  // no external network requests at all
  expect(requests.filter((u) => !u.startsWith('http://localhost:4173'))).toEqual([]);
});

test('rejects invalid zip and does not crash', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#import', { name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip at all') });
  await expect(page.locator('#msg')).toContainText('失敗');
});

test('hostile file name is rendered as text, not HTML', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', pdf('<img src=x onerror=window.__x=1>.pdf'));
  await expect(page.locator('li .orig')).toContainText('<img src=x');
  expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();
});

test('mobile width has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await page.goto('/');
  await page.setInputFiles('#file', pdf('a.pdf'));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
