import { test, expect } from '@playwright/test'

// Full offline user journey: create vault -> add entry -> reload -> unlock -> entry
// survives -> export -> wrong password on unlock is rejected.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('kinko-vault'))
  await page.reload()
})

test('setup, add an entry, reload, and unlock to see it again', async ({ page }) => {
  await page.getByLabel('マスターパスワード (8文字以上)').fill('my-master-password-1')
  await page.getByLabel('確認').fill('my-master-password-1')
  await page.getByRole('button', { name: '保管庫を作成' }).click()

  await page.getByRole('button', { name: '+ 新規エントリ' }).click()
  await page.getByLabel('タイトル').fill('Example Site')
  await page.getByLabel('ユーザー名').fill('alice')
  await page.getByLabel('パスワード').fill('s3cr3t!')
  await page.getByRole('button', { name: '保存' }).click()

  await expect(page.getByText('Example Site')).toBeVisible()

  // Lock and reload to simulate closing/reopening the browser.
  await page.getByRole('button', { name: 'ロック' }).click()
  await page.reload()

  await page.getByLabel('マスターパスワード').fill('wrong-password')
  await page.getByRole('button', { name: 'ロック解除' }).click()
  await expect(page.getByText('マスターパスワードが違います')).toBeVisible()

  await page.getByLabel('マスターパスワード').fill('my-master-password-1')
  await page.getByRole('button', { name: 'ロック解除' }).click()
  await expect(page.getByText('Example Site')).toBeVisible()
})

test('page never issues network requests to a remote origin', async ({ page }) => {
  const remoteRequests: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      remoteRequests.push(req.url())
    }
  })

  await page.getByLabel('マスターパスワード (8文字以上)').fill('offline-check-pw-1')
  await page.getByLabel('確認').fill('offline-check-pw-1')
  await page.getByRole('button', { name: '保管庫を作成' }).click()
  await page.getByRole('button', { name: '+ 新規エントリ' }).click()
  await page.getByLabel('タイトル').fill('Offline Test')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('Offline Test')).toBeVisible()

  expect(remoteRequests).toEqual([])
})

test('renders untrusted entry text as plain text, not HTML (XSS check)', async ({ page }) => {
  await page.getByLabel('マスターパスワード (8文字以上)').fill('xss-check-pw-1')
  await page.getByLabel('確認').fill('xss-check-pw-1')
  await page.getByRole('button', { name: '保管庫を作成' }).click()

  await page.getByRole('button', { name: '+ 新規エントリ' }).click()
  await page.getByLabel('タイトル').fill('<img src=x onerror="window.__xss=true">')
  await page.getByRole('button', { name: '保存' }).click()

  await expect(page.getByText('<img src=x onerror="window.__xss=true">')).toBeVisible()
  const triggered = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)
  expect(triggered).toBeUndefined()
})
