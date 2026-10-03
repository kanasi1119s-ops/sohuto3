import type { ReactNode } from 'react'

// 説明書(rules.md)用の最小Markdown表示。見出し・箇条書き・表・引用・太字のみ対応。
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('# ')) { out.push(<h1 key={k++}>{inline(l.slice(2))}</h1>); i++; continue }
    if (l.startsWith('## ')) { out.push(<h2 key={k++}>{inline(l.slice(3))}</h2>); i++; continue }
    if (l.startsWith('### ')) { out.push(<h3 key={k++}>{inline(l.slice(4))}</h3>); i++; continue }
    if (l.startsWith('> ')) { out.push(<blockquote key={k++}>{inline(l.slice(2))}</blockquote>); i++; continue }
    if (l.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      const [head, , ...body] = rows
      out.push(
        <div className="tablewrap" key={k++}>
          <table>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^(\d+\.|-) /.test(l)) {
      const ordered = /^\d+\./.test(l)
      const items: string[] = []
      while (i < lines.length && /^(\d+\.|-) /.test(lines[i])) {
        items.push(lines[i].replace(/^(\d+\.|-) /, ''))
        i++
      }
      const lis = items.map((t, j) => <li key={j}>{inline(t)}</li>)
      out.push(ordered ? <ol key={k++}>{lis}</ol> : <ul key={k++}>{lis}</ul>)
      continue
    }
    // 段落（連続行をまとめる）
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||\d+\. |- )/.test(lines[i])) {
      para.push(lines[i]); i++
    }
    out.push(<p key={k++}>{para.map((t, j) => <span key={j}>{inline(t)}{j < para.length - 1 && <br />}</span>)}</p>)
  }
  return <div className="md">{out}</div>
}
