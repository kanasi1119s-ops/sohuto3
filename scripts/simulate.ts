import { simulate } from '../src/game/sim';
const N = Number(process.argv[2] ?? 1000);
const fmt = (a: number[]) => a.map((x) => x.toFixed(3)).join(' / ');
for (const [label, kinds] of [
  ['smart x3', ['smart', 'smart', 'smart']],
  ['random x3', ['random', 'random', 'random']],
  ['smart(席0) vs random x2', ['smart', 'random', 'random']],
  ['smart(席2) vs random x2', ['random', 'random', 'smart']],
] as const) {
  const s = simulate(N, [...kinds]);
  console.log(`## ${label} (${N}ゲーム, seed 1〜)`);
  console.log(`席ごとの勝率: ${fmt(s.seatWins.map((x) => x / N))}`);
  console.log(`平均得点: ${fmt(s.avgScore)} / ぴったり率: ${fmt(s.exactRate)}`);
  console.log(`平均手数(アクション数): ${s.avgSteps.toFixed(1)} 最大: ${s.maxSteps} / 同点共同優勝: ${s.draws} / ほうき星使用率: ${s.cometUsed.toFixed(2)}`);
}
