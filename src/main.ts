import './style.css'
import { Vault, WrongPasswordError, VaultExistsError, ImportValidationError, type Entry } from './vault'
import { generatePassword, DEFAULT_PASSWORD_OPTIONS } from './passwordGen'

const app = document.getElementById('app')!
const vault = new Vault()

const IDLE_LOCK_MS = 5 * 60 * 1000
const CLIPBOARD_CLEAR_MS = 20 * 1000
let idleTimer: ReturnType<typeof setTimeout> | null = null

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer)
  if (!vault.isUnlocked) return
  idleTimer = setTimeout(() => {
    vault.lock()
    render()
  }, IDLE_LOCK_MS)
}
const idleEvents = ['click', 'keydown', 'mousemove'] as const
for (const evt of idleEvents) {
  document.addEventListener(evt, resetIdleTimer, { passive: true })
}

function labelFor(text: string, forId: string): HTMLLabelElement {
  return el('label', { for: forId }, text)
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else node.setAttribute(k, v)
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}

async function render(): Promise<void> {
  app.replaceChildren()
  if (!vault.isUnlocked) {
    const exists = await Vault.exists()
    app.append(exists ? renderUnlockScreen() : renderSetupScreen())
    return
  }
  app.append(renderVaultScreen())
  resetIdleTimer()
}

function renderSetupScreen(): HTMLElement {
  const pw = el('input', { type: 'password', id: 'setup-pw', autocomplete: 'new-password' })
  const pw2 = el('input', { type: 'password', id: 'setup-pw2', autocomplete: 'new-password' })
  const error = el('p', { class: 'error' })
  const form = el(
    'form',
    { class: 'card' },
    el('h1', {}, 'Kinko Vault をはじめる'),
    el('p', {}, 'マスターパスワードを設定してください。これを忘れるとデータは復元できません。'),
    labelFor('マスターパスワード (8文字以上)', 'setup-pw'),
    pw,
    labelFor('確認', 'setup-pw2'),
    pw2,
    error,
    el('button', { type: 'submit' }, '保管庫を作成'),
  )
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    error.textContent = ''
    if (pw.value !== pw2.value) {
      error.textContent = 'パスワードが一致しません'
      return
    }
    try {
      await vault.create(pw.value)
      await render()
    } catch (err) {
      error.textContent = err instanceof VaultExistsError ? err.message : (err as Error).message
    }
  })
  return form
}

function renderUnlockScreen(): HTMLElement {
  const pw = el('input', { type: 'password', id: 'unlock-pw', autocomplete: 'current-password' })
  const error = el('p', { class: 'error' })
  const importInput = el('input', { type: 'file', id: 'import-file', accept: 'application/json' })
  const form = el(
    'form',
    { class: 'card' },
    el('h1', {}, 'Kinko Vault'),
    labelFor('マスターパスワード', 'unlock-pw'),
    pw,
    error,
    el('button', { type: 'submit' }, 'ロック解除'),
    el('hr', {}),
    el('p', {}, 'バックアップから復元する場合:'),
    importInput,
    el('button', { type: 'button', id: 'import-btn' }, 'インポート'),
  )
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    error.textContent = ''
    try {
      await vault.unlock(pw.value)
      await render()
    } catch (err) {
      error.textContent = err instanceof WrongPasswordError ? err.message : (err as Error).message
    }
  })
  form.querySelector('#import-btn')!.addEventListener('click', async () => {
    error.textContent = ''
    const file = importInput.files?.[0]
    if (!file) {
      error.textContent = 'ファイルを選択してください'
      return
    }
    if (!pw.value) {
      error.textContent = 'マスターパスワードを入力してください'
      return
    }
    try {
      const text = await file.text()
      await vault.importEncrypted(text, pw.value)
      await render()
    } catch (err) {
      error.textContent =
        err instanceof WrongPasswordError || err instanceof ImportValidationError
          ? err.message
          : `インポートに失敗しました: ${(err as Error).message}`
    }
  })
  return form
}

