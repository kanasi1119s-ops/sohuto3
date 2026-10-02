// docs/rules.md を表示するための最小Markdown変換 (見出し・リスト・表・太字・段落のみ)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^#{1,3} /.test(l)) {
      const n = l.match(/^#+/)![0].length;
      out.push(`<h${n}>${inline(l.replace(/^#+ /, ''))}</h${n}>`); i++;
    } else if (/^\|/.test(l)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push('<table><thead><tr>' + cells(head).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
    } else if (/^\s*[-*] /.test(l) || /^\d+\. /.test(l)) {
      const ordered = /^\d+\. /.test(l);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*] /.test(lines[i]) || /^\d+\. /.test(lines[i]))) items.push(inline(lines[i++].replace(/^\s*([-*]|\d+\.) /, '')));
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((x) => `<li>${x}</li>`).join('') + `</${tag}>`);
    } else if (/^>/.test(l)) {
      out.push(`<blockquote>${inline(l.replace(/^> ?/, ''))}</blockquote>`); i++;
    } else if (l.trim() === '' || /^---+$/.test(l)) { i++; }
    else {
      const p: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(#|\||>|\s*[-*] |\d+\. )/.test(lines[i])) p.push(lines[i++]);
      out.push(`<p>${inline(p.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}
