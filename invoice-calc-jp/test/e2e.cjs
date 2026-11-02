const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ offline: true, viewport:{width:375,height:700} });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/dist/invoice-calc.html');
  const inputs = p.locator('tbody tr input');
  await inputs.nth(1).fill('1000'); await inputs.nth(2).fill('3');
  let t = await p.locator('#out').innerText();
  if (!t.includes('合計 3,300円')) throw new Error('calc: ' + t);
  await p.reload();
  t = await p.locator('#out').innerText();
  if (!t.includes('合計 3,300円')) throw new Error('persist: ' + t);
  await p.check('#wh'); t = await p.locator('#out').innerText();
  if (!t.includes('源泉徴収 -306円')) throw new Error('wh: ' + t);
  if (errs.length) throw new Error(errs.join());
  console.log('E2E OK (offline, mobile width, reload persistence)'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