function renderVaultScreen(): HTMLElement {
  const entries = vault.listEntries()
  const search = el('input', { type: 'search', placeholder: '検索...', id: 'search' })
  const list = el('div', { class: 'entry-list' })
  const status = el('p', { class: 'status' })

  function renderList(filter = ''): void {
    list.replaceChildren()
    const q = filter.trim().toLowerCase()
    const filtered = entries.filter(
      (e) => !q || e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q),
    )
    if (filtered.length === 0) {
      list.append(el('p', { class: 'empty' }, 'エントリがありません'))
    }
    for (const entry of filtered) list.append(renderEntryRow(entry))
  }
  search.addEventListener('input', () => renderList(search.value))
  renderList()

  const addBtn = el('button', { type: 'button' }, '+ 新規エントリ')
  addBtn.addEventListener('click', () => {
    app.append(renderEntryForm(null, () => render()))
  })

  const lockBtn = el('button', { type: 'button', class: 'secondary' }, 'ロック')
  lockBtn.addEventListener('click', () => {
    vault.lock()
    render()
  })

  const exportBtn = el('button', { type: 'button', class: 'secondary' }, 'エクスポート')
  exportBtn.addEventListener('click', async () => {
    const json = await vault.exportEncrypted()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = el('a', { href: url, download: `kinko-vault-backup-${Date.now()}.json` })
    a.click()
    URL.revokeObjectURL(url)
    status.textContent = 'エクスポートしました（このファイルもマスターパスワードで保護されています）'
  })

  return el(
    'div',
    { class: 'vault' },
    el('div', { class: 'toolbar' }, search, addBtn, exportBtn, lockBtn),
    status,
    list,
  )
}

function renderEntryRow(entry: Entry): HTMLElement {
  const passSpan = el('span', { class: 'secret masked' }, '••••••••')
  let visible = false
  const toggleBtn = el('button', { type: 'button', class: 'icon-btn' }, '表示')
  toggleBtn.addEventListener('click', () => {
    visible = !visible
    passSpan.textContent = visible ? entry.password : '••••••••'
    passSpan.classList.toggle('masked', !visible)
  })
  const copyBtn = el('button', { type: 'button', class: 'icon-btn' }, 'コピー')
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(entry.password)
    copyBtn.textContent = 'コピー済'
    setTimeout(async () => {
      copyBtn.textContent = 'コピー'
      try {
        const current = await navigator.clipboard.readText()
        if (current === entry.password) await navigator.clipboard.writeText('')
      } catch {
        // clipboard read permission may be unavailable; best-effort clear only.
      }
    }, CLIPBOARD_CLEAR_MS)
  })
  const editBtn = el('button', { type: 'button', class: 'icon-btn' }, '編集')
  editBtn.addEventListener('click', () => app.append(renderEntryForm(entry, () => render())))
  const delBtn = el('button', { type: 'button', class: 'icon-btn danger' }, '削除')
  delBtn.addEventListener('click', async () => {
    if (confirm(`「${entry.title}」を削除しますか？`)) {
      await vault.deleteEntry(entry.id)
      await render()
    }
  })
  return el(
    'div',
    { class: 'entry-row' },
    el('div', { class: 'entry-main' }, el('strong', {}, entry.title), el('span', {}, entry.username)),
    el('div', { class: 'entry-actions' }, passSpan, toggleBtn, copyBtn, editBtn, delBtn),
  )
}

function renderEntryForm(entry: Entry | null, onDone: () => void): HTMLElement {
  const title = el('input', { type: 'text', id: 'entry-title', required: 'true', value: entry?.title ?? '' })
  const username = el('input', { type: 'text', id: 'entry-username', value: entry?.username ?? '' })
  const password = el('input', { type: 'text', id: 'entry-password', value: entry?.password ?? '' })
  const url = el('input', { type: 'text', id: 'entry-url', value: entry?.url ?? '' })
  const notes = el('textarea', { id: 'entry-notes' }, entry?.notes ?? '')
  const genBtn = el('button', { type: 'button' }, '自動生成')
  genBtn.addEventListener('click', () => {
    password.value = generatePassword(DEFAULT_PASSWORD_OPTIONS)
  })
  const cancelBtn = el('button', { type: 'button', class: 'secondary' }, 'キャンセル')
  const overlay = el('div', { class: 'overlay' })
  cancelBtn.addEventListener('click', () => overlay.remove())

  const form = el(
    'form',
    { class: 'card' },
    el('h2', {}, entry ? 'エントリを編集' : '新規エントリ'),
    labelFor('タイトル', 'entry-title'),
    title,
    labelFor('ユーザー名', 'entry-username'),
    username,
    labelFor('パスワード', 'entry-password'),
    el('div', { class: 'row' }, password, genBtn),
    labelFor('URL', 'entry-url'),
    url,
    labelFor('メモ', 'entry-notes'),
    notes,
    el('div', { class: 'row' }, el('button', { type: 'submit' }, '保存'), cancelBtn),
  )
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await vault.upsertEntry({
      id: entry?.id ?? crypto.randomUUID(),
      title: title.value,
      username: username.value,
      password: password.value,
      url: url.value,
      notes: notes.value,
    })
    overlay.remove()
    onDone()
  })
  overlay.append(form)
  return overlay
}

render()
