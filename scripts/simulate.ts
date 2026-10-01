import { greedyAction, randomAction } from '../src/game/ai';
import { applyAction, harbored, newGame, wreckCount } from '../src/game/engine';
import { DIFFICULTIES } from '../src/game/types';
import type { Action, DifficultyId, State } from '../src/game/types';

type Policy = 'greedy' | 'random' | 'moveOnly';

function playOne(diff: DifficultyId, seed: number, policy: Policy) {
  let s: State = newGame(DIFFICULTIES[diff].cfg, seed);
  let pr = seed ^ 0x9e3779b9;
  const used = { move: 0, anchor: 0, repair: 0, reroll: 0 };
  let guard = 0;
  while (s.phase === 'act' && guard++ < 5000) {
    let a: Action;
    if (policy === 'random') [a, pr] = randomAction(s, pr);
    else if (policy === 'greedy') a = greedyAction(s) ?? { t: 'end' };
    else {
      // 「進むだけ」戦略：貪欲法から錨・修理を除いたもの（守りが不要＝支配戦略でないかの検証用）
      a = greedyAction(s, true) ?? { t: 'end' };
    }
    if (a.t !== 'end') used[a.t]++;
    s = applyAction(s, a);
  }
  return { s, used, finished: s.phase !== 'act' };
}

const N = 1000;
const lines: string[] = [];
lines.push('# シミュレーション結果', '', `試行回数: 各条件 ${N} ゲーム（シード 1〜${N} 固定）`, '');
lines.push('戦略: **greedy**=嵐の結果を先読みする貪欲法AI／**random**=合法手（ラウンド終了を含む）から一様ランダム／**moveOnly**=greedyから錨・修理を除いた「進むだけ」（守りが不要な支配戦略でないかの確認用）。', '');
lines.push('| 難易度 | 戦略 | 勝率 | 平均ラウンド数 | 最長ラウンド | 沈没で敗北 | 夜明けで敗北 | 平均到着数 | 未終了 |');
lines.push('|---|---|---|---|---|---|---|---|---|');
const usage: string[] = [];
for (const diff of ['easy', 'normal', 'hard'] as DifficultyId[]) {
  for (const policy of ['greedy', 'random', 'moveOnly'] as Policy[]) {
    let win = 0, rounds = 0, maxR = 0, wreckL = 0, dawnL = 0, arrive = 0, unfinished = 0;
    const tot = { move: 0, anchor: 0, repair: 0, reroll: 0 };
    let winUse = { anchor: 0, repair: 0 }, loseUse = { anchor: 0, repair: 0 }, loses = 0;
    for (let seed = 1; seed <= N; seed++) {
      const { s, used, finished } = playOne(diff, seed, policy);
      if (!finished) unfinished++;
      rounds += s.round; maxR = Math.max(maxR, s.round);
      arrive += harbored(s);
      if (s.phase === 'won') { win++; winUse.anchor += used.anchor; winUse.repair += used.repair; }
      else { loses++; loseUse.anchor += used.anchor; loseUse.repair += used.repair; if (s.loseReason === 'wrecks') wreckL++; else dawnL++; }
      for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += used[k];
      void wreckCount;
    }
    lines.push(`| ${DIFFICULTIES[diff].label} | ${policy} | ${(win / N * 100).toFixed(1)}% | ${(rounds / N).toFixed(2)} | ${maxR} | ${wreckL} | ${dawnL} | ${(arrive / N).toFixed(2)} | ${unfinished} |`);
    if (policy === 'greedy') {
      const f = (x: number, d: number) => (d ? (x / d).toFixed(2) : '-');
      usage.push(`| ${DIFFICULTIES[diff].label} | ${f(tot.move, N)} | ${f(tot.anchor, N)} | ${f(tot.repair, N)} | ${f(tot.reroll, N)} | ${f(winUse.anchor, win)} / ${f(loseUse.anchor, loses)} | ${f(winUse.repair, win)} / ${f(loseUse.repair, loses)} |`);
    }
  }
}
lines.push('', '## 貪欲AIのアクション使用回数（1ゲームあたり平均）', '', '| 難易度 | 進む | 錨 | 修理 | 振り直し | 錨(勝ち/負け時) | 修理(勝ち/負け時) |', '|---|---|---|---|---|---|---|', ...usage);
console.log(lines.join('\n'));
