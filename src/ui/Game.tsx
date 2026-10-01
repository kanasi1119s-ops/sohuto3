import { useMemo, useState } from 'react';
import { hint } from '../game/ai';
import { ANCHOR_MAX, REEF_WIDTH, REPAIR_MIN, applyAction, harbored, isActive, moveAmount, newGame, resolveStorms, validate, wreckCount } from '../game/engine';
import type { Action, DifficultyId, State } from '../game/types';
import { DIFFICULTIES, SHIP_IDS, SHIP_NAMES } from '../game/types';
import { SHIP_COLORS, actionText, stormText, stormTitle } from './labels';

function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

function Pips({ n }: { n: number }) {
  const spots: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={spots[n].includes(i) ? 'on' : ''} />)}
    </span>
  );
}

function Boat({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 36" width="30" height="27" aria-hidden="true">
      <polygon points="20,2 20,22 6,22" fill="#fff" stroke={color} strokeWidth="2" />
      <polygon points="22,6 22,22 34,22" fill={color} />
      <path d="M3,25 H37 L31,34 H9 Z" fill={color} />
    </svg>
  );
}

/** ラウンド終了時の結果メッセージを作る */
function stormReport(before: State, after: State): string[] {
  const msgs: string[] = [];
  const mid = resolveStorms(before);
  for (const id of SHIP_IDS) {
    const b = before.ships[id], m = mid.ships[id];
    if (b.anchored && before.storms.length) continue;
    if (m.wrecked && !b.wrecked) msgs.push(`${SHIP_NAMES[id]}が沈んでしまった…`);
    else if (m.hull < b.hull) msgs.push(`${SHIP_NAMES[id]}が岩礁にぶつかった（船体${m.hull}）`);
    if (!m.wrecked && m.pos < b.pos) msgs.push(`${SHIP_NAMES[id]}が${b.pos - m.pos}マスおし戻された`);
  }
  if (after.phase === 'act' && msgs.length === 0) msgs.push('嵐は船にとどかなかった。');
  return msgs;
}

