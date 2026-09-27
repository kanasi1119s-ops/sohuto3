(function () {
  'use strict';

  var Game = window.ColorFieldGame;
  var AI = window.ColorFieldAI;

  var els = {
    setupPanel: document.getElementById('setup-panel'),
    gamePanel: document.getElementById('game-panel'),
    modeSelect: document.getElementById('mode-select'),
    humanSideSelect: document.getElementById('human-side-select'),
    newGameBtn: document.getElementById('new-game-btn'),
    restartBtn: document.getElementById('restart-btn'),
    rulesBtn: document.getElementById('rules-btn'),
    rulesBtn2: document.getElementById('rules-btn-2'),
    rulesOverlay: document.getElementById('rules-overlay'),
    rulesModalBody: document.getElementById('rules-modal-body'),
    board: document.getElementById('board'),
    turnChip: document.getElementById('turn-chip'),
    turnDot: document.getElementById('turn-dot'),
    turnLabel: document.getElementById('turn-label'),
    surgeA: document.getElementById('surge-a'),
    surgeB: document.getElementById('surge-b'),
    passBtn: document.getElementById('pass-btn'),
    log: document.getElementById('log'),
    resultOverlay: document.getElementById('result-overlay'),
    resultTitle: document.getElementById('result-title'),
    scoreA: document.getElementById('score-a'),
    scoreB: document.getElementById('score-b'),
    resultDetail: document.getElementById('result-detail'),
    playAgainBtn: document.getElementById('play-again-btn'),
    closeResultBtn: document.getElementById('close-result-btn')
  };

  var config = Game.DEFAULT_CONFIG;
  var state = null;
  var mode = 'vsAiGreedy';
  var humanSide = 'A';
  var rng = AI.createRng(Date.now() % 2147483647);
  var legalMoves = [];
  var logLines = [];

  function playerMeta(id) {
    return config.players[id];
  }

  function isHumanTurn() {
    if (!state || state.gameOver) return false;
    if (mode === 'hotseat') return true;
    return state.turn === humanSide;
  }

  function addLog(text) {
    logLines.unshift(text);
    logLines = logLines.slice(0, 30);
    els.log.textContent = logLines.join(' / ');
  }

  function buildBoard() {
    els.board.innerHTML = '';
    els.board.style.gridTemplateColumns = 'repeat(' + state.boardSize + ', 1fr)';
    for (var r = 0; r < state.boardSize; r++) {
      for (var c = 0; c < state.boardSize; c++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell empty';
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        btn.setAttribute('aria-label', (r + 1) + '行' + (c + 1) + '列');
        btn.addEventListener('click', onCellClick);
        els.board.appendChild(btn);
      }
    }
  }

  function cellEl(r, c) {
    return els.board.children[r * state.boardSize + c];
  }

  function render() {
    var lastMove = state.history.length
      ? state.history[state.history.length - 1]
      : null;

    legalMoves = Game.getLegalMoves(state);
    var legalNormalSet = {};
    var legalSurgeSet = {};
    legalMoves.forEach(function (m) {
      if (m.type !== 'place') return;
      var key = m.r + ',' + m.c;
      if (m.surge) legalSurgeSet[key] = true; else legalNormalSet[key] = true;
    });

    var humanCanAct = isHumanTurn() && !state.gameOver;

    for (var r = 0; r < state.boardSize; r++) {
      for (var c = 0; c < state.boardSize; c++) {
        var owner = state.cells[Game.idx(state.boardSize, r, c)];
        var el = cellEl(r, c);
        var key = r + ',' + c;
        el.className = 'cell';
        el.classList.add(owner ? 'owner-' + owner : 'empty');

        if (humanCanAct && !owner) {
          if (legalNormalSet[key]) el.classList.add('legal');
          else if (legalSurgeSet[key]) el.classList.add('legal-surge');
        }

        if (lastMove && lastMove.move.type === 'place' &&
          lastMove.move.r === r && lastMove.move.c === c) {
          el.classList.add('last-move');
        }
      }
    }

    var turnMeta = playerMeta(state.turn);
    els.turnChip.className = 'turn-chip player-' + state.turn;
    els.turnDot.className = 'dot player-' + state.turn;
    els.turnLabel.textContent = state.gameOver
      ? 'ゲーム終了'
      : (turnMeta.name + '(' + turnMeta.label + ')の番' + (isHumanTurn() ? '' : ' - AI思考中…'));

    els.surgeA.textContent = 'サージ(先手): ' + state.surge.A;
    els.surgeB.textContent = 'サージ(後手): ' + state.surge.B;

    var onlyPass = legalMoves.length === 1 && legalMoves[0].type === 'pass';
    els.passBtn.disabled = !(humanCanAct && onlyPass);

    if (state.gameOver) {
      showResult();
    } else if (!isHumanTurn()) {
      window.setTimeout(runAiTurn, 450);
    }
  }

  function runAiTurn() {
    if (!state || state.gameOver || isHumanTurn()) return;
    var strategyName = mode === 'vsAiRandom' ? 'random' : 'greedy';
    var move = AI.chooseMove(strategyName, state, rng);
    applyMoveAndLog(move, playerMeta(state.turn).name + '(AI)');
  }

  function applyMoveAndLog(move, actorLabel) {
    var mover = state.turn;
    try {
      state = Game.applyMove(state, move);
    } catch (e) {
      addLog('エラー: ' + e.message);
      return;
    }
    if (move.type === 'pass') {
      addLog((actorLabel || playerMeta(mover).name) + 'はパスしました');
    } else {
      addLog((actorLabel || playerMeta(mover).name) + 'が (' +
        (move.r + 1) + ',' + (move.c + 1) + ') に配置' + (move.surge ? '(サージ)' : ''));
    }
    render();
  }

  function onCellClick(e) {
    if (!isHumanTurn() || state.gameOver) return;
    var r = parseInt(e.currentTarget.dataset.r, 10);
    var c = parseInt(e.currentTarget.dataset.c, 10);

    // マスごとに「通常配置」か「サージ配置」かは一意に決まるため、
    // クリックされた位置から合法手を直接特定する。
    var candidate = legalMoves.find(function (m) {
      return m.type === 'place' && m.r === r && m.c === c;
    });

    if (!candidate) {
      addLog('そこには置けません');
      return;
    }

    applyMoveAndLog(candidate, playerMeta(state.turn).name);
  }

  function showResult() {
    var result = state.result;
    els.scoreA.textContent = String(result.A.largest);
    els.scoreB.textContent = String(result.B.largest);
    var winnerText;
    if (result.winner === 'draw') {
      winnerText = '引き分けです。';
    } else {
      winnerText = playerMeta(result.winner).name + '(' + playerMeta(result.winner).label + ')の勝利です！';
    }
    els.resultTitle.textContent = 'ゲーム終了 - ' + winnerText;

    var detail = 'A: 最大かたまり' + result.A.largest + ' / 総数' + result.A.total +
      ' 　B: 最大かたまり' + result.B.largest + ' / 総数' + result.B.total;
    if (result.A.largest === result.B.largest) {
      detail += '（最大のかたまりが同数のため、総マス数で判定しました）';
    }
    els.resultDetail.textContent = detail;
    els.resultOverlay.hidden = false;
  }

  function startNewGame() {
    mode = els.modeSelect.value;
    humanSide = els.humanSideSelect.value;
    state = Game.createInitialState(config);
    rng = AI.createRng((Date.now() + Math.floor(Math.random() * 100000)) % 2147483647);
    logLines = [];
    els.log.textContent = '';
    els.resultOverlay.hidden = true;
    els.gamePanel.hidden = false;
    buildBoard();
    render();
  }

  function openRules() {
    els.rulesModalBody.innerHTML = window.COLOR_FIELD_RULES_HTML +
      '<div class="actions-row" style="margin-top:12px;"><button class="primary" id="rules-close-inner">閉じる</button></div>';
    document.getElementById('rules-close-inner').addEventListener('click', function () {
      els.rulesOverlay.hidden = true;
    });
    els.rulesOverlay.hidden = false;
  }

  function loadConfig() {
    // file:// で直接開いた場合はfetchがCORSで失敗するため、最初から埋め込みの
    // デフォルト設定を使う（サーバー経由で開いたときだけ data/config.json を読みに行く）
    if (window.location.protocol === 'file:') {
      return Promise.resolve(Game.DEFAULT_CONFIG);
    }
    return fetch('data/config.json')
      .then(function (res) { return res.json(); })
      .catch(function () { return Game.DEFAULT_CONFIG; });
  }

  els.newGameBtn.addEventListener('click', startNewGame);
  els.restartBtn.addEventListener('click', startNewGame);
  els.playAgainBtn.addEventListener('click', startNewGame);
  els.rulesBtn.addEventListener('click', openRules);
  els.rulesBtn2.addEventListener('click', openRules);
  els.closeResultBtn.addEventListener('click', function () { els.resultOverlay.hidden = true; });
  els.rulesOverlay.addEventListener('click', function (e) {
    if (e.target === els.rulesOverlay) els.rulesOverlay.hidden = true;
  });
  els.passBtn.addEventListener('click', function () {
    applyMoveAndLog({ type: 'pass' }, playerMeta(state.turn).name);
  });

  loadConfig().then(function (loaded) {
    config = loaded && loaded.players ? loaded : Game.DEFAULT_CONFIG;
  });
})();
