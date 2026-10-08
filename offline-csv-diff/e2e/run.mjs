// E2E: ビルド成果物を preview で配信し、オフラインでShift_JIS CSVを比較する。
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const exe = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
const wait = async () => { for (let i = 0; i < 50; i++) { try { await fetch("http://localhost:4173"); return; } catch { await new Promise(r => setTimeout(r, 200)); } } throw new Error("server timeout"); };
const sjisNihongo = Buffer.from([0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea]); // 日本語
const csv = (name, price) => Buffer.concat([Buffer.from("id,name,price\n1,"), name, Buffer.from(`,${price}\n2,x,5\n`)]);
let code = 0, browser;
try {
  await wait();
  browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); // スマホ幅
  const page = await ctx.newPage();
  const external = [];
  page.on("request", r => { if (!r.url().startsWith("http://localhost:4173") && !r.url().startsWith("blob:") && !r.url().startsWith("data:")) external.push(r.url()); });
  await page.goto("http://localhost:4173");
  await ctx.setOffline(true);
  await page.setInputFiles("#fa", { name: "a.csv", mimeType: "text/csv", buffer: csv(sjisNihongo, 100) });
  await page.setInputFiles("#fb", { name: "b.csv", mimeType: "text/csv", buffer: csv(sjisNihongo, 120) });
  await page.click("#run");
  const out = await page.locator("#out").innerText();
  assert.match(out, /変更された行 \(1\)/);
  assert.match(out, /100/); assert.match(out, /120/);
  assert.match(await page.locator("#msg").innerText(), /変更1/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dl")]);
  assert.equal(dl.suggestedFilename(), "diff.csv");
  // 不正入力: キー列の無いファイル
  await page.setInputFiles("#fb", { name: "e.csv", mimeType: "text/csv", buffer: Buffer.from("") });
  await page.click("#run");
  assert.match(await page.locator("#msg").innerText(), /キー列/);
  assert.equal(await page.locator("#dl").isDisabled(), true, "ファイル変更後は保存ボタン無効");
  // file:// で直接開ける(ZIP配布想定)
  const fp = await ctx.newPage();
  await fp.goto("file://" + process.cwd() + "/dist/index.html");
  await fp.setInputFiles("#fa", { name: "a.csv", mimeType: "text/csv", buffer: csv(sjisNihongo, 1) });
  await fp.setInputFiles("#fb", { name: "b.csv", mimeType: "text/csv", buffer: csv(sjisNihongo, 2) });
  await fp.waitForSelector("#keys option");
  await fp.click("#run");
  assert.match(await fp.locator("#msg").innerText(), /変更1/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "横スクロールなし");
  assert.deepEqual(external, [], "外部通信なし");
  console.log("E2E OK (offline, mobile width, SJIS)");
} catch (e) { console.error(e); code = 1; }
finally { await browser?.close(); srv.kill(); }
process.exit(code);
