import './style.css';
import rulesMd from '../../docs/rules.md?raw';
import { renderMarkdown } from './markdown';
import { CFG, P, apply, legalBids, legalCards, newGame, winners } from '../game/engine';
import { chooseAction, type AiKind } from '../game/ai';
import type { Card, GameState, Played } from '../game/types';

type Mode = { humans: 1 | 3; ai: AiKind };
const app = document.getElementById('app')!;
let mode: Mode = { humans: 1, ai: 'smart' };
let s: GameState | null = null;
let aiRng = 1;
let shift = 0; // 次に出す札に使う「ほうき星」: 0 / +3 / -3
let curtainSeat = -1;
let timer: number | undefined;

const suit = (id: number) => CFG.suits[id];
const name = (i: number) => (mode.humans === 3 ? `プレイヤー${i + 1}` : CFG.playerNames[i]);
const isHuman = (i: number) => mode.humans === 3 || i === 0;
const h = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function cardHtml(c: Card, extra = '', shiftVal = 0): string {
  const su = suit(c.suit);
  const sh = shiftVal ? `<i class="sh">${shiftVal > 0 ? '+' : '−'}${Math.abs(shiftVal)}</i>` : '';
  return `<span class="card ${extra}" style="--c:${su.color}"><b>${c.rank}</b><u>${su.symbol}</u>${sh}</span>`;
}

function start(m: Mode) {
  mode = m;
  s = newGame((Date.now() & 0xffffff) | 1);
  aiRng = (Date.now() >>> 3) | 1;
  shift = 0; curtainSeat = -1;
  render();
}

function home() {
  clearTimeout(timer);
  s = null;
  app.innerHTML = `
  <main class="home">
    <div class="stars" aria-hidden="true"></div>
    <h1>ほしのトリック</h1>
    <p class="lead">予想した回数ぴったりに「トリック」を取る、3人用のカードゲーム。<br>約10分・8歳以上</p>
    <div class="menu">
      <button class="primary" data-start="1:smart">ひとりで遊ぶ（AI 2人と対戦）</button>
      <button data-start="1:random">ひとりで遊ぶ・やさしめAI</button>
      <button data-start="3:smart">3人でまわし遊び（1台の端末）</button>
      <button data-act="rules">ルール（遊び方）を読む</button>
    </div>
    <p class="note">データは端末の中だけで動きます。お金やランダム購入の要素はありません。</p>
  </main>`;
  app.querySelectorAll<HTMLButtonElement>('[data-start]').forEach((b) =>
    b.addEventListener('click', () => {
      const [n, ai] = b.dataset.start!.split(':');
      start({ humans: Number(n) as 1 | 3, ai: ai as AiKind });
    }));
  app.querySelector('[data-act=rules]')!.addEventListener('click', () => showRules(home));
}

function showRules(back: () => void) {
  app.innerHTML = `<main class="rules"><button class="back">← もどる</button><article>${renderMarkdown(rulesMd)}</article><button class="back">← もどる</button></main>`;
  app.querySelectorAll('.back').forEach((b) => b.addEventListener('click', back));
  window.scrollTo(0, 0);
}

