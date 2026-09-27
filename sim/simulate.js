'use strict';
/**
 * AI同士の自動対戦シミュレーション（バランス検証用）。
 * 使い方: node sim/simulate.js [試行回数] [A戦略] [B戦略]
 *   戦略: greedy | random
 */
const G = require('../src/core.js');

const trials = parseInt(process.argv[2] || '1000', 10);
const stratA = process.argv[3] || 'greedy';
const stratB = process.argv[4] || 'greedy';

const strategies = { greedy: G.chooseMoveGreedy, random: G.chooseMoveRandom };
const aiA = strategies[stratA];
const aiB = strategies[stratB];

let winsA = 0;
let winsB = 0;
let draws = 0;
let totalTurns = 0;
let maxTurns = 0;

for (let i = 0; i < trials; i++) {
  const seed = 1000 + i;
  const state = G.playAutoGame(seed, aiA, aiB);
  const score = G.getScore(state);
  if (score.winner === 'A') winsA += 1;
  else if (score.winner === 'B') winsB += 1;
  else draws += 1;
  totalTurns += state.turnCount;
  if (state.turnCount > maxTurns) maxTurns = state.turnCount;
}

const avgTurns = (totalTurns / trials).toFixed(2);
console.log(`試行回数: ${trials} (A=${stratA}, B=${stratB})`);
console.log(`先手(A)勝率: ${((winsA / trials) * 100).toFixed(1)}% (${winsA}勝)`);
console.log(`後手(B)勝率: ${((winsB / trials) * 100).toFixed(1)}% (${winsB}勝)`);
console.log(`引き分け: ${((draws / trials) * 100).toFixed(1)}% (${draws})`);
console.log(`平均ターン数: ${avgTurns} / 最長ターン数: ${maxTurns}`);
