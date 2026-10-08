import { detectDelimiter, parseCsv, stringifyCsv, type Row } from "./csv";
import { decodeBytes, type Encoding } from "./encoding";
import { diffCsv, diffToRows, type DiffResult } from "./diff";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const MAX_BYTES = 100 * 1024 * 1024;
let rowsA: Row[] = [];
let rowsB: Row[] = [];
let last: { d: DiffResult; keys: string[] } | null = null;

function say(text: string, error = false) {
  const m = $("msg");
  m.textContent = text;
  m.className = error ? "err" : "";
}

async function load(input: HTMLInputElement): Promise<Row[]> {
  const f = input.files?.[0];
  if (!f) return [];
  if (f.size > MAX_BYTES) throw new Error(`${f.name}: 100MBを超えるファイルは扱えません`);
  const { text } = decodeBytes(new Uint8Array(await f.arrayBuffer()), $<HTMLSelectElement>("enc").value as Encoding);
  return parseCsv(text, detectDelimiter(text));
}

function resetResult() {
  last = null;
  $("out").replaceChildren();
  ($("dl") as HTMLButtonElement).disabled = true;
}

async function refreshKeys() {
  resetResult();
  try {
    rowsA = await load($("fa") as HTMLInputElement);
    rowsB = await load($("fb") as HTMLInputElement);
    const sel = $<HTMLSelectElement>("keys");
    sel.replaceChildren();
    const hb = rowsB[0] ?? [];
    for (const h of (rowsA[0] ?? []).filter((h) => hb.includes(h))) sel.add(new Option(h, h));
    if (sel.options.length) sel.options[0].selected = true;
    say(rowsA.length && rowsB.length ? `読込完了: 旧${rowsA.length - 1}行 / 新${rowsB.length - 1}行` : "");
  } catch (e) {
    say((e as Error).message, true);
  }
}

function section(title: string, cls: string, head: string[], body: string[][]) {
  const wrap = document.createElement("section");
  const h = document.createElement("h2");
  h.textContent = `${title} (${body.length})`;
  wrap.append(h);
  if (!body.length) return wrap;
  const t = document.createElement("table");
  const hr = t.insertRow();
  for (const x of head) hr.append(Object.assign(document.createElement("th"), { textContent: x }));
  for (const r of body) {
    const tr = t.insertRow();
    tr.className = cls;
    for (const x of r) tr.insertCell().textContent = x;
  }
  wrap.append(t);
  return wrap;
}

function run() {
  const keys = Array.from($<HTMLSelectElement>("keys").selectedOptions, (o) => o.value);
  try {
    const d = diffCsv(rowsA, rowsB, keys);
    last = { d, keys };
    const out = $("out");
    out.replaceChildren();
    const sum = `追加${d.added.length} / 削除${d.removed.length} / 変更${d.changed.length} / 同一${d.unchanged}`;
    say([sum, ...d.warnings, ...(d.columnsAdded.length ? [`追加列: ${d.columnsAdded.join(", ")}`] : []),
      ...(d.columnsRemoved.length ? [`削除列: ${d.columnsRemoved.join(", ")}`] : [])].join("\n"));
    $("msg").style.whiteSpace = "pre-line";
    const cols = (rs: Record<string, string>[]) => (rs[0] ? Object.keys(rs[0]) : []);
    out.append(
      section("追加された行", "add", cols(d.added), d.added.map((r) => Object.values(r))),
      section("削除された行", "del", cols(d.removed), d.removed.map((r) => Object.values(r))),
      section("変更された行", "chg", ["キー", "列", "旧", "新"],
        d.changed.flatMap((c) => c.changes.map((x) => [c.key, x.column, x.before, x.after]))),
    );
    ($("dl") as HTMLButtonElement).disabled = false;
  } catch (e) {
    say((e as Error).message, true);
  }
}

function download() {
  if (!last) return;
  const blob = new Blob(["﻿", stringifyCsv(diffToRows(last.d, last.keys), { safe: true })], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "diff.csv" });
  a.click();
  URL.revokeObjectURL(a.href);
}

$("fa").addEventListener("change", refreshKeys);
$("fb").addEventListener("change", refreshKeys);
$("enc").addEventListener("change", refreshKeys);
$("run").addEventListener("click", run);
$("dl").addEventListener("click", download);
