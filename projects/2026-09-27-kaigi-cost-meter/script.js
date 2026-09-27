(() => {
  const STORAGE_KEY = "kaigi-cost-meter:settings";

  const setupPanel = document.getElementById("setupPanel");
  const meterPanel = document.getElementById("meterPanel");
  const summaryPanel = document.getElementById("summaryPanel");

  const participantsInput = document.getElementById("participants");
  const salaryBandSelect = document.getElementById("salaryBand");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const resetBtn = document.getElementById("resetBtn");
  const copyBtn = document.getElementById("copyBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  const costDisplay = document.getElementById("costDisplay");
  const elapsedDisplay = document.getElementById("elapsedDisplay");
  const participantsDisplay = document.getElementById("participantsDisplay");
  const summaryList = document.getElementById("summaryList");
  const copyStatus = document.getElementById("copyStatus");

  const ANNUAL_WORK_HOURS = 1700; // 概算値。実際の労働時間とは異なる場合がある。

  let timerId = null;
  let startedAt = null;
  let elapsedSeconds = 0;
  let hourlyRatePerPerson = 0;
  let participants = 0;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.participants) participantsInput.value = saved.participants;
      if (saved.salaryBand) salaryBandSelect.value = saved.salaryBand;
    } catch (e) {
      // localStorageが使えない環境（プライベートモード等）では無視して初期値を使う
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          participants: participantsInput.value,
          salaryBand: salaryBandSelect.value,
        })
      );
    } catch (e) {
      // 保存できなくても機能自体は継続できるため無視する
    }
  }

  function formatYen(amount) {
    return "¥" + Math.round(amount).toLocaleString("ja-JP");
  }

  function formatElapsed(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function currentCost() {
    return participants * hourlyRatePerPerson * (elapsedSeconds / 3600);
  }

  function tick() {
    elapsedSeconds = (Date.now() - startedAt) / 1000;
    costDisplay.textContent = formatYen(currentCost());
    elapsedDisplay.textContent = formatElapsed(elapsedSeconds);
  }

  function startMeeting() {
    participants = Math.max(1, parseInt(participantsInput.value, 10) || 1);
    const annualSalary = parseInt(salaryBandSelect.value, 10);
    hourlyRatePerPerson = annualSalary / ANNUAL_WORK_HOURS;

    saveSettings();

    setupPanel.classList.add("hidden");
    summaryPanel.classList.add("hidden");
    meterPanel.classList.remove("hidden");

    participantsDisplay.textContent = `参加人数: ${participants}人`;
    startedAt = Date.now();
    elapsedSeconds = 0;
    tick();
    timerId = setInterval(tick, 250);
  }

  function stopMeeting() {
    clearInterval(timerId);
    timerId = null;

    const totalCost = currentCost();
    const perMinute = elapsedSeconds > 0 ? totalCost / (elapsedSeconds / 60) : 0;

    summaryList.innerHTML = "";
    const rows = [
      ["参加人数", `${participants}人`],
      ["会議時間", formatElapsed(elapsedSeconds)],
      ["合計コスト（概算）", formatYen(totalCost)],
      ["1分あたりのコスト（概算）", formatYen(perMinute)],
    ];
    for (const [label, value] of rows) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      summaryList.appendChild(li);
    }

    meterPanel.classList.add("hidden");
    summaryPanel.classList.remove("hidden");
    copyStatus.textContent = "";
  }

  function resetMeeting() {
    summaryPanel.classList.add("hidden");
    setupPanel.classList.remove("hidden");
  }

  async function copySummary() {
    const lines = Array.from(summaryList.querySelectorAll("li")).map(
      (li) => `${li.children[0].textContent}: ${li.children[1].textContent}`
    );
    const text = ["【会議コストメーター】", ...lines].join("\n");
    // クリップボード許可が得られない環境ではPromiseが解決も拒否もされず
    // ハングし続けることがあるため、タイムアウトで必ずユーザーに結果を返す。
    const timeout = (ms) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
    try {
      await Promise.race([navigator.clipboard.writeText(text), timeout(1500)]);
      copyStatus.textContent = "コピーしました。";
    } catch (e) {
      copyStatus.textContent = "コピーに失敗しました。手動で選択してください。";
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  startBtn.addEventListener("click", startMeeting);
  stopBtn.addEventListener("click", stopMeeting);
  resetBtn.addEventListener("click", resetMeeting);
  copyBtn.addEventListener("click", copySummary);
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  loadSettings();
})();
