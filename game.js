/**
 * カラーフィールド (Color Field) - コアゲームロジック
 * ブラウザ(<script>グローバル)とNode.js(require)の両方で使えるUMD形式。
 * 状態は不変データとして扱い、applyMove は常に新しい状態を返す。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorFieldGame = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_CONFIG = {
    boardSize: 7,
    startZoneSize: 3,
    surgeTokens: { A: 3, B: 3 },
    players: {
      A: { id: 'A', name: 'アンバー', color: '#f5a623', label: '先手' },
      B: { id: 'B', name: 'アジュール', color: '#3a7bd5', label: '後手' }
    }
  };

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config || DEFAULT_CONFIG));
  }

  function otherPlayer(p) {
    return p === 'A' ? 'B' : 'A';
  }

  function idx(size, r, c) {
    return r * size + c;
  }

  function inBounds(size, r, c) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  function neighbors4(size, r, c) {
    var out = [];
    var deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < deltas.length; i++) {
      var nr = r + deltas[i][0];
      var nc = c + deltas[i][1];
      if (inBounds(size, nr, nc)) out.push([nr, nc]);
    }
    return out;
  }

  function createInitialState(config) {
    config = config || DEFAULT_CONFIG;
    var size = config.boardSize;
    var surgeConfig = config.surgeTokens || {
      A: config.surgeTokensPerPlayer,
      B: config.surgeTokensPerPlayer
    };
    return {
      config: cloneConfig(config),
      boardSize: size,
      cells: new Array(size * size).fill(null),
      turn: 'A',
      surge: { A: surgeConfig.A, B: surgeConfig.B },
      passStreak: 0,
      moveCount: 0,
      history: [],
      gameOver: false,
      result: null
    };
  }

  function startZoneCells(state, player) {
    var size = state.boardSize;
    var z = state.config.startZoneSize;
    var out = [];
    if (player === 'A') {
      for (var r = 0; r < z; r++) {
        for (var c = 0; c < z; c++) out.push([r, c]);
      }
    } else {
      for (var r2 = size - z; r2 < size; r2++) {
        for (var c2 = size - z; c2 < size; c2++) out.push([r2, c2]);
      }
    }
    return out;
  }

  function hasStarted(state, player) {
    for (var i = 0; i < state.cells.length; i++) {
      if (state.cells[i] === player) return true;
    }
    return false;
  }

  function normalMoveCells(state, player) {
    var size = state.boardSize;
    if (!hasStarted(state, player)) {
      return startZoneCells(state, player).filter(function (rc) {
        return state.cells[idx(size, rc[0], rc[1])] === null;
      });
    }
    var seen = {};
    var out = [];
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (state.cells[idx(size, r, c)] !== player) continue;
        var nbs = neighbors4(size, r, c);
        for (var i = 0; i < nbs.length; i++) {
          var nr = nbs[i][0], nc = nbs[i][1];
          var key = nr + ',' + nc;
          if (state.cells[idx(size, nr, nc)] === null && !seen[key]) {
            seen[key] = true;
            out.push([nr, nc]);
          }
        }
      }
    }
    return out;
  }

  function emptyCells(state) {
    var size = state.boardSize;
    var out = [];
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (state.cells[idx(size, r, c)] === null) out.push([r, c]);
      }
    }
    return out;
  }

  function getLegalMoves(state) {
    if (state.gameOver) return [];
    var player = state.turn;
    var normal = normalMoveCells(state, player);
    var normalSet = {};
    normal.forEach(function (rc) { normalSet[rc[0] + ',' + rc[1]] = true; });

    var moves = normal.map(function (rc) {
      return { type: 'place', r: rc[0], c: rc[1], surge: false };
    });

    if (state.surge[player] > 0) {
      var allEmpty = emptyCells(state);
      allEmpty.forEach(function (rc) {
        var key = rc[0] + ',' + rc[1];
        if (!normalSet[key]) {
          moves.push({ type: 'place', r: rc[0], c: rc[1], surge: true });
        }
      });
    }

    if (moves.length === 0) {
      moves.push({ type: 'pass' });
    }
    return moves;
  }

  function largestComponentInfo(state, player) {
    var size = state.boardSize;
    var visited = new Array(size * size).fill(false);
    var sizes = [];
    var total = 0;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        var i0 = idx(size, r, c);
        if (state.cells[i0] !== player || visited[i0]) continue;
        var queue = [[r, c]];
        visited[i0] = true;
        var count = 0;
        while (queue.length) {
          var cur = queue.pop();
          count++;
          total++;
          var nbs = neighbors4(size, cur[0], cur[1]);
          for (var k = 0; k < nbs.length; k++) {
            var nr = nbs[k][0], nc = nbs[k][1];
            var ni = idx(size, nr, nc);
            if (!visited[ni] && state.cells[ni] === player) {
              visited[ni] = true;
              queue.push([nr, nc]);
            }
          }
        }
        sizes.push(count);
      }
    }
    sizes.sort(function (a, b) { return b - a; });
    return {
      largest: sizes[0] || 0,
      secondLargest: sizes[1] || 0,
      total: total
    };
  }

  function computeResult(state) {
    var infoA = largestComponentInfo(state, 'A');
    var infoB = largestComponentInfo(state, 'B');
    var winner = null;
    if (infoA.largest !== infoB.largest) {
      winner = infoA.largest > infoB.largest ? 'A' : 'B';
    } else if (infoA.total !== infoB.total) {
      winner = infoA.total > infoB.total ? 'A' : 'B';
    } else if (infoA.secondLargest !== infoB.secondLargest) {
      winner = infoA.secondLargest > infoB.secondLargest ? 'A' : 'B';
    } else {
      winner = 'draw';
    }
    return { winner: winner, A: infoA, B: infoB };
  }

  function isBoardFull(state) {
    return emptyCells(state).length === 0;
  }

  function applyMove(state, move) {
    if (state.gameOver) {
      throw new Error('game already over');
    }
    var size = state.boardSize;
    var player = state.turn;
    var next = {
      config: state.config,
      boardSize: size,
      cells: state.cells.slice(),
      turn: otherPlayer(player),
      surge: { A: state.surge.A, B: state.surge.B },
      passStreak: state.passStreak,
      moveCount: state.moveCount + 1,
      history: state.history.concat([{ player: player, move: move }]),
      gameOver: false,
      result: null
    };

    if (move.type === 'pass') {
      var legal = getLegalMoves(state);
      var onlyPassAvailable = legal.length === 1 && legal[0].type === 'pass';
      if (!onlyPassAvailable) {
        throw new Error('illegal pass: legal placement moves exist');
      }
      next.passStreak = state.passStreak + 1;
    } else if (move.type === 'place') {
      if (!inBounds(size, move.r, move.c)) {
        throw new Error('out of bounds move');
      }
      var i = idx(size, move.r, move.c);
      if (state.cells[i] !== null) {
        throw new Error('cell occupied');
      }
      var legalMoves = getLegalMoves(state);
      var found = legalMoves.some(function (m) {
        return m.type === 'place' && m.r === move.r && m.c === move.c && !!m.surge === !!move.surge;
      });
      if (!found) {
        throw new Error('illegal move: ' + JSON.stringify(move));
      }
      next.cells[i] = player;
      next.passStreak = 0;
      if (move.surge) {
        next.surge[player] = state.surge[player] - 1;
      }
    } else {
      throw new Error('unknown move type');
    }

    if (isBoardFull(next) || next.passStreak >= 2) {
      next.gameOver = true;
      next.result = computeResult(next);
    }

    return next;
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    createInitialState: createInitialState,
    getLegalMoves: getLegalMoves,
    applyMove: applyMove,
    largestComponentInfo: largestComponentInfo,
    computeResult: computeResult,
    startZoneCells: startZoneCells,
    hasStarted: hasStarted,
    isBoardFull: isBoardFull,
    idx: idx
  };
});
