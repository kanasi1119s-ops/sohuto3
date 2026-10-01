import { applyAction, harbored, legalActions, resolveStorms, wreckCount } from './engine';
import { nextRandom } from './rng';
import type { Action, State } from './types';

/** 嵐を適用した後の盤面の良さ（今ラウンドの嵐は公開されているので先読みできる）。 */
export function evaluate(s: State): number {
  const after = resolveStorms(s);
  let v = 0;
  for (const x of after.ships) {
    if (x.wrecked) continue;
    v += x.pos + 2.5 * x.hull;
  }
  v += 12 * harbored(after) - 30 * wreckCount(after);
  return v;
}

/** 貪欲法：嵐後の評価が最も上がる手を選ぶ。上がらなければ null（ラウンド終了）。 */
export function greedyAction(s: State, moveOnly = false): Action | null {
  const base = evaluate(s);
  let best: Action | null = null;
  let bestGain = 0.01;
  for (const a of legalActions(s)) {
    if (a.t === 'reroll') continue; // 振り直しは結果が運次第なので別扱い
    if (moveOnly && a.t !== 'move') continue; // 検証用：守りを使わない戦略
    const gain = evaluate(applyAction(s, a)) - base;
    if (gain > bestGain) {
      best = a;
      bestGain = gain;
    }
  }
  return best;
}

/** ランダム：合法手（ラウンド終了を含む）から一様に選ぶ。 */
export function randomAction(s: State, seed: number): [Action, number] {
  const acts: Action[] = [...legalActions(s), { t: 'end' }];
  const [v, rng] = nextRandom(seed);
  return [acts[Math.floor(v * acts.length)], rng];
}

/** ヒント表示用：貪欲法の次の一手。なければラウンド終了を勧める。 */
export function hint(s: State): Action {
  return greedyAction(s) ?? { t: 'end' };
}
