/**
 * ナインテリトリー - 画面描画とイベント処理（DOM操作のみ。ゲームロジックは
 * src/core.js の NineTerritory に委譲する）。
 */
(function () {
  'use strict';
  var G = window.NineTerritory;

  var COLOR_NAME = { A: '青（先手）', B: '赤（後手）' };
  var COLOR_CLASS = { A: 'p-a', B: 'p-b' };

  var state = null;
  var rng = null;
  var selectedTile = null;
  var mode = 'pvp'; // 'pvp' = 人間 vs 人間, 'pve' = 人間 vs AI
  var aiLevel = 'greedy';
  var aiSide = 'B';

  var el = {};

  function qs(id) {
    return document.getElementById(id);
  }

  function init() {
    el.board = qs('board');
    el.handA = qs('hand-a');
    el.handB = qs('hand-b');
    el.turnLabel = qs('turn-label');
    el.scoreA = qs('score-a');
    el.scoreB = qs('score-b');
    el.swapBtn = qs('swap-btn');
    el.resetBtn = qs('reset-btn');
    el.rulesBtn = qs('rules-btn');
    el.rulesModal = qs('rules-modal');
    el.rulesClose = qs('rules-close');
    el.resultPanel = qs('result-panel');
    el.resultText = qs('result-text');
    el.playAgainBtn = qs('play-again-btn');
    el.modeSelect = qs('mode-select');
    el.aiLevelSelect = qs('ai-level-select');
    el.log = qs('move-log');

    el.resetBtn.addEventListener('click', startNewGame);
    el.playAgainBtn.addEventListener('click', startNewGame);
    el.rulesBtn.addEventListener('click', function () {
      el.rulesModal.classList.add('open');
    });
    el.rulesClose.addEventListener('click', function () {
      el.rulesModal.classList.remove('open');
    });
    el.swapBtn.addEventListener('click', doSwap);
    el.modeSelect.addEventListener('change', function () {
      mode = el.modeSelect.value;
      startNewGame();
    });
    el.aiLevelSelect.addEventListener('change', function () {
      aiLevel = el.aiLevelSelect.value;
      startNewGame();
    });

    startNewGame();
  }

  function startNewGame() {
    var seed = Date.now() % 1000000;
    state = G.createInitialState(seed);
    rng = G.mulberry32(seed + 1);
    selectedTile = null;
    el.resultPanel.classList.remove('open');
    el.log.innerHTML = '';
    render();
    maybeRunAiTurn();
  }

  function currentAiThinks() {
    return mode === 'pve' && state.turn === aiSide && !G.isGameOver(state);
  }

  function maybeRunAiTurn() {
    if (!currentAiThinks()) return;
    setTimeout(function () {
      var chooser = aiLevel === 'random' ? G.chooseMoveRandom : G.chooseMoveGreedy;
      var move = chooser(state, rng);
      if (move) {
        applyLoggedMove(move);
      }
      render();
      maybeRunAiTurn();
    }, 350);
  }

  function applyLoggedMove(move) {
    var player = state.turn;
    state = G.applyMove(state, move);
    var entry = state.log[state.log.length - 1];
    var line = document.createElement('div');
    if (entry.swap) {
      line.textContent = COLOR_NAME[player] + ': スワップ！(' + (entry.row + 1) + ',' + (entry.col + 1) + ')のタイルを奪った';
    } else {
      var capTxt = entry.captured.length
        ? '（' + entry.captured.map(function (c) { return c.value; }).join(',') + ' を捕獲）'
        : '';
      line.textContent = COLOR_NAME[player] + ': ' + entry.tileValue + ' を (' + (entry.row + 1) + ',' + (entry.col + 1) + ') に配置 ' + capTxt;
    }
    el.log.appendChild(line);
    el.log.scrollTop = el.log.scrollHeight;
  }

  function onCellClick(r, c) {
    if (G.isGameOver(state)) return;
    if (currentAiThinks()) return;
    if (state.board[r][c] !== null) return;
    if (selectedTile === null) return;
    var move = { type: 'place', tileValue: selectedTile, row: r, col: c };
    var legal = G.getLegalMoves(state).some(function (m) {
      return m.type === 'place' && m.tileValue === move.tileValue && m.row === r && m.col === c;
    });
    if (!legal) return;
    applyLoggedMove(move);
    selectedTile = null;
    render();
    maybeRunAiTurn();
  }

  function onTileClick(player, value) {
    if (G.isGameOver(state)) return;
    if (currentAiThinks()) return;
    if (state.turn !== player) return;
    selectedTile = selectedTile === value ? null : value;
    render();
  }

  function doSwap() {
    if (!G.canSwap(state)) return;
    if (currentAiThinks()) return;
    applyLoggedMove({ type: 'swap' });
    render();
    maybeRunAiTurn();
  }

  function render() {
    renderBoard();
    renderHand('A', el.handA);
    renderHand('B', el.handB);
    renderStatus();
  }

  function renderBoard() {
    el.board.innerHTML = '';
    for (var r = 0; r < G.BOARD_SIZE; r++) {
      for (var c = 0; c < G.BOARD_SIZE; c++) {
        (function (r, c) {
          var cell = state.board[r][c];
          var div = document.createElement('button');
          div.className = 'cell' + (cell ? ' ' + COLOR_CLASS[cell.owner] : ' empty');
          div.type = 'button';
          div.setAttribute('aria-label', (r + 1) + '行' + (c + 1) + '列');
          if (cell) {
            div.textContent = cell.value;
          } else if (selectedTile !== null) {
            div.classList.add('placeable');
          }
          div.addEventListener('click', function () {
            onCellClick(r, c);
          });
          el.board.appendChild(div);
        })(r, c);
      }
    }
  }

  function renderHand(player, container) {
    container.innerHTML = '';
    state.hands[player].forEach(function (value) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile ' + COLOR_CLASS[player];
      btn.textContent = value;
      if (selectedTile === value && state.turn === player) {
        btn.classList.add('selected');
      }
      var disabled = state.turn !== player || G.isGameOver(state) || currentAiThinks();
      btn.disabled = disabled;
      btn.addEventListener('click', function () {
        onTileClick(player, value);
      });
      container.appendChild(btn);
    });
  }

  function renderStatus() {
    var score = G.getScore(state);
    el.scoreA.textContent = score.A.cells + 'マス（合計値' + score.A.sum + '）';
    el.scoreB.textContent = score.B.cells + 'マス（合計値' + score.B.sum + '）';

    var over = G.isGameOver(state);
    if (over) {
      el.turnLabel.textContent = 'ゲーム終了';
      el.swapBtn.disabled = true;
      var msg;
      if (score.winner === 'draw') {
        msg = '引き分けです！';
      } else {
        msg = COLOR_NAME[score.winner] + ' の勝ちです！';
      }
      el.resultText.textContent = msg + '（青: ' + score.A.cells + 'マス / 赤: ' + score.B.cells + 'マス）';
      el.resultPanel.classList.add('open');
    } else {
      var thinking = currentAiThinks();
      el.turnLabel.textContent = (thinking ? 'AI(' + COLOR_NAME[state.turn] + ')が考え中…' : COLOR_NAME[state.turn] + ' の番です');
      el.swapBtn.disabled = !(G.canSwap(state) && !thinking);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
