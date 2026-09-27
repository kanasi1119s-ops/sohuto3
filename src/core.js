/**
 * ナインテリトリー (Nine Territory) - コアゲームロジック
 * UI/フレームワークに依存しない純粋関数群。ブラウザの <script> タグ経由でも
 * Node.js の require() 経由でも同じコードが動くように UMD 形式で公開する。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NineTerritory = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BOARD_SIZE = 5;
  var HAND_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var PLAYERS = ['A', 'B'];

  // --- 乱数（シード指定可能。バグ再現・シミュレーション用） ---
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createInitialState(seed) {
    var board = [];
    for (var r = 0; r < BOARD_SIZE; r++) {
      var row = [];
      for (var c = 0; c < BOARD_SIZE; c++) {
        row.push(null); // null = 空マス。それ以外は {owner: 'A'|'B', value: 1-9}
      }
      board.push(row);
    }
    return {
      board: board,
      hands: { A: HAND_VALUES.slice(), B: HAND_VALUES.slice() },
      turn: 'A', // 先手A・後手Bの交互手番
      turnCount: 0,
      seed: seed == null ? 1 : seed,
      log: []
    };
  }

  function cloneState(state) {
    return {
      board: state.board.map(function (row) {
        return row.map(function (cell) {
          return cell ? { owner: cell.owner, value: cell.value } : null;
        });
      }),
      hands: { A: state.hands.A.slice(), B: state.hands.B.slice() },
      turn: state.turn,
      turnCount: state.turnCount,
      seed: state.seed,
      log: state.log.slice()
    };
  }

  function otherPlayer(p) {
    return p === 'A' ? 'B' : 'A';
  }

  function isGameOver(state) {
    return state.hands.A.length === 0 && state.hands.B.length === 0;
  }

  // パイルール（スワップ）: 先手Aの初手が強すぎる場合、後手Bはその1手目を
  // 「自分が置いたもの」として奪うことができる。これにより先手は初手を
  // 強くしすぎると奪われ、弱くしすぎても意味がないという緊張が生まれ、
  // 先手有利を自然に緩和する（Hexなどで使われる標準的な手法）。
  function canSwap(state) {
    return state.turnCount === 1 && state.turn === 'B';
  }

  // 現在の手番プレイヤーが選べる合法手の一覧（タイル×空マスの全組み合わせ）。
  // Bの2手目（turnCount===1）に限り、スワップという特別な手も選択できる。
  function getLegalMoves(state) {
    if (isGameOver(state)) return [];
    var moves = [];
    var hand = state.hands[state.turn];
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c] === null) {
          for (var i = 0; i < hand.length; i++) {
            moves.push({ type: 'place', tileValue: hand[i], row: r, col: c });
          }
        }
      }
    }
    if (canSwap(state)) {
      moves.push({ type: 'swap' });
    }
    return moves;
  }

  function neighbors(r, c) {
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ].filter(function (rc) {
      return rc[0] >= 0 && rc[0] < BOARD_SIZE && rc[1] >= 0 && rc[1] < BOARD_SIZE;
    });
  }

  /**
   * 手を適用し、新しい状態を返す（不変データ・破壊的変更なし）。
   * 置いたタイルの数字より「厳密に小さい」数字を持つ隣接する敵タイルは
   * 自分の色に反転（オーナーのみ変更、数字は維持）される。連鎖はしない。
   */
  function applyMove(state, move) {
    if (move && move.type === 'swap') {
      if (!canSwap(state)) {
        throw new Error('今はスワップできません');
      }
      var swapNext = cloneState(state);
      // 直前（Aの1手目）に置かれたマスを探す
      var lastLog = swapNext.log[swapNext.log.length - 1];
      var target = swapNext.board[lastLog.row][lastLog.col];
      target.owner = 'B';
      var bHandIdx = swapNext.hands.B.indexOf(target.value);
      swapNext.hands.B.splice(bHandIdx, 1);
      swapNext.log.push({ player: 'B', swap: true, row: lastLog.row, col: lastLog.col, tileValue: target.value, captured: [] });
      swapNext.turnCount += 1;
      swapNext.turn = 'A';
      return swapNext;
    }

    var legal = getLegalMoves(state);
    var ok = legal.some(function (m) {
      return m.type === 'place' && m.tileValue === move.tileValue && m.row === move.row && m.col === move.col;
    });
    if (!ok) {
      throw new Error('不正な手です: ' + JSON.stringify(move));
    }
    var next = cloneState(state);
    var player = next.turn;
    var opponent = otherPlayer(player);

    // 手札からタイルを除去
    var handIdx = next.hands[player].indexOf(move.tileValue);
    next.hands[player].splice(handIdx, 1);

    // 配置
    next.board[move.row][move.col] = { owner: player, value: move.tileValue };

    // 捕獲判定
    var captured = [];
    neighbors(move.row, move.col).forEach(function (rc) {
      var cell = next.board[rc[0]][rc[1]];
      if (cell && cell.owner === opponent && cell.value < move.tileValue) {
        cell.owner = player;
        captured.push({ row: rc[0], col: rc[1], value: cell.value });
      }
    });

    next.log.push({
      player: player,
      tileValue: move.tileValue,
      row: move.row,
      col: move.col,
      captured: captured
    });

    next.turnCount += 1;
    next.turn = opponent;
    return next;
  }

  function getScore(state) {
    var result = {
      A: { cells: 0, sum: 0 },
      B: { cells: 0, sum: 0 }
    };
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        var cell = state.board[r][c];
        if (cell) {
          result[cell.owner].cells += 1;
          result[cell.owner].sum += cell.value;
        }
      }
    }
    var winner = null;
    if (result.A.cells !== result.B.cells) {
      winner = result.A.cells > result.B.cells ? 'A' : 'B';
    } else if (result.A.sum !== result.B.sum) {
      winner = result.A.sum > result.B.sum ? 'A' : 'B';
    } else {
      winner = 'draw';
    }
    return { A: result.A, B: result.B, winner: winner };
  }

  function centerBonus(r, c) {
    var mid = (BOARD_SIZE - 1) / 2;
    var dist = Math.abs(r - mid) + Math.abs(c - mid);
    return (4 - dist); // 中央ほど高い
  }

  // スワップした場合、相手の1手目を自分のものとして得られる価値を概算する
  function evaluateSwap(state) {
    var lastLog = state.log[state.log.length - 1];
    return centerBonus(lastLog.row, lastLog.col) * 0.5 + lastLog.tileValue * 0.6;
  }

  function evaluateMove(state, move) {
    var player = state.turn;
    var opponent = otherPlayer(player);
    var score = 0;
    neighbors(move.row, move.col).forEach(function (rc) {
      var cell = state.board[rc[0]][rc[1]];
      if (cell && cell.owner === opponent && cell.value < move.tileValue) {
        score += 10 + cell.value * 3; // 捕獲は高評価。捕るタイルの価値が高いほど良い
      }
      if (cell && cell.owner === player) {
        score += 1; // 自陣を隣接させて塊を作る
      }
    });
    // 自分より高い数字の敵タイルに隣接して置くと将来捕られやすいので減点
    neighbors(move.row, move.col).forEach(function (rc) {
      var cell = state.board[rc[0]][rc[1]];
      if (cell && cell.owner === opponent && cell.value > move.tileValue) {
        score -= 4;
      }
    });
    score += centerBonus(move.row, move.col) * 0.5;
    score -= move.tileValue * 0.15; // 高いタイルは温存気味に
    return score;
  }

  function chooseMoveRandom(state, rng) {
    var moves = getLegalMoves(state);
    if (moves.length === 0) return null;
    var idx = Math.floor(rng() * moves.length);
    return moves[idx];
  }

  function chooseMoveGreedy(state, rng) {
    var moves = getLegalMoves(state);
    if (moves.length === 0) return null;
    var bestScore = -Infinity;
    var candidates = [];
    moves.forEach(function (m) {
      var s = m.type === 'swap' ? evaluateSwap(state) : evaluateMove(state, m);
      if (s > bestScore) {
        bestScore = s;
        candidates = [m];
      } else if (s === bestScore) {
        candidates.push(m);
      }
    });
    var idx = Math.floor(rng() * candidates.length);
    return candidates[idx];
  }

  function playAutoGame(seedA, aiA, aiB) {
    var rng = mulberry32(seedA);
    var state = createInitialState(seedA);
    var chooser = { A: aiA, B: aiB };
    var guard = 0;
    while (!isGameOver(state) && guard < 100) {
      var move = chooser[state.turn](state, rng);
      if (!move) break;
      state = applyMove(state, move);
      guard += 1;
    }
    return state;
  }

  return {
    BOARD_SIZE: BOARD_SIZE,
    HAND_VALUES: HAND_VALUES,
    PLAYERS: PLAYERS,
    mulberry32: mulberry32,
    createInitialState: createInitialState,
    cloneState: cloneState,
    otherPlayer: otherPlayer,
    isGameOver: isGameOver,
    getLegalMoves: getLegalMoves,
    canSwap: canSwap,
    applyMove: applyMove,
    getScore: getScore,
    evaluateMove: evaluateMove,
    evaluateSwap: evaluateSwap,
    chooseMoveRandom: chooseMoveRandom,
    chooseMoveGreedy: chooseMoveGreedy,
    playAutoGame: playAutoGame
  };
});