export function Game({ diff, seed, onTitle, onRules }: { diff: DifficultyId; seed?: number; onTitle: () => void; onRules: () => void }) {
  const cfg = DIFFICULTIES[diff].cfg;
  const [history, setHistory] = useState<State[]>(() => [newGame(cfg, seed ?? randomSeed())]);
  const s = history[history.length - 1];
  const [sel, setSel] = useState<number | null>(null);
  const [rerollMode, setRerollMode] = useState(false);
  const [report, setReport] = useState<string[] | null>(null);
  const [hintAct, setHintAct] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const forecast = useMemo(() => resolveStorms(s), [s]);
  const reefCells = new Set<number>();
  for (const st of s.storms) if (st.kind === 'reef') for (let i = 0; i < REEF_WIDTH; i++) reefCells.add(st.n + i);
  const hintDie = hintAct && hintAct.t !== 'end' ? hintAct.die : null;
  const hintShip = hintAct && hintAct.t !== 'end' && hintAct.t !== 'reroll' ? hintAct.ship : null;

  const clear = () => { setSel(null); setRerollMode(false); setHintAct(null); setError(null); setConfirmEnd(false); };
  const push = (next: State) => { setHistory((h) => [...h, next]); clear(); };
  const act = (a: Action) => {
    const err = validate(s, a);
    if (err) { setError(err); return; }
    const next = applyAction(s, a);
    if (a.t === 'end') {
      setReport(stormReport(s, next));
    }
    push(next);
  };

  const onDie = (i: number) => {
    if (s.phase !== 'act' || s.used[i]) return;
    if (rerollMode && sel !== null && i !== sel) { act({ t: 'reroll', die: sel, target: i }); return; }
    setSel(sel === i ? null : i); setRerollMode(false); setHintAct(null); setError(null);
  };
  const undo = () => { if (history.length > 1) { setHistory((h) => h.slice(0, -1)); clear(); setReport(null); } };
  const restart = () => { setHistory([newGame(cfg, randomSeed())]); clear(); setReport(null); };

  const selVal = sel !== null ? s.dice[sel] : null;
  const unusedDice = s.used.filter((u) => !u).length;
  const finished = s.phase !== 'act';

  return (
    <main className="page game">
      <header className="top">
        <button className="btn small ghost" onClick={onTitle}>← タイトル</button>
        <div className="round">
          <strong>第{s.round}夜</strong>
          <span>／{cfg.rounds}（夜明けまで）</span>
        </div>
        <button className="btn small ghost" onClick={onRules}>ルール</button>
      </header>

      <section className="goal" aria-live="polite">
        目標：<b>{cfg.winShips}そう</b>を港へ ／ 港 <b>{harbored(s)}</b>/{cfg.winShips} ／ 沈没 <b className={wreckCount(s) ? 'bad' : ''}>{wreckCount(s)}</b>/{cfg.loseWrecks}（{cfg.loseWrecks}そうで敗北）
      </section>

      <section className="storms" aria-label="今夜の嵐">
        <h2>今夜の嵐（行動のあとに来ます）</h2>
        <div className="stormrow">
          {s.storms.map((st, i) => (
            <div key={i} className={`storm ${st.kind}`}>
              <strong>{stormTitle(st)}</strong>
              <span>{stormText(st)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sea" aria-label="海">
        {SHIP_IDS.map((id) => {
          const ship = s.ships[id];
          const f = forecast.ships[id];
          const active = isActive(s, id);
          const canMove = sel !== null && validate(s, { t: 'move', die: sel, ship: id }) === null;
          const canAnchor = sel !== null && validate(s, { t: 'anchor', die: sel, ship: id }) === null;
          const canRepair = sel !== null && validate(s, { t: 'repair', die: sel, ship: id }) === null;
          const arrived = !ship.wrecked && ship.pos >= cfg.harborPos;
          const projPos = f.wrecked ? null : f.pos;
          return (
            <div key={id} className={`lane ${ship.wrecked ? 'wrecked' : ''} ${hintShip === id ? 'hinted' : ''}`}>
              <div className="laneHead">
                <span className="dot" style={{ background: SHIP_COLORS[id] }} />
                <strong>{SHIP_NAMES[id]}</strong>
                <span className="hull" aria-label={`船体${ship.hull}`}>{Array.from({ length: cfg.hull }, (_, i) => <i key={i} className={i < ship.hull ? 'on' : ''} />)}</span>
                {ship.anchored && <span className="tag anchor">錨</span>}
                {arrived && <span className="tag ok">到着！</span>}
                {ship.wrecked && <span className="tag ng">沈没</span>}
                {active && (projPos !== ship.pos || f.hull !== ship.hull || f.wrecked) && (
                  <span className="proj">嵐のあと：{f.wrecked ? '沈没' : `${f.pos}番・船体${f.hull}`}</span>
                )}
              </div>
              <div className="track" style={{ gridTemplateColumns: `repeat(${cfg.harborPos + 1}, 1fr)` }}>
                {Array.from({ length: cfg.harborPos + 1 }, (_, p) => (
                  <div key={p} className={`cell ${p === cfg.harborPos ? 'harbor' : ''} ${reefCells.has(p) && p !== cfg.harborPos ? 'reef' : ''}`}>
                    <small>{p === cfg.harborPos ? '港' : p}</small>
                    {!ship.wrecked && ship.pos === p && <div className={`boat ${ship.anchored ? 'anch' : ''}`}><Boat color={SHIP_COLORS[id]} /></div>}
                    {ship.wrecked && p === 0 && <div className="boat">✕</div>}
                  </div>
                ))}
              </div>
              {sel !== null && active && !finished && (
                <div className="acts">
                  <button className="btn small" disabled={!canMove} onClick={() => act({ t: 'move', die: sel, ship: id })}>進む +{moveAmount(selVal!)}</button>
                  <button className="btn small" disabled={!canAnchor} onClick={() => act({ t: 'anchor', die: sel, ship: id })}>錨（1〜{ANCHOR_MAX}）</button>
                  <button className="btn small" disabled={!canRepair} onClick={() => act({ t: 'repair', die: sel, ship: id })}>修理（{REPAIR_MIN}〜6）</button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="dicebox" aria-label="サイコロ">
        <h2>サイコロ（{unusedDice}個のこり）</h2>
        <div className="dice">
          {s.dice.map((v, i) => (
            <button key={i} className={`die ${s.used[i] ? 'used' : ''} ${sel === i ? 'sel' : ''} ${hintDie === i ? 'hinted' : ''} ${rerollMode && !s.used[i] && sel !== i ? 'target' : ''}`}
              disabled={s.used[i] || finished} onClick={() => onDie(i)} aria-label={`サイコロ${i + 1}：${v}`}>
              <Pips n={v} /><b>{v}</b>
            </button>
          ))}
        </div>
        <p className="help">
          {sel === null ? 'サイコロを1つ選んでください。' : rerollMode ? '振り直したいサイコロをタップ。' : `出目${selVal}：上の船のボタンから使い道を選びます。`}
        </p>
        <div className="row">
          <button className="btn small" disabled={sel === null || s.rerollUsed || unusedDice < 2 || finished} onClick={() => setRerollMode((m) => !m)}>
            {s.rerollUsed ? '振り直し（使用済み）' : rerollMode ? '振り直しをやめる' : '選んだ目を使って別の目を振り直す'}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {hintAct && <p className="hint">ヒント：{actionText(hintAct, s)}</p>}
      </section>

      <footer className="bar">
        <button className="btn small" disabled={history.length <= 1} onClick={undo}>ひとつ戻す</button>
        <button className="btn small" disabled={finished} onClick={() => { const a = hint(s); setHintAct(a); setSel(null); setRerollMode(false); }}>ヒント</button>
        {confirmEnd ? (
          <>
            <button className="btn primary" disabled={finished} onClick={() => act({ t: 'end' })}>本当に終える</button>
            <button className="btn small ghost" onClick={() => setConfirmEnd(false)}>やめる</button>
          </>
        ) : (
          <button className="btn primary" disabled={finished} onClick={() => (unusedDice > 0 ? setConfirmEnd(true) : act({ t: 'end' }))}>
            ラウンド終了 → 嵐へ
          </button>
        )}
      </footer>
      {confirmEnd && unusedDice > 0 && <p className="help center">サイコロが{unusedDice}個のこっています。使わずに嵐を迎えますか？</p>}

      {report && !finished && (
        <div className="modal" role="dialog" aria-label="嵐の結果">
          <div className="card">
            <h2>嵐が過ぎた…</h2>
            <ul>{report.map((m, i) => <li key={i}>{m}</li>)}</ul>
            <button className="btn primary" onClick={() => setReport(null)}>第{s.round}夜へ</button>
          </div>
        </div>
      )}

      {finished && (
        <div className="modal" role="dialog" aria-label="結果">
          <div className="card">
            <h2>{s.phase === 'won' ? '夜明けだ！ 港にあかりが届いた' : '船たちは港に届かなかった…'}</h2>
            {s.phase === 'won' ? (
              <p>{harbored(s)}そうの船が無事に港へ。第{s.round}夜で目標達成です。</p>
            ) : (
              <p>{s.loseReason === 'wrecks' ? `${wreckCount(s)}そうが沈んでしまいました。` : `夜明けまでに港へ着いたのは${harbored(s)}そう（目標${cfg.winShips}そう）でした。`}</p>
            )}
            {report && report.length > 0 && s.phase === 'lost' && <ul>{report.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            <button className="btn primary" onClick={() => { restart(); }}>もう一度あそぶ</button>
            <button className="btn" onClick={() => { undo(); }}>最後の1手を戻す</button>
            <button className="btn ghost" onClick={onTitle}>タイトルへ</button>
          </div>
        </div>
      )}
    </main>
  );
}

