'use strict';
/**
 * data/game-config.json とゲームロジック(src/core.js)の定数がズレていないかを
 * 自動チェックする（コンポーネント定義とロジックを分離しつつ整合性を保証する）。
 */
const assert = require('node:assert/strict');
const config = require('../data/game-config.json');
const G = require('../src/core.js');

assert.equal(G.BOARD_SIZE, config.boardSize, 'boardSize が data/game-config.json と一致していません');
assert.deepEqual(G.HAND_VALUES, config.handValues, 'handValues が data/game-config.json と一致していません');
assert.deepEqual(G.PLAYERS, config.players, 'players が data/game-config.json と一致していません');

console.log('OK: data/game-config.json と src/core.js の整合性を確認しました');
