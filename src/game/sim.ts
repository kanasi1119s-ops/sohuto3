import { apply, newGame, winners } from './engine';
import { chooseAction, type AiKind } from './ai';
import type { GameState } from './types';

export function playGame(seed: number, kinds: AiKind[]): { state: GameState; steps: number } {
  let s = newGame(seed);
  let rng = seed ^ 0x9e3779b9;
  let steps = 0;
  while (s.phase !== 'gameEnd') {
    if (++steps > 5000) throw new Error('game did not finish, seed=' + seed);
    if (s.phase === 'roundEnd') { s = apply(s, { type: 'next' }); continue; }
    const [a, r] = chooseAction(s, s.turn, kinds[s.turn], rng);
    rng = r;
    s = apply(s, a);
  }
  return { state: s, steps };
}

export interface SimStats {
  games: number; seatWins: number[]; avgSteps: number; maxSteps: number;
  avgScore: number[]; exactRate: number[]; cometUsed: number; draws: number;
}

export function simulate(games: number, kinds: AiKind[], seed0 = 1): SimStats {
  const n = kinds.length;
  const st: SimStats = { games, seatWins: Array(n).fill(0), avgSteps: 0, maxSteps: 0, avgScore: Array(n).fill(0), exactRate: Array(n).fill(0), cometUsed: 0, draws: 0 };
  let totalSteps = 0;
  for (let g = 0; g < games; g++) {
    const { state, steps } = playGame(seed0 + g, kinds);
    totalSteps += steps; st.maxSteps = Math.max(st.maxSteps, steps);
    const w = winners(state);
    if (w.length > 1) st.draws++;
    for (const i of w) st.seatWins[i] += 1 / w.length;
    state.scores.forEach((v, i) => (st.avgScore[i] += v / games));
    state.exact.forEach((v, i) => (st.exactRate[i] += v / (games * 5)));
    st.cometUsed += state.cometLeft.filter((x) => !x).length / (games * n);
  }
  st.avgSteps = totalSteps / games;
  return st;
}
