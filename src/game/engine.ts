import config from '../../data/config.json';
import type { Action, Card, GameState, Played } from './types';
import { shuffle } from './rng';

export const CFG = config;
export const P = config.players;

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of config.suits) {
    for (let r = 1; r <= config.maxRank; r++) d.push({ id: s.id * config.maxRank + r - 1, suit: s.id, rank: r });
  }
  return d;
}

const sortHand = (h: Card[]) => h.slice().sort((a, b) => a.suit - b.suit || a.rank - b.rank);

function deal(rng: number, round: number, prev?: Partial<GameState>): GameState {
  const [deck, r2] = shuffle(makeDeck(), rng);
  const hands: Card[][] = [];
  for (let p = 0; p < P; p++) hands.push(sortHand(deck.slice(p * config.handSize, (p + 1) * config.handSize)));
  const trump = deck[P * config.handSize];
  const leader = (round - 1) % P;
  return {
    rng: r2, round, phase: 'bid', hands, trump, leader, turn: leader,
    bids: Array(P).fill(null), won: Array(P).fill(0), trick: [], trickNo: 0,
    cometLeft: prev?.cometLeft ?? Array(P).fill(true),
    scores: prev?.scores ?? Array(P).fill(0),
    exact: prev?.exact ?? Array(P).fill(0),
    history: prev?.history ?? [],
    lastTrick: null,
  };
}

export function newGame(seed: number): GameState {
  return deal(seed >>> 0, 1);
}

/** 入札の順番は leader から。最後の人は合計がちょうど手札数にならない数しか宣言できない。 */
export function legalBids(s: GameState, seat: number): number[] {
  const out: number[] = [];
  const made = s.bids.filter((b) => b !== null) as number[];
  const last = made.length === P - 1;
  const sum = made.reduce((a, b) => a + b, 0);
  for (let v = 0; v <= config.handSize; v++) if (!(last && sum + v === config.handSize)) out.push(v);
  return out;
}

export function legalCards(s: GameState, seat: number): Card[] {
  const hand = s.hands[seat];
  if (s.trick.length === 0) return hand;
  const lead = s.trick[0].card.suit;
  const follow = hand.filter((c) => c.suit === lead);
  return follow.length ? follow : hand;
}

export function trickWinner(trick: Played[], trumpSuit: number): number {
  const lead = trick[0].card.suit;
  const trumps = trick.filter((p) => p.card.suit === trumpSuit);
  const pool = trumps.length ? trumps : trick.filter((p) => p.card.suit === lead);
  let best = pool[0];
  for (const p of pool) if (p.card.rank + p.shift > best.card.rank + best.shift) best = p; // 同値は先に出した方
  return best.seat;
}

export function isLegal(s: GameState, a: Action): boolean {
  if (a.type === 'next') return s.phase === 'roundEnd';
  if (a.seat !== s.turn) return false;
  if (a.type === 'bid') return s.phase === 'bid' && legalBids(s, a.seat).includes(a.value);
  if (s.phase !== 'play') return false;
  if (!legalCards(s, a.seat).some((c) => c.id === a.cardId)) return false;
  if (a.shift === 0) return true;
  return s.cometLeft[a.seat] && Math.abs(a.shift) === config.cometShift;
}

export function apply(s: GameState, a: Action): GameState {
  if (!isLegal(s, a)) throw new Error('illegal action: ' + JSON.stringify(a));
  if (a.type === 'next') {
    if (s.round >= config.rounds) return { ...s, phase: 'gameEnd' };
    return deal(s.rng, s.round + 1, s);
  }
  if (a.type === 'bid') {
    const bids = s.bids.slice();
    bids[a.seat] = a.value;
    const done = bids.every((b) => b !== null);
    return { ...s, bids, phase: done ? 'play' : 'bid', turn: done ? s.leader : (a.seat + 1) % P };
  }
  const card = s.hands[a.seat].find((c) => c.id === a.cardId)!;
  const hands = s.hands.map((h, i) => (i === a.seat ? h.filter((c) => c.id !== a.cardId) : h));
  const cometLeft = a.shift !== 0 ? s.cometLeft.map((v, i) => (i === a.seat ? false : v)) : s.cometLeft;
  const trick = [...s.trick, { seat: a.seat, card, shift: a.shift }];
  if (trick.length < P) return { ...s, hands, cometLeft, trick, turn: (a.seat + 1) % P };

  const winner = trickWinner(trick, s.trump.suit);
  const won = s.won.map((w, i) => (i === winner ? w + 1 : w));
  const trickNo = s.trickNo + 1;
  const base = { ...s, hands, cometLeft, won, trickNo, lastTrick: { plays: trick, winner } };
  if (trickNo < config.handSize) return { ...base, trick: [], turn: winner, leader: s.leader };

  // ラウンド終了: 得点計算
  const bids = s.bids as number[];
  const delta = bids.map((b, i) => {
    const d = Math.abs(b - won[i]);
    return d === 0 ? config.exactBase + config.exactPerTrick * b : -config.missPerDiff * d;
  });
  return {
    ...base, trick: [], phase: 'roundEnd',
    scores: s.scores.map((v, i) => v + delta[i]),
    exact: s.exact.map((v, i) => v + (bids[i] === won[i] ? 1 : 0)),
    history: [...s.history, { bids, won, delta }],
  };
}

/** 勝者の席番号の配列(同点は複数)。 同点なら「ぴったり回数」が多い方、それでも同じなら共同優勝。 */
export function winners(s: GameState): number[] {
  const key = (i: number) => s.scores[i] * 100 + s.exact[i];
  const best = Math.max(...s.scores.map((_, i) => key(i)));
  return s.scores.map((_, i) => i).filter((i) => key(i) === best);
}
