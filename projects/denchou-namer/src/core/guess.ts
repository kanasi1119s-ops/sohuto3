import { normalizeDate, toHalfWidth } from './date';
import { normalizeAmount } from './amount';

export interface Guess { date: string; vendor: string; amount: string; }

/** 元ファイル名から日付・金額・取引先を推測する(あくまで入力の下書き。確定は人間)。 */
export function guessFromFilename(filename: string): Guess {
  const dot = filename.lastIndexOf('.');
  let base = toHalfWidth(dot > 0 ? filename.slice(0, dot) : filename);
  let date = '';
  let amount = '';

  const dm =
    base.match(/(?:令和|平成|R|H)\d{1,2}[年./-]\d{1,2}[月./-]\d{1,2}日?/) ||
    base.match(/\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?/) ||
    base.match(/(?<!\d)\d{8}(?!\d)/);
  if (dm) {
    const n = normalizeDate(dm[0]);
    if (n) { date = n; base = base.replace(dm[0], ' '); }
  }
  // 金額は ¥ / 円 / 3桁カンマのいずれかの目印がある場合のみ採用(連番との誤認防止)
  const am = base.match(/[¥￥]\s*(\d[\d,]*)|(\d{1,3}(?:,\d{3})+)\s*円?|(\d+)\s*円/);
  if (am) {
    const n = normalizeAmount(am[1] ?? am[2] ?? am[3]);
    if (n !== null) { amount = String(n); base = base.replace(am[0], ' '); }
  }
  const vendor = base
    .split(/[\s_\-()（）【】[\]]+/)
    .filter((t) => t && !/^(請求書|領収書|見積書|納品書|invoice|receipt|scan|img|image)$/i.test(t) && !/^\d+$/.test(t))
    .join(' ')
    .trim();
  return { date, vendor, amount };
}
