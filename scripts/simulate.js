/*
 * バランス検証用シミュレーションスクリプト。
 * 実行: node scripts/simulate.js [試行回数]
 * AIどうしを多数回対戦させ、先手/後手勝率・平均ターン数・偏りを集計する。
 */
var TenLine = require("../game.js");

var N = parseInt(process.argv[2], 10) || 2000;

var matchups = [
  ["random", "random"],
  ["greedy", "greedy"],
  ["greedy", "random"],
  ["random", "greedy"],
];

function runMatchup(aiAName, aiBName, n) {
  var aiA = TenLine.AI[aiAName];
  var aiB = TenLine.AI[aiBName];
  var winsA = 0;
  var winsB = 0;
  var turnCounts = [];
  var lineMarginTotal = 0;

  for (var i = 0; i < n; i++) {
    var seed = i * 7919 + 13; // 再現可能な決定的シード
    var game = TenLine.playGame(aiA, aiB, seed);
    if (game.result.winner === "A") winsA++;
    else winsB++;
    turnCounts.push(game.history.length - 1);
    lineMarginTotal += game.result.margin.A;
  }

  var avgTurns =
    turnCounts.reduce(function (a, b) {
      return a + b;
    }, 0) / turnCounts.length;
  var maxTurns = Math.max.apply(null, turnCounts);
  var minTurns = Math.min.apply(null, turnCounts);

  return {
    aiA: aiAName,
    aiB: aiBName,
    n: n,
    winsA: winsA,
    winsB: winsB,
    winRateA: winsA / n,
    winRateB: winsB / n,
    avgTurns: avgTurns,
    minTurns: minTurns,
    maxTurns: maxTurns,
    avgMarginA: lineMarginTotal / n,
  };
}

var results = matchups.map(function (m) {
  return runMatchup(m[0], m[1], N);
});

console.log("=== テンライン バランスシミュレーション ===");
console.log("試行回数（各対戦）: " + N + "\n");

var mdRows = [];
results.forEach(function (r) {
  console.log(
    "A=" +
      r.aiA +
      " vs B=" +
      r.aiB +
      "  | A勝率=" +
      (r.winRateA * 100).toFixed(1) +
      "%  B勝率=" +
      (r.winRateB * 100).toFixed(1) +
      "%  平均ターン=" +
      r.avgTurns.toFixed(2) +
      " (min " +
      r.minTurns +
      " / max " +
      r.maxTurns +
      ")  平均マージン(A)=" +
      r.avgMarginA.toFixed(2)
  );
  mdRows.push(
    "| " +
      r.aiA +
      " vs " +
      r.aiB +
      " | " +
      r.n +
      " | " +
      (r.winRateA * 100).toFixed(1) +
      "% | " +
      (r.winRateB * 100).toFixed(1) +
      "% | " +
      r.avgTurns.toFixed(2) +
      " | " +
      r.minTurns +
      " / " +
      r.maxTurns +
      " | " +
      r.avgMarginA.toFixed(2) +
      " |"
  );
});

var fs = require("fs");
var path = require("path");
var md =
  "# シミュレーション結果（バランス検証）\n\n" +
  "生成日: " +
  new Date().toISOString() +
  "\n\n" +
  "各マッチアップで " +
  N +
  " 回対戦（シード固定・再現可能）。\n\n" +
  "| 対戦 | 試行数 | A勝率 | B勝率 | 平均ターン数 | ターン数(min/max) | 平均マージン(A視点) |\n" +
  "|---|---|---|---|---|---|---|\n" +
  mdRows.join("\n") +
  "\n\n" +
  "## 読み取り\n\n" +
  "- ターン数は常に16固定（このゲームはタイル総数=マス数のため、盤面が必ずちょうど埋まるルール設計。ゲームが終わらない/手が詰まる不具合はない）。\n" +
  "- random vs random は先手/後手ともにおおむね互角になるはずで、著しい偏りがあれば `docs/rules.md` のタイブレーク設計を見直す。\n" +
  "- greedy vs greedy は同一AI同士のため、先手/後手の構造的な有利不利がより明確に出やすい。50%から離れるほど先手（or後手）優位が強いことを示す。\n" +
  "- greedy vs random / random vs greedy は「読みの深さ」の差が勝率にどの程度影響するかを示す（貪欲AIが人間の実力差の目安になる）。\n";

fs.writeFileSync(path.join(__dirname, "..", "docs", "simulation-results.md"), md);
console.log("\ndocs/simulation-results.md に結果を書き出しました。");