function scoreboard(st: GameState): string {
  const rows = st.scores.map((v, i) => {
    const bid = st.bids[i] === null ? '–' : String(st.bids[i]);
    return `<tr class="${st.turn === i && st.phase !== 'roundEnd' ? 'turn' : ''}"><th>${h(name(i))}</th><td>${bid}</td><td>${st.won[i]}</td><td class="pt">${v}</td><td>${st.cometLeft[i] ? '☄' : '・'}</td></tr>`;
  }).join('');
  return `<table class="score"><thead><tr><th></th><th>予想</th><th>取った</th><th>合計点</th><th>ほうき星</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function trickArea(st: GameState): string {
  const plays: Played[] = st.trick.length ? st.trick : (st.lastTrick?.plays ?? []);
  const winnerSeat = st.trick.length ? -1 : st.lastTrick?.winner ?? -1;
  const slots = Array.from({ length: P }, (_, i) => {
    const p = plays.find((x) => x.seat === i);
    return `<div class="slot ${winnerSeat === i && p ? 'won' : ''}"><small>${h(name(i))}${st.leader === i && st.phase === 'play' && st.trickNo === 0 && !st.trick.length ? '（先手）' : ''}</small>${p ? cardHtml(p.card, '', p.shift) : '<span class="card empty"></span>'}</div>`;
  });
  return `<div class="trick">${slots.join('')}</div>`;
}

function render() {
  clearTimeout(timer);
  const st = s!;
  if (st.phase === 'gameEnd') return renderEnd(st);
  const ts = suit(st.trump.suit);
  const humanTurn = isHuman(st.turn) && st.phase !== 'roundEnd';
  const needCurtain = mode.humans === 3 && humanTurn && curtainSeat !== st.turn && (st.phase === 'bid' || st.phase === 'play');
  const handSeat = mode.humans === 3 ? st.turn : 0;
  let panel = '';
  if (st.phase === 'bid') {
    if (humanTurn) {
      const ok = legalBids(st, st.turn);
      panel = `<p class="msg">何トリック取れそう？ 予想を選んでね。${ok.length < CFG.handSize + 1 ? `（最後の人は合計が${CFG.handSize}になる数は選べません）` : ''}</p><div class="bids">${Array.from({ length: CFG.handSize + 1 }, (_, v) => `<button data-bid="${v}" ${ok.includes(v) ? '' : 'disabled'}>${v}</button>`).join('')}</div>`;
    } else panel = `<p class="msg">${h(name(st.turn))}が予想しています…</p>`;
  } else if (st.phase === 'play') {
    if (humanTurn) {
      const ok = new Set(legalCards(st, st.turn).map((c) => c.id));
      const must = st.trick.length ? `「${suit(st.trick[0].card.suit).name}」を持っていたら出す` : 'どの札でもOK（先手）';
      panel = `<p class="msg">あなたの番：${must}</p>` +
        (st.cometLeft[st.turn] ? `<div class="comet">☄ ほうき星（1回だけ）: <button data-shift="0" class="${shift === 0 ? 'on' : ''}">使わない</button><button data-shift="${CFG.cometShift}" class="${shift === CFG.cometShift ? 'on' : ''}">+${CFG.cometShift}</button><button data-shift="${-CFG.cometShift}" class="${shift === -CFG.cometShift ? 'on' : ''}">−${CFG.cometShift}</button></div>` : '') +
        `<div class="hand">${st.hands[handSeat].map((c) => `<button class="cardbtn" data-card="${c.id}" ${ok.has(c.id) ? '' : 'disabled'}>${cardHtml(c)}</button>`).join('')}</div>`;
    } else panel = `<p class="msg">${h(name(st.turn))}が考えています…</p>`;
  } else if (st.phase === 'roundEnd') {
    const r = st.history[st.history.length - 1];
    panel = `<div class="result"><h3>第${st.round}ラウンド 結果</h3>${r.delta.map((d, i) => `<p>${h(name(i))}：予想${r.bids[i]} / 取った${r.won[i]} → <strong class="${d > 0 ? 'plus' : 'minus'}">${d > 0 ? '+' : ''}${d}点</strong>${d > 0 ? '（ぴったり！）' : ''}</p>`).join('')}<button class="primary" data-act="next">${st.round >= CFG.rounds ? '最終結果を見る' : '次のラウンドへ'}</button></div>`;
  }
  const showHandPreview = st.phase !== 'play' && handSeat >= 0 && st.phase !== 'roundEnd' && humanTurn
    ? `<div class="hand preview">${st.hands[handSeat].map((c) => cardHtml(c)).join('')}</div>` : '';

  app.innerHTML = `
  <main class="game">
    <header>
      <button class="mini" data-act="home">☰ メニュー</button>
      <span>第${st.round}/${CFG.rounds}ラウンド</span>
      <button class="mini" data-act="rules">ルール</button>
    </header>
    <section class="sky">きょうの空： ${cardHtml(st.trump, 'trump')} <span>切り札は <b style="color:${ts.color}">${ts.symbol}${ts.name}</b>（出ると強い）</span></section>
    ${trickArea(st)}
    ${scoreboard(st)}
    <section class="panel">${panel}${showHandPreview}</section>
    ${needCurtain ? `<div class="curtain"><p>${h(name(st.turn))}の番です</p><p class="small">ほかの人は画面を見ないでね</p>${st.trick.length || st.lastTrick ? '<p class="small">前のトリックの結果</p>' + trickArea(st) : ''}<button class="primary" data-act="show">手札を見る</button></div>` : ''}
  </main>`;

  app.querySelector('[data-act=home]')!.addEventListener('click', () => { if (confirm('ゲームをやめてメニューに戻りますか？')) home(); });
  app.querySelector('[data-act=rules]')!.addEventListener('click', () => showRules(render));
  app.querySelector('[data-act=show]')?.addEventListener('click', () => { curtainSeat = st.turn; render(); });
  app.querySelector('[data-act=next]')?.addEventListener('click', () => { s = apply(st, { type: 'next' }); shift = 0; curtainSeat = -1; render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-bid]').forEach((b) => b.addEventListener('click', () => { s = apply(st, { type: 'bid', seat: st.turn, value: Number(b.dataset.bid) }); curtainSeat = -1; render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-shift]').forEach((b) => b.addEventListener('click', () => { shift = Number(b.dataset.shift); render(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-card]').forEach((b) => b.addEventListener('click', () => {
    s = apply(st, { type: 'play', seat: st.turn, cardId: Number(b.dataset.card), shift });
    shift = 0; curtainSeat = -1;
    render();
  }));

  if (!humanTurn && st.phase !== 'roundEnd') {
    // 4枚目(トリック完了直後)は結果が見えるよう少し長く待つ
    timer = window.setTimeout(() => {
      const cur = s!;
      const [a, r] = chooseAction(cur, cur.turn, mode.ai, aiRng);
      aiRng = r;
      s = apply(cur, a);
      render();
    }, st.phase === 'play' && st.trick.length === 0 && st.lastTrick ? 1500 : 650);
  }
}

function renderEnd(st: GameState) {
  const w = winners(st);
  const order = st.scores.map((v, i) => i).sort((a, b) => st.scores[b] - st.scores[a]);
  app.innerHTML = `<main class="home">
    <div class="stars" aria-hidden="true"></div>
    <h1>ゲーム終了</h1>
    <p class="lead">${w.length > 1 ? '同点！ ' : ''}勝者：<strong>${w.map((i) => h(name(i))).join('・')}</strong></p>
    <table class="score"><thead><tr><th>順位</th><th></th><th>合計点</th><th>ぴったり回数</th></tr></thead><tbody>${order.map((i, k) => `<tr><td>${k + 1}</td><th>${h(name(i))}</th><td class="pt">${st.scores[i]}</td><td>${st.exact[i]}</td></tr>`).join('')}</tbody></table>
    <div class="menu"><button class="primary" data-act="again">もう一度遊ぶ</button><button data-act="home">メニューへ</button></div></main>`;
  app.querySelector('[data-act=again]')!.addEventListener('click', () => start(mode));
  app.querySelector('[data-act=home]')!.addEventListener('click', home);
}

home();
