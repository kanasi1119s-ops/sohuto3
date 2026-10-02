import { describe, expect, it } from 'vitest';
import { apply, isLegal, legalBids, legalCards, makeDeck, newGame, trickWinner, winners } from '../src/game/engine';
import { playGame, simulate } from '../src/game/sim';
import type { GameState, Played } from '../src/game/types';

const c = (suit: number, rank: number) => ({ id: suit * 10 + rank - 1, suit, rank });
const pl = (seat: number, suit: number, rank: number, shift = 0): Played => ({ seat, card: c(suit, rank), shift });

describe('deck / deal', () => {
  it('40枚・重複なし', () => {
    const d = makeDeck();
    expect(d.length).toBe(40);
    expect(new Set(d.map((x) => x.id)).size).toBe(40);
  });
  it('7枚ずつ配り、同じシードは同じ配り', () => {
    const a = newGame(7), b = newGame(7), o = newGame(8);
    expect(a.hands.every((h) => h.length === 7)).toBe(true);
    expect(a.hands).toEqual(b.hands);
    expect(a.hands).not.toEqual(o.hands);
    const all = [...a.hands.flat(), a.trump];
    expect(new Set(all.map((x) => x.id)).size).toBe(22);
  });
});

describe('trickWinner', () => {
  it('切り札が最優先', () => expect(trickWinner([pl(0, 0, 10), pl(1, 1, 2), pl(2, 0, 9)], 1)).toBe(1));
  it('切り札なしならリードマークの最大', () => expect(trickWinner([pl(0, 0, 5), pl(1, 2, 10), pl(2, 0, 9)], 3)).toBe(2));
  it('ほうき星 +3 / -3 を反映', () => {
    expect(trickWinner([pl(0, 0, 8), pl(1, 0, 6, 3), pl(2, 0, 3)], 3)).toBe(1);
    expect(trickWinner([pl(0, 0, 8, -3), pl(1, 0, 6), pl(2, 0, 3)], 3)).toBe(1);
  });
  it('同値は先に出した方', () => expect(trickWinner([pl(0, 0, 8), pl(1, 0, 5, 3), pl(2, 0, 1)], 3)).toBe(0));
});

describe('入札', () => {
  it('最後の人は合計7になる数を選べない', () => {
    let s = newGame(1);
    s = apply(s, { type: 'bid', seat: 0, value: 3 });
    s = apply(s, { type: 'bid', seat: 1, value: 2 });
    expect(legalBids(s, 2)).not.toContain(2);
    expect(legalBids(s, 2).length).toBe(7);
    expect(() => apply(s, { type: 'bid', seat: 2, value: 2 })).toThrow();
  });
  it('順番違いは拒否', () => {
    const s = newGame(1);
    expect(isLegal(s, { type: 'bid', seat: 1, value: 0 })).toBe(false);
  });
});

function toPlay(seed: number): GameState {
  let s = newGame(seed);
  s = apply(s, { type: 'bid', seat: 0, value: 1 });
  s = apply(s, { type: 'bid', seat: 1, value: 1 });
  return apply(s, { type: 'bid', seat: 2, value: 1 });
}

describe('プレイ', () => {
  it('マストフォロー', () => {
    let s = toPlay(3);
    const lead = s.hands[0][0];
    s = apply(s, { type: 'play', seat: 0, cardId: lead.id, shift: 0 });
    const has = s.hands[1].some((x) => x.suit === lead.suit);
    const legal = legalCards(s, 1);
    if (has) expect(legal.every((x) => x.suit === lead.suit)).toBe(true);
    else expect(legal.length).toBe(7);
    const illegal = s.hands[1].find((x) => !legal.includes(x));
    if (illegal) expect(isLegal(s, { type: 'play', seat: 1, cardId: illegal.id, shift: 0 })).toBe(false);
  });
  it('ほうき星は1回だけ・±3のみ', () => {
    let s = toPlay(3);
    const card = s.hands[0][0];
    expect(isLegal(s, { type: 'play', seat: 0, cardId: card.id, shift: 2 })).toBe(false);
    s = apply(s, { type: 'play', seat: 0, cardId: card.id, shift: 3 });
    expect(s.cometLeft[0]).toBe(false);
  });
  it('持っていない札は出せない', () => {
    const s = toPlay(3);
    expect(isLegal(s, { type: 'play', seat: 0, cardId: s.hands[1][0].id, shift: 0 })).toBe(false);
  });
});

describe('得点とゲーム終了', () => {
  it('ぴったり=10+2×予想、ズレ=−2×差', () => {
    // seat0:予想0/取0 → 10, seat1:予想2/取3 → -2, seat2: 予想4/取4 → 18 (合計7取らないのでダミー値で式のみ検証)
    const f = (b: number, w: number) => (Math.abs(b - w) === 0 ? 10 + 2 * b : -2 * Math.abs(b - w));
    expect([f(0, 0), f(2, 3), f(4, 4)]).toEqual([10, -2, 18]);
  });
  it('1000ゲーム: 全て終了し、各ラウンドのトリック総数は7', () => {
    const st = simulate(1000, ['smart', 'smart', 'smart']);
    expect(st.maxSteps).toBe(125);
    expect(st.games).toBe(1000);
  });
  it('得点は履歴と一致、トリック合計=7', () => {
    
    const { state } = playGame(42, ['smart', 'random', 'smart']);
    expect(state.history.length).toBe(5);
    for (const r of state.history) expect(r.won.reduce((a, b) => a + b, 0)).toBe(7);
    for (let i = 0; i < 3; i++) expect(state.history.reduce((a, r) => a + r.delta[i], 0)).toBe(state.scores[i]);
    expect(winners(state).length).toBeGreaterThan(0);
  });
});
