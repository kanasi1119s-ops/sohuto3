/**
 * カラーフィールド バランス検証用シミュレーションスクリプト
 * AI同士(random/greedy)を大量に自動対戦させ、先手勝率・平均ターン数・
 * 支配戦略の有無(戦略間の勝率差)を検証する。シード固定で再現可能。
 *
 * 使い方: node scripts/simulate.js [試行回数] [戦略A] [戦略B]
 * 例:     node scripts/simulate.js 2000 greedy greedy
 */
var path = require('path');
var Game = require(path.join(__dirname, '..', 'game.js'));
var AI = require(path.join(__dirname, '..', 'ai.js'));

function runOneGame(strategyA, strategyB, seed) {
  var rng = AI.createRng(seed);
  var state = Game.createInitialState();
  var turns = 0;
  var maxTurns = state.boardSize * state.boardSize * 2 + 10; // 安全弁: 無限ループ検出
  while (!state.gameOver) {
    var strategy = state.turn === 'A' ? strategyA : strategyB;
    var move = AI.chooseMove(strategy, state, rng);
    state = Game.applyMove(state, move);
    turns++;
    if (turns > maxTurns) {
      throw new Error('ゲームが' + maxTurns + '手を超えても終了しません(無限ループの疑い) seed=' + seed);
    }
  }
  return { turns: turns, result: state.result };
}

function runBatch(n, strategyA, strategyB, baseSeed) {
  var wins = { A: 0, B: 0, draw: 0 };
  var totalTurns = 0;
  var maxTurns = 0;
  var minTurns = Infinity;

  for (var i = 0; i < n; i++) {
    var seed = baseSeed + i * 7919; // 素数刻みでシードを分散
    var res = runOneGame(strategyA, strategyB, seed);
    wins[res.result.winner]++;
    totalTurns += res.turns;
    if (res.turns > maxTurns) maxTurns = res.turns;
    if (res.turns < minTurns) minTurns = res.turns;
  }

  return {
    n: n,
    strategyA: strategyA,
    strategyB: strategyB,
    winRateA: wins.A / n,
    winRateB: wins.B / n,
    drawRate: wins.draw / n,
    avgTurns: totalTurns / n,
    maxTurns: maxTurns,
    minTurns: minTurns
  };
}

function printReport(r) {
  console.log('--- ' + r.strategyA + '(A/先手) vs ' + r.strategyB + '(B/後手)  試行回数=' + r.n + ' ---');
  console.log('  先手(A)勝率: ' + (r.winRateA * 100).toFixed(1) + '%');
  console.log('  後手(B)勝率: ' + (r.winRateB * 100).toFixed(1) + '%');
  console.log('  引き分け率: ' + (r.drawRate * 100).toFixed(1) + '%');
  console.log('  平均ターン数: ' + r.avgTurns.toFixed(1) + ' (最短' + r.minTurns + ' / 最長' + r.maxTurns + ')');
  console.log('');
}

function main() {
  var argv = process.argv.slice(2);
  var n = parseInt(argv[0], 10) || 1000;
  var stratA = argv[1] || null;
  var stratB = argv[2] || null;

  if (stratA && stratB) {
    printReport(runBatch(n, stratA, stratB, 1));
    return;
  }

  console.log('カラーフィールド バランス検証シミュレーション (試行回数=' + n + ')\n');
  printReport(runBatch(n, 'random', 'random', 1000));
  printReport(runBatch(n, 'greedy', 'greedy', 2000));
  printReport(runBatch(n, 'greedy', 'random', 3000));
  printReport(runBatch(n, 'random', 'greedy', 4000));
}

main();
