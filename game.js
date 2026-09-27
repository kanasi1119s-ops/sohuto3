/*
 * テンライン（陣取りナンバーズ） ゲームロジック
 * 純粋関数のみで構成。ブラウザ(<script>タグ, グローバル TenLine)とNode(require)の両方で動く。
 * ルールの正本は docs/rules.md。実装との齟齬があれば docs/rules.md を正とする。
 */
(function (root) {
  "use strict";

  var BOARD_SIZE = 4;
  var CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
  var HAND_VALUES = [1, 2, 3, 4, 5, 6, 7, 8];

  // 10本のライン定義: 4行 + 4列 + 2斜め（セルindexは行優先 row*4+col）
  var LINES = (function () {
    var lines = [];
    for (var r = 0; r < BOARD_SIZE; r++) {
      var row = [];
      for (var c = 0; c < BOARD_SIZE; c++) row.push(r * BOARD_SIZE + c);
      lines.push(row);
    }
    for (var c2 = 0; c2 < BOARD_SIZE; c2++) {
      var col = [];
      for (var r2 = 0; r2 < BOARD_SIZE; r2++) col.push(r2 * BOARD_SIZE + c2);
      lines.push(col);
    }
    var diag1 = [];
    var diag2 = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      diag1.push(i * BOARD_SIZE + i);
      diag2.push(i * BOARD_SIZE + (BOARD_SIZE - 1 - i));
    }
    lines.push(diag1);
    lines.push(diag2);
    return lines;
  })();

  function otherPlayer(p) {
    return p === "A" ? "B" : "A";
  }

  function createInitialState() {
    return {
      board: new Array(CELL_COUNT).fill(null), // null | {player: 'A'|'B', value: number}
      hands: { A: HAND_VALUES.slice(), B: HAND_VALUES.slice() },
      current: "A",
      turn: 0,
      finished: false,
    };
  }

  function isTerminal(state) {
    return state.hands.A.length === 0 && state.hands.B.length === 0;
  }

  function legalMoves(state) {
    if (isTerminal(state)) return [];
    var moves = [];
    var hand = state.hands[state.current];
    for (var t = 0; t < hand.length; t++) {
      for (var cell = 0; cell < CELL_COUNT; cell++) {
        if (state.board[cell] === null) {
          moves.push({ tile: hand[t], cell: cell });
        }
      }
    }
    return moves;
  }

  function isLegalMove(state, move) {
    if (isTerminal(state)) return false;
    if (move.cell < 0 || move.cell >= CELL_COUNT) return false;
    if (state.board[move.cell] !== null) return false;
    var hand = state.hands[state.current];
    return hand.indexOf(move.tile) !== -1;
  }

  // 状態を変更せず、新しい状態を返す。不正な手には例外を投げる。
  function applyMove(state, move) {
    if (!isLegalMove(state, move)) {
      throw new Error(
        "不正な手です: tile=" + move.tile + " cell=" + move.cell
      );
    }
    var player = state.current;
    var newBoard = state.board.slice();
    newBoard[move.cell] = { player: player, value: move.tile };

    var newHand = state.hands[player].filter(function (v) {
      return v !== move.tile;
    });
    var newHands = {
      A: player === "A" ? newHand : state.hands.A.slice(),
      B: player === "B" ? newHand : state.hands.B.slice(),
    };

    var nextState = {
      board: newBoard,
      hands: newHands,
      current: otherPlayer(player),
      turn: state.turn + 1,
      finished: false,
    };
    nextState.finished = isTerminal(nextState);
    return nextState;
  }

  // 各ラインについて {A: 合計, B: 合計} を返す
  function lineSums(state) {
    return LINES.map(function (line) {
      var sums = { A: 0, B: 0 };
      line.forEach(function (cellIdx) {
        var cell = state.board[cellIdx];
        if (cell) sums[cell.player] += cell.value;
      });
      return sums;
    });
  }

  // ゲーム終了後のスコア判定。終了前でも「現時点の暫定評価」として呼べる（AI評価関数用）。
  function scoreState(state) {
    var sums = lineSums(state);
    var linePoints = { A: 0, B: 0 };
    var margin = { A: 0, B: 0 };
    var lineResults = sums.map(function (s) {
      margin.A += s.A - s.B;
      margin.B += s.B - s.A;
      var winner = null;
      if (s.A > s.B) {
        linePoints.A += 1;
        winner = "A";
      } else if (s.B > s.A) {
        linePoints.B += 1;
        winner = "B";
      }
      return { sums: s, winner: winner };
    });

    var winner = null;
    if (isTerminal(state)) {
      if (linePoints.A !== linePoints.B) {
        winner = linePoints.A > linePoints.B ? "A" : "B";
      } else if (margin.A !== margin.B) {
        winner = margin.A > margin.B ? "A" : "B";
      } else {
        // 合計マージンも同じ場合: ラインを固定順（行1〜行4, 列1〜列4, 斜め1, 斜め2）で
        // 見ていき、最初に差がついたラインの優位者を勝者とする（ルールブック参照）。
        // 全ラインが完全に同値という極端なケースのみ、最終フォールバックとして後手Bを勝者とする。
        winner = "B";
        for (var i = 0; i < lineResults.length; i++) {
          var s = lineResults[i].sums;
          if (s.A !== s.B) {
            winner = s.A > s.B ? "A" : "B";
            break;
          }
        }
      }
    }

    return {
      lineResults: lineResults,
      linePoints: linePoints,
      margin: margin,
      winner: winner,
    };
  }

  // --- シード付き擬似乱数（再現可能なシミュレーション用） ---
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

  function pickRandom(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function randomAI(state, rng) {
    var moves = legalMoves(state);
    return pickRandom(rng, moves);
  }

  // 1手先読みの貪欲AI: 自分視点の (自分ラインマージン合計) を最大化する手を選ぶ
  function evaluateForPlayer(state, player) {
    var sums = lineSums(state);
    var total = 0;
    sums.forEach(function (s) {
      var mine = s[player];
      var theirs = s[otherPlayer(player)];
      total += mine - theirs;
    });
    return total;
  }

  function greedyAI(state, rng) {
    var moves = legalMoves(state);
    var player = state.current;
    var best = [];
    var bestScore = -Infinity;
    moves.forEach(function (move) {
      var next = applyMove(state, move);
      var score = evaluateForPlayer(next, player);
      if (score > bestScore) {
        bestScore = score;
        best = [move];
      } else if (score === bestScore) {
        best.push(move);
      }
    });
    return pickRandom(rng, best);
  }

  var AI = { random: randomAI, greedy: greedyAI };

  function playGame(aiA, aiB, seed) {
    var rng = mulberry32(seed);
    var state = createInitialState();
    var history = [state];
    while (!isTerminal(state)) {
      var ai = state.current === "A" ? aiA : aiB;
      var move = ai(state, rng);
      state = applyMove(state, move);
      history.push(state);
    }
    var result = scoreState(state);
    return { finalState: state, result: result, history: history };
  }

  var TenLine = {
    BOARD_SIZE: BOARD_SIZE,
    CELL_COUNT: CELL_COUNT,
    HAND_VALUES: HAND_VALUES,
    LINES: LINES,
    otherPlayer: otherPlayer,
    createInitialState: createInitialState,
    isTerminal: isTerminal,
    legalMoves: legalMoves,
    isLegalMove: isLegalMove,
    applyMove: applyMove,
    lineSums: lineSums,
    scoreState: scoreState,
    mulberry32: mulberry32,
    AI: AI,
    playGame: playGame,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TenLine;
  } else {
    root.TenLine = TenLine;
  }
})(typeof window !== "undefined" ? window : this);
