import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import rulesText from '../docs/rules.md?raw'
import { chooseAction, type AiLevel } from './game/ai'
import {
  CAP, HAND_LIMIT, RES, RES_ICON, RES_LABEL, ROUNDS, SPACES, applyAction, canAfford,
  legalActions, newGame, scoreOf, winnerOf,
} from './game/engine'
import type { Action, GameState, Order, Player, PlayerIndex, Res, SpaceId } from './game/types'
import { Markdown } from './ui/Markdown'

type Mode = 'cpu' | 'hot'
interface Setup { mode: Mode; level: AiLevel; humanSide: PlayerIndex }

const NAMES = ['プレイヤー1', 'プレイヤー2']
const CAT_LABEL: Record<Res, string> = { fish: '海', veg: '山', rice: '里' }
const randSeed = () => Math.floor(Math.random() * 2 ** 31)

function ResBadges({ cost, have }: { cost: Record<Res, number>; have?: Record<Res, number> }) {
  return (
    <span className="cost">
      {RES.filter((r) => cost[r] > 0).map((r) => (
        <span key={r} className={have && have[r] < cost[r] ? 'short' : ''}>
          {RES_ICON[r]}×{cost[r]}
        </span>
      ))}
    </span>
  )
}

function OrderCard({ o, have, onClick, selected, disabled }: {
  o: Order; have?: Record<Res, number>; onClick?: () => void; selected?: boolean; disabled?: boolean
}) {
  const ok = have ? RES.every((r) => have[r] >= o.cost[r]) : false
  return (
    <button
      className={`order cat-${o.cat} ${ok ? 'ready' : ''} ${selected ? 'sel' : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      <span className="oname">{o.name}<small>{CAT_LABEL[o.cat]}</small></span>
      <ResBadges cost={o.cost} have={have} />
      <span className="pts">{o.points}点</span>
    </button>
  )
}

function PlayerPanel({ p, idx, s, label }: { p: Player; idx: PlayerIndex; s: GameState; label: string }) {
  const sc = scoreOf(p)
  const active = !s.over && s.current === idx
  const used = s.turnInRound === 0 ? 0 : Object.values(s.spaces).filter((v) => v === idx).length
  return (
    <section className={`panel p${idx} ${active ? 'active' : ''}`}>
      <header>
        <b>{label}</b>
        {s.first === idx && <span className="chip">先手</span>}
        <span className="workers">{'●'.repeat(3 - used)}{'○'.repeat(used)}</span>
        <span className="score" title="手元の未納品カード1枚につき−1点を含む暫定の点数">{sc.total}点</span>
      </header>
      <div className="resrow">
        {RES.map((r) => (
          <span key={r} className="res" title={RES_LABEL[r]}>
            {RES_ICON[r]} {p.res[r]}<small>/{CAP}</small>
          </span>
        ))}
      </div>
      <div className="mini">手元の注文 {p.hand.length}/{HAND_LIMIT}（納品できないまま残ると1枚−1点）</div>
      <div className="hand">
        {p.hand.length === 0 && <span className="dim">なし</span>}
        {p.hand.map((o) => <OrderCard key={o.id} o={o} have={p.res} />)}
      </div>
      <div className="mini">納品済み {p.done.length}枚（{sc.orders}点{sc.allCats ? ' ＋三種そろい4' : ''}{sc.triple ? ' ＋同種3' : ''}）</div>
      <div className="done">{p.done.map((o) => <span key={o.id} className={`tag cat-${o.cat}`}>{o.name}</span>)}</div>
    </section>
  )
}

function Chooser({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="choices">{children}</div>
        <button className="ghost" onClick={onCancel}>やめる</button>
      </div>
    </div>
  )
}

function Game({ setup, onExit, onRules }: { setup: Setup; onExit: () => void; onRules: () => void }) {
  const [seed] = useState(randSeed)
  const [history, setHistory] = useState<GameState[]>(() => [newGame(seed)])
  const s = history[history.length - 1]
  const rngRef = useRef(seed ^ 0x5bd1e995)
  const [pending, setPending] = useState<SpaceId | null>(null)
  const isCpu = (i: PlayerIndex) => setup.mode === 'cpu' && i !== setup.humanSide
  const legal = useMemo(() => legalActions(s), [s])
  const cpuTurn = !s.over && isCpu(s.current)

  const push = useCallback((a: Action) => {
    setHistory((h) => [...h, applyAction(h[h.length - 1], a)])
    setPending(null)
  }, [])

  useEffect(() => {
    if (!cpuTurn) return
    const t = setTimeout(() => {
      const [a, n] = chooseAction(s, setup.level, rngRef.current)
      rngRef.current = n
      push(a)
    }, 800)
    return () => clearTimeout(t)
  }, [cpuTurn, s, setup.level, push])

  const bySpace = (sp: SpaceId) => legal.filter((a) => a.type === 'place' && a.space === sp)
  const passAct = legal.find((a) => a.type === 'pass')
  const me = s.players[s.current]
  const humanTurn = !s.over && !cpuTurn

  const clickSpace = (sp: SpaceId) => {
    if (!humanTurn) return
    const acts = bySpace(sp)
    if (acts.length === 0) return
    if (acts.length === 1 && sp !== 'rooster') push(acts[0])
    else setPending(sp)
  }

  const label = (i: PlayerIndex) =>
    setup.mode === 'cpu' ? (i === setup.humanSide ? 'あなた' : 'CPU') : NAMES[i]
  const winner = s.over ? winnerOf(s) : null
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [s.log.length])

  return (
    <div className="game">
      <div className="topbar">
        <button className="ghost" onClick={onExit}>← ホーム</button>
        <div className="round">第{s.round}/{ROUNDS}ラウンド</div>
        <button className="ghost" onClick={onRules}>ルール</button>
      </div>
      <div className={`turnbar ${s.over ? 'over' : ''}`}>
        {s.over
          ? winner === null ? '引き分け！' : `${label(winner)}の勝ち！`
          : cpuTurn ? `${label(s.current)}が考え中…` : `${label(s.current)}の番：ワーカーを置く場所をえらんでください`}
      </div>

      <div className="grid">
        {SPACES.map((sp) => {
          const occ = s.spaces[sp.id]
          const can = humanTurn && bySpace(sp.id).length > 0
          return (
            <button
              key={sp.id}
              className={`space ${occ !== null ? `taken t${occ}` : ''} ${can ? 'can' : ''}`}
              disabled={!can}
              onClick={() => clickSpace(sp.id)}
            >
              <span className="sicon">{sp.icon}</span>
              <b>{sp.name}</b>
              <small>{sp.desc}</small>
              {occ !== null && <span className={`meeple t${occ}`}>{label(occ)}</span>}
            </button>
          )
        })}
      </div>
      {humanTurn && passAct && (
        <button className="primary pass" onClick={() => push(passAct)}>置ける場所がありません（パス）</button>
      )}

      <section className="market">
        <h2>場の注文カード <small>（山札 残り{s.deck.length}枚）</small></h2>
        <div className="hand">
          {s.market.length === 0 && <span className="dim">なし</span>}
          {s.market.map((o) => <OrderCard key={o.id} o={o} have={me.res} />)}
        </div>
      </section>

      <div className="panels">
        <PlayerPanel p={s.players[0]} idx={0} s={s} label={label(0)} />
        <PlayerPanel p={s.players[1]} idx={1} s={s} label={label(1)} />
      </div>

      <div className="log" ref={logRef} aria-live="polite">
        {s.log.map((l, i) => <div key={i}>{l.replace('プレイヤー1', label(0)).replace('プレイヤー2', label(1))}</div>)}
      </div>
      <div className="actions">
        {setup.mode === 'hot' && history.length > 1 && !s.over && (
          <button className="ghost" onClick={() => setHistory((h) => h.slice(0, -1))}>ひとつ戻す</button>
        )}
        {s.over && <button className="primary" onClick={onExit}>もういちど遊ぶ</button>}
      </div>

      {s.over && <ResultDialog s={s} label={label} winner={winner} />}

      {pending && (
        <Chooser title={SPACES.find((x) => x.id === pending)!.name} onCancel={() => setPending(null)}>
          {bySpace(pending).map((a, i) => {
            if (a.type !== 'place') return null
            if (a.orderId) {
              const o = (pending === 'order' ? s.market : me.hand).find((x) => x.id === a.orderId)!
              return <OrderCard key={i} o={o} have={me.res} onClick={() => push(a)} />
            }
            return (
              <button key={i} className="choice" onClick={() => push(a)}>
                {a.res ? `${RES_ICON[a.res]} ${RES_LABEL[a.res]}を1つもらう` : 'そのまま置く'}
              </button>
            )
          })}
        </Chooser>
      )}
    </div>
  )
}

function ResultDialog({ s, label, winner }: { s: GameState; label: (i: PlayerIndex) => string; winner: PlayerIndex | null }) {
  const [open, setOpen] = useState(true)
  if (!open) return <button className="ghost" onClick={() => setOpen(true)}>結果をもう一度見る</button>
  return (
    <div className="overlay" onClick={() => setOpen(false)}>
      <div className="dialog result" onClick={(e) => e.stopPropagation()}>
        <h2>{winner === null ? '引き分け！' : `${label(winner)}の勝ち！`}</h2>
        <table>
          <thead><tr><th></th>{[0, 1].map((i) => <th key={i}>{label(i as PlayerIndex)}</th>)}</tr></thead>
          <tbody>
            {([
              ['納品の点数', 'orders'], ['三種そろい', 'allCats'], ['同じ種類3枚', 'triple'], ['手元の注文(−)', 'penalty'], ['合計', 'total'],
            ] as const).map(([name, k]) => (
              <tr key={k} className={k === 'total' ? 'total' : ''}>
                <td>{name}</td>
                {s.players.map((p, i) => <td key={i}>{k === 'penalty' ? `−${scoreOf(p)[k]}` : scoreOf(p)[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <button className="primary" onClick={() => setOpen(false)}>閉じる</button>
      </div>
    </div>
  )
}

function Home({ onStart, onRules }: { onStart: (s: Setup) => void; onRules: () => void }) {
  const [mode, setMode] = useState<Mode>('cpu')
  const [level, setLevel] = useState<AiLevel>('greedy')
  const [side, setSide] = useState<PlayerIndex>(0)
  return (
    <div className="home">
      <div className="logo">⚓🐟🥬🍚</div>
      <h1>みなとのあさいち</h1>
      <p className="lead">ワーカーを置いて材料を集め、注文を納品して点数をかせぐ、2人用のボードゲーム。</p>
      <div className="three">
        <div>① 交代でワーカーを場所に置く</div>
        <div>② 魚・野菜・米を集める</div>
        <div>③ 注文を納品して得点！</div>
      </div>
      <div className="seg">
        <button className={mode === 'cpu' ? 'on' : ''} onClick={() => setMode('cpu')}>CPUと対戦</button>
        <button className={mode === 'hot' ? 'on' : ''} onClick={() => setMode('hot')}>ふたりで対戦</button>
      </div>
      {mode === 'cpu' && (
        <>
          <div className="seg">
            <button className={level === 'random' ? 'on' : ''} onClick={() => setLevel('random')}>CPU: やさしい</button>
            <button className={level === 'greedy' ? 'on' : ''} onClick={() => setLevel('greedy')}>CPU: ふつう</button>
          </div>
          <div className="seg">
            <button className={side === 0 ? 'on' : ''} onClick={() => setSide(0)}>先手で遊ぶ</button>
            <button className={side === 1 ? 'on' : ''} onClick={() => setSide(1)}>後手で遊ぶ</button>
          </div>
        </>
      )}
      <button className="primary big" onClick={() => onStart({ mode, level, humanSide: side })}>はじめる</button>
      <button className="ghost" onClick={onRules}>遊び方（ルール）を読む</button>
      <p className="foot">試作版です。遊んだ内容はどこにも送信されません。お金や景品を賭ける遊び方はできません。</p>
    </div>
  )
}

export default function App() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [gameKey, setGameKey] = useState(0)
  return (
    <>
      {setup ? (
        <Game key={gameKey} setup={setup} onExit={() => setSetup(null)} onRules={() => setShowRules(true)} />
      ) : (
        <Home onStart={(s) => { setGameKey((k) => k + 1); setSetup(s) }} onRules={() => setShowRules(true)} />
      )}
      {showRules && (
        <div className="overlay" onClick={() => setShowRules(false)}>
          <div className="dialog rules" onClick={(e) => e.stopPropagation()}>
            <Markdown text={rulesText} />
            <button className="primary" onClick={() => setShowRules(false)}>とじる</button>
          </div>
        </div>
      )}
    </>
  )
}

export { canAfford }
