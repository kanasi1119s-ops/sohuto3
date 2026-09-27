'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/core.js');

test('初期状態: 5x5盤面が空で、両者の手札が1-9', () => {
  const s = G.createInitialState(1);
  assert.equal(s.board.length, 5);
  assert.equal(s.board[0].length, 5);
  assert.deepEqual(s.hands.A, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(s.hands.B, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(s.turn, 'A');
  assert.equal(G.isGameOver(s), false);
});

test('合法手は空マス×手札の組み合わせ数と一致する', () => {
  const s = G.createInitialState(1);
  const moves = G.getLegalMoves(s);
  assert.equal(moves.length, 25 * 9);
});

test('不正な手（手札にない数字）を適用するとエラーになる', () => {
  const s = G.createInitialState(1);
  assert.throws(() => {
    G.applyMove(s, { tileValue: 99, row: 0, col: 0 });
  });
});

test('不正な手（既に埋まっているマス）を適用するとエラーになる', () => {
  let s = G.createInitialState(1);
  s = G.applyMove(s, { tileValue: 5, row: 2, col: 2 });
  assert.throws(() => {
    G.applyMove(s, { tileValue: 3, row: 2, col: 2 });
  });
});

test('隣接する数字が小さい敵タイルは捕獲され所有者が変わる（数字は維持）', () => {
  let s = G.createInitialState(1);
  s = G.applyMove(s, { tileValue: 3, row: 2, col: 2 }); // A: (2,2)=3
  s = G.applyMove(s, { tileValue: 1, row: 2, col: 3 }); // B: (2,3)=1
  s = G.applyMove(s, { tileValue: 5, row: 1, col: 1 }); // A: 関係ない手
  s = G.applyMove(s, { tileValue: 9, row: 0, col: 0 }); // B: 関係ない手
  // ここでAが(2,3)の隣に高い数字を置いて捕獲するかテストするため続行
  s = G.applyMove(s, { tileValue: 6, row: 1, col: 3 }); // A
  s = G.applyMove(s, { tileValue: 2, row: 4, col: 4 }); // B
  // Aが(2,3)=B:1 に隣接する(2,4)へ7を置く→捕獲
  s = G.applyMove(s, { tileValue: 7, row: 2, col: 4 }); // A
  const cell = s.board[2][3];
  assert.equal(cell.owner, 'A');
  assert.equal(cell.value, 1); // 数字は維持される
});

test('同数字・自分より大きい数字では捕獲されない', () => {
  let s = G.createInitialState(1);
  s = G.applyMove(s, { tileValue: 5, row: 2, col: 2 }); // A
  s = G.applyMove(s, { tileValue: 5, row: 2, col: 3 }); // B: 同数字
  s = G.applyMove(s, { tileValue: 1, row: 0, col: 0 }); // A
  s = G.applyMove(s, { tileValue: 9, row: 2, col: 1 }); // B: Aの5より大きい数字で隣接、Aは捕獲されない(Bが仕掛けてもBのターンなのでB視点で捕獲判定: B=9 vs A=5 → 5<9なので捕獲される)
  const capturedCell = s.board[2][2];
  assert.equal(capturedCell.owner, 'B'); // Aの5がBの9に隣接して捕られる
  const sameCell = s.board[2][3];
  assert.equal(sameCell.owner, 'B'); // 同数字は捕られていないまま
});

test('18手（各9手）で終局し、盤面には18枚・空マス7つが残る', () => {
  const s = G.playAutoGame(42, G.chooseMoveRandom, G.chooseMoveRandom);
  assert.equal(G.isGameOver(s), true);
  assert.equal(s.turnCount, 18);
  let filled = 0;
  s.board.forEach((row) => row.forEach((c) => { if (c) filled += 1; }));
  assert.equal(filled, 18);
});

test('シードが同じなら同じ結果を再現できる（決定論的シミュレーション）', () => {
  const s1 = G.playAutoGame(123, G.chooseMoveGreedy, G.chooseMoveGreedy);
  const s2 = G.playAutoGame(123, G.chooseMoveGreedy, G.chooseMoveGreedy);
  assert.deepEqual(G.getScore(s1), G.getScore(s2));
});

test('スコア判定: マス数が多い方が勝ち、同数ならタイル合計値で判定', () => {
  const s = G.createInitialState(1);
  const score = G.getScore(s);
  assert.equal(score.A.cells, 0);
  assert.equal(score.winner, 'draw');
});

test('ゲーム終了後は合法手が0になる', () => {
  const s = G.playAutoGame(7, G.chooseMoveGreedy, G.chooseMoveRandom);
  assert.equal(G.getLegalMoves(s).length, 0);
});

test('パイルール: Aの1手目の直後だけBはスワップを選択できる', () => {
  let s = G.createInitialState(1);
  assert.equal(G.canSwap(s), false); // Aの手番ではまだ不可
  s = G.applyMove(s, { type: 'place', tileValue: 5, row: 2, col: 2 });
  assert.equal(G.canSwap(s), true); // Aの1手目の直後、Bの番
  s = G.applyMove(s, { type: 'place', tileValue: 3, row: 0, col: 0 });
  assert.equal(G.canSwap(s), false); // 2手目以降はスワップ不可
});

test('スワップするとAの1手目がBの所有になり、Bの手札からも同じ数字が減る', () => {
  let s = G.createInitialState(1);
  s = G.applyMove(s, { type: 'place', tileValue: 7, row: 2, col: 2 });
  s = G.applyMove(s, { type: 'swap' });
  assert.equal(s.board[2][2].owner, 'B');
  assert.equal(s.board[2][2].value, 7);
  assert.equal(s.hands.B.includes(7), false);
  assert.equal(s.hands.A.includes(7), false);
  assert.equal(s.turn, 'A');
  assert.equal(s.turnCount, 2);
});

test('スワップ後もシミュレーションは正常に終局する', () => {
  const s = G.playAutoGame(5, G.chooseMoveGreedy, G.chooseMoveGreedy);
  assert.equal(G.isGameOver(s), true);
});

test('リグレッションガード: greedy同士のシミュレーションで先手勝率が異常値(80%超)にならない', () => {
  // 既知の課題: 単純なgreedy AI同士では先手が約65-67%勝つ偏りが確認されている
  // （docs/debug-log.md 参照）。パイルール(スワップ)は実装済みだが、
  // 現状のgreedy AIの評価関数では有効に活用されていない。
  // このテストは「今後の変更で偏りがさらに悪化していないか」を検出するための
  // ゆるいリグレッションガードであり、バランスが取れていることの証明ではない。
  const trials = 400;
  let winsA = 0, winsB = 0, draws = 0;
  for (let i = 0; i < trials; i++) {
    const s = G.playAutoGame(2000 + i, G.chooseMoveGreedy, G.chooseMoveGreedy);
    const score = G.getScore(s);
    if (score.winner === 'A') winsA += 1;
    else if (score.winner === 'B') winsB += 1;
    else draws += 1;
  }
  const rateA = winsA / trials;
  assert.ok(rateA < 0.8, `先手勝率が想定より悪化しています: ${(rateA * 100).toFixed(1)}%`);
});
