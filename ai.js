/**
 * カラーフィールド (Color Field) - AI対戦相手 & シード付き乱数
 * ブラウザ/Node両対応のUMD形式。ロジックは game.js に依存する。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./game.js'));
  } else {
    root.ColorFieldAI = factory(root.ColorFieldGame);
  }
})(typeof self !== 'undefined' ? self : this, function (Game) {
  'use strict';

  // mulberry32: 高速・再現可能な擬似乱数生成器（バグ再現・シミュレーション用にシード指定可能）
  function createRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickRandom(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function randomAI(state, rng) {
    var moves = Game.getLegalMoves(state);
    return pickRandom(moves, rng);
  }

  function evaluateFor(state, player) {
    var opponent = player === 'A' ? 'B' : 'A';
    var myInfo = Game.largestComponentInfo(state, player);
    var oppInfo = Game.largestComponentInfo(state, opponent);
    return myInfo.largest - oppInfo.largest;
  }

  // 貪欲法(greedy)AI: 各候補手を1手先読みし、
  // 「自分の最大連結領域 - 相手の最大連結領域」を最大化する手を選ぶ。
  // 同点の場合はランダムに選択し、AIの手が単調にならないようにする。
  function greedyAI(state, rng) {
    var moves = Game.getLegalMoves(state);
    if (moves.length === 1) return moves[0];

    var player = state.turn;
    var best = [];
    var bestScore = -Infinity;

    moves.forEach(function (move) {
      var next = Game.applyMove(state, move);
      var score = evaluateFor(next, player);
      if (score > bestScore) {
        bestScore = score;
        best = [move];
      } else if (score === bestScore) {
        best.push(move);
      }
    });

    return pickRandom(best, rng);
  }

  var STRATEGIES = {
    random: randomAI,
    greedy: greedyAI
  };

  function chooseMove(strategyName, state, rng) {
    var fn = STRATEGIES[strategyName] || greedyAI;
    return fn(state, rng);
  }

  return {
    createRng: createRng,
    randomAI: randomAI,
    greedyAI: greedyAI,
    STRATEGIES: STRATEGIES,
    chooseMove: chooseMove
  };
});
