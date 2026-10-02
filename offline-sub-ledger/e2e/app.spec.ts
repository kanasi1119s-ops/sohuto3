import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

async function add(page: Page, name: string, amount: string, date = '2099-01-15') {
  await page.fill('input[name=name]', name);
  await page.fill('input[name=amount]', amount);
  await page.fill('input[name=nextBilling]', date);
  await page.click('#submit');
}

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload(); });

test('add, totals, persist across reload', async ({ page }) => {
  await add(page, 'Netflix', '1490');
  await add(page, '<img src=x onerror=alert(1)>', '600');
  await expect(page.locator('#t-monthly')).toHaveText('¥2,090');
  await expect(page.locator('#t-count')).toHaveText('2');
  await expect(page.locator('#list img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#list li.item')).toHaveCount(2);
  await expect(page.locator('#t-yearly')).toHaveText('¥25,080');
});

test('validation error and edit/pause/delete', async ({ page }) => {
  await page.click('#submit');
  await expect(page.locator('#msg')).toContainText('名前は必須');
  await add(page, 'A', '1000');
  await page.locator('#list button[data-action=編集]').click();
  await page.fill('input[name=amount]', '2000');
  await page.click('#submit');
  await expect(page.locator('#t-monthly')).toHaveText('¥2,000');
  await page.locator('#list button[data-action=停止]').click();
  await expect(page.locator('#t-count')).toHaveText('0');
  page.once('dialog', (d) => d.accept());
  await page.locator('#list button[data-action=削除]').click();
  await expect(page.locator('#list li.item')).toHaveCount(0);
});

test('export -> clear -> import roundtrip', async ({ page }) => {
  await add(page, 'Spotify', '980');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-json')]);
  const path = await dl.path();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#list li.item')).toHaveCount(0);
  page.once('dialog', (d) => d.accept());
  await page.setInputFiles('#import', path!);
  await expect(page.locator('#list li.item')).toHaveCount(1);
  await expect(page.locator('#t-monthly')).toHaveText('¥980');
});

test('invalid import is rejected and data kept', async ({ page }) => {
  await add(page, 'Keep', '100');
  fs.writeFileSync('test-results-bad.json', '{"format":"x"}');
  await page.setInputFiles('#import', 'test-results-bad.json');
  await expect(page.locator('#msg')).toContainText('バックアップ形式');
  await expect(page.locator('#list li.item')).toHaveCount(1);
  fs.unlinkSync('test-results-bad.json');
});

test('works offline after first load', async ({ page, context }) => {
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await add(page, 'Offline', '500');
  await expect(page.locator('#t-monthly')).toHaveText('¥500');
});

test('mobile width has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await add(page, 'A very long subscription name that should wrap nicely on small screens', '1');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
