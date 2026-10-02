import type { Action, GameState } from './types';
import { CFG, legalBids, legalCards, trickWinner } from './engine';
import { nextRandom } from './rng';

export type AiKind = 'random' | 'smart';

/** 手札の強さから「何トリック取れそうか」を見積もる */
export function estimateTricks(s: GameState, seat: number): number {
  const ts = s.trump.suit;
  let e = 0;
  for (const c of s.hands[seat]) {
    if (c.suit === ts) e += c.rank >= 8 ? 0.95 : c.rank >= 5 ? 0.55 : 0.2;
    else e += c.rank === 10 ? 0.55 : c.rank === 9 ? 0.3 : c.rank === 8 ? 0.15 : 0;
  }
  return e;
}

export function chooseAction(s: GameState, seat: number, kind: AiKind, rng: number): [Action, number] {
  if (kind === 'random') {
    if (s.phase === 'bid') {
      const b = legalBids(s, seat);
      const [r, n] = nextRandom(rng);
      return [{ type: 'bid', seat, value: b[Math.floor(r * b.length)] }, n];
    }
    const cs = legalCards(s, seat);
    const [r, n] = nextRandom(rng);
    return [{ type: 'play', seat, cardId: cs[Math.floor(r * cs.length)].id, shift: 0 }, n];
  }
  if (s.phase === 'bid') {
    const target = Math.round(estimateTricks(s, seat));
    const ok = legalBids(s, seat);
    const v = ok.reduce((b, x) => (Math.abs(x - target) < Math.abs(b - target) ? x : b), ok[0]);
    return [{ type: 'bid', seat, value: v }, rng];
  }
  const need = (s.bids[seat] as number) - s.won[seat];
  const wantWin = need > 0;
  const options: { cardId: number; shift: number; wins: boolean; rank: number }[] = [];
  for (const c of legalCards(s, seat)) {
    const shifts = s.cometLeft[seat] ? [0, CFG.cometShift, -CFG.cometShift] : [0];
    for (const shift of shifts) {
      const trick = [...s.trick, { seat, card: c, shift }];
      // リードなら「いま勝っている」とみなす。後続が出るので先頭では大きい札ほど勝ちやすい。
      const wins = s.trick.length === 0 ? false : trickWinner(trick, s.trump.suit) === seat;
      options.push({ cardId: c.id, shift, wins, rank: c.rank + shift });
    }
  }
  const cost = (o: (typeof options)[number]) => o.rank + (o.shift !== 0 ? 6 : 0) + (s.hands[seat].find((c) => c.id === o.cardId)!.suit === s.trump.suit ? 8 : 0);
  let pick;
  if (wantWin) {
    const w = options.filter((o) => o.wins).sort((a, b) => cost(a) - cost(b));
    if (s.trick.length === 0) {
      pick = options.filter((o) => o.shift === 0).sort((a, b) => b.rank - a.rank)[0];
    } else pick = w[0] ?? options.filter((o) => o.shift === 0).sort((a, b) => a.rank - b.rank)[0];
  } else {
    const l = options.filter((o) => !o.wins).sort((a, b) => b.rank - a.rank);
    pick = s.trick.length === 0
      ? options.filter((o) => o.shift === 0).sort((a, b) => a.rank - b.rank)[0]
      : l.find((o) => o.shift === 0) ?? l[0] ?? options.sort((a, b) => cost(a) - cost(b))[0];
  }
  return [{ type: 'play', seat, cardId: pick.cardId, shift: pick.shift }, rng];
}
