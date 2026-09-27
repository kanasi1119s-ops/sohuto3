/*
 * テンライン UI層。game.js（TenLine）を利用してDOMを描画・操作する。
 * ビルド不要（<script>タグ読み込みのみ）で file:// でも動作するよう非モジュールで書く。
 */
(function () {
  "use strict";

  var TenLine = window.TenLine;
  var state = TenLine.createInitialState();
  var selectedTile = null; // 選択中の手札の数字
  var opponentMode = "human"; // 'human' | 'random' | 'greedy'
  var rng = TenLine.mulberry32(Date.now() % 2147483647);

  var boardEl = document.getElementById("board");
  var handAEl = document.getElementById("hand-A");
  var handBEl = document.getElementById("hand-B");
  var statusEl = document.getElementById("status");
  var resultEl = document.getElementById("result");
  var scoreTableWrap = document.getElementById("score-table-wrap");
  var newGameBtn = document.getElementById("new-game");
  var opponentSelect = document.getElementById("opponent-select");
  var rulesBtn = document.getElementById("rules-btn");
  var rulesDialog = document.getElementById("rules-dialog");
  var closeRulesBtn = document.getElementById("close-rules");

  function otherPlayer(p) {
    return TenLine.otherPlayer(p);
  }

  function isAIPlayer(player) {
    return player === "B" && opponentMode !== "human";
  }

  function render() {
    renderBoard();
    renderHand("A", handAEl);
    renderHand("B", handBEl);
    renderStatus();
    renderResult();
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    for (var i = 0; i < TenLine.CELL_COUNT; i++) {
      var cellData = state.board[i];
      var div = document.createElement("div");
      div.className = "cell";
      div.dataset.cell = String(i);
      if (cellData) {
        div.classList.add("filled-" + cellData.player);
        div.textContent = String(cellData.value);
      } else {
        div.classList.add("empty");
        if (
          !state.finished &&
          selectedTile !== null &&
          !isAIPlayer(state.current)
        ) {
          div.classList.add("selectable");
        }
        div.addEventListener("click", function () {
          onCellClick(Number(this.dataset.cell));
        });
      }
      boardEl.appendChild(div);
    }
  }

  function renderHand(player, container) {
    container.innerHTML = "";
    var hand = state.hands[player];
    TenLine.HAND_VALUES.forEach(function (v) {
      var used = hand.indexOf(v) === -1;
      var btn = document.createElement("button");
      btn.className = "tile owner-" + player;
      btn.textContent = String(v);
      btn.disabled =
        used ||
        state.finished ||
        state.current !== player ||
        isAIPlayer(player);
      if (
        !btn.disabled &&
        selectedTile === v &&
        state.current === player
      ) {
        btn.classList.add("selected");
      }
      btn.addEventListener("click", function () {
        onTileClick(player, v);
      });
      container.appendChild(btn);
    });
  }

  function renderStatus() {
    if (state.finished) {
      statusEl.textContent = "ゲーム終了";
      statusEl.className = "turn-indicator";
      return;
    }
    var label = state.current === "A" ? "プレイヤーA" : "プレイヤーB";
    if (isAIPlayer(state.current)) label += "（AI思考中…）";
    else label += "の番です";
    statusEl.textContent = label;
    statusEl.className = "turn-indicator player-" + state.current;
  }

  function renderResult() {
    if (!state.finished) {
      resultEl.style.display = "none";
      scoreTableWrap.innerHTML = "";
      return;
    }
    var result = TenLine.scoreState(state);
    resultEl.style.display = "block";
    resultEl.className = "result-banner win-" + result.winner;
    var winnerLabel = result.winner === "A" ? "プレイヤーA" : "プレイヤーB";
    resultEl.textContent =
      winnerLabel +
      " の勝利！（ライン " +
      result.linePoints.A +
      " - " +
      result.linePoints.B +
      "）";

    var rows = "";
    var lineNames = [
      "行1",
      "行2",
      "行3",
      "行4",
      "列1",
      "列2",
      "列3",
      "列4",
      "斜め1",
      "斜め2",
    ];
    result.lineResults.forEach(function (lr, idx) {
      var winnerText = lr.winner ? "プレイヤー" + lr.winner : "引き分け";
      rows +=
        "<tr><td>" +
        lineNames[idx] +
        "</td><td>" +
        lr.sums.A +
        "</td><td>" +
        lr.sums.B +
        "</td><td>" +
        winnerText +
        "</td></tr>";
    });
    scoreTableWrap.innerHTML =
      "<table class='score-table'><thead><tr><th>ライン</th><th>A合計</th><th>B合計</th><th>結果</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      "<p style='font-size:0.8rem;color:var(--color-text-dim);text-align:center;'>マージン合計: A " +
      result.margin.A +
      " / B " +
      result.margin.B +
      "</p>";
  }

  function onTileClick(player, value) {
    if (state.finished || state.current !== player || isAIPlayer(player))
      return;
    selectedTile = selectedTile === value ? null : value;
    render();
  }

  function onCellClick(cellIdx) {
    if (state.finished || isAIPlayer(state.current) || selectedTile === null)
      return;
    var move = { tile: selectedTile, cell: cellIdx };
    if (!TenLine.isLegalMove(state, move)) return;
    state = TenLine.applyMove(state, move);
    selectedTile = null;
    render();
    maybeRunAI();
  }

  function maybeRunAI() {
    if (state.finished) return;
    if (!isAIPlayer(state.current)) return;
    setTimeout(function () {
      var ai = TenLine.AI[opponentMode];
      var move = ai(state, rng);
      state = TenLine.applyMove(state, move);
      render();
      maybeRunAI();
    }, 300);
  }

  newGameBtn.addEventListener("click", function () {
    state = TenLine.createInitialState();
    selectedTile = null;
    render();
    maybeRunAI();
  });

  opponentSelect.addEventListener("change", function () {
    opponentMode = opponentSelect.value;
    state = TenLine.createInitialState();
    selectedTile = null;
    render();
    maybeRunAI();
  });

  rulesBtn.addEventListener("click", function () {
    rulesDialog.showModal();
  });
  closeRulesBtn.addEventListener("click", function () {
    rulesDialog.close();
  });

  render();
})();
