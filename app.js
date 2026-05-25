const LETTERS = [
  "あ", "い", "う", "え",
  "か", "き", "く", "け",
  "さ", "し", "す", "せ",
  "た", "ち", "つ", "て",
  "な", "に", "ぬ", "ね"
];

const ALL_PAIRS = generatePairs(LETTERS);
const TOTAL = ALL_PAIRS.length;

const state = {
  currentPair: null,
  entriesMap: new Map(),
  activeTab: "main"
};

const el = {
  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".tab-panel"),
  unregisteredCounter: document.getElementById("unregistered-counter"),
  currentPair: document.getElementById("current-pair"),
  allDone: document.getElementById("all-done"),
  wordInput: document.getElementById("word-input"),
  registerBtn: document.getElementById("register-btn"),
  skipBtn: document.getElementById("skip-btn"),
  nextBtn: document.getElementById("next-btn"),
  statusMessage: document.getElementById("status-message"),
  searchInput: document.getElementById("search-input"),
  entriesList: document.getElementById("entries-list"),
  registeredCount: document.getElementById("registered-count"),
  remainingCount: document.getElementById("remaining-count"),
  completionRate: document.getElementById("completion-rate"),
  progressBar: document.getElementById("progress-bar"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),

  logoutBtn: document.getElementById("logout-btn"),
  syncBtn: document.getElementById("sync-btn"),
  authStatus: document.getElementById("auth-status"),
};

init();

async function init() {
  bindEvents();
  initializeMailOptButton();
  await initCloudAuth(handleAuthChanged);
  await loadEntries();
  pickNextUnregisteredPair();
  renderAll();
}

function bindEvents() {
  el.tabs.forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  el.registerBtn.addEventListener("click", registerCurrentPair);
  el.skipBtn.addEventListener("click", skipCurrentPair);
  el.nextBtn.addEventListener("click", pickNextUnregisteredPairAndRender);
  el.searchInput.addEventListener("input", renderEntriesList);
  el.exportBtn.addEventListener("click", exportJson);


  el.logoutBtn.addEventListener("click", logout);
  el.syncBtn.addEventListener("click", syncCloud);
  el.importFile.addEventListener("change", importJson);

  el.wordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") registerCurrentPair();
  });
}



function setTab(tabName) {
  state.activeTab = tabName;
  el.tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  el.panels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  if (tabName === "list") renderEntriesList();
  if (tabName === "stats") renderStats();
}

function generatePairs(chars) {
  const result = [];
  chars.forEach((a) => chars.forEach((b) => a !== b && result.push(`${a}${b}`)));
  return result;
}

async function loadEntries() {
  const all = await getAllEntries();
  state.entriesMap = new Map(all.map((row) => [row.pair, row]));
}

function getUnregisteredPairs() {
  return ALL_PAIRS.filter((pair) => !state.entriesMap.has(pair));
}

function pickNextUnregisteredPair() {
  const unregistered = getUnregisteredPairs();
  if (unregistered.length === 0) {
    state.currentPair = null;
    return;
  }
  const idx = Math.floor(Math.random() * unregistered.length);
  state.currentPair = unregistered[idx];
}

function pickNextUnregisteredPairAndRender() {
  pickNextUnregisteredPair();
  renderMain();
}

async function registerCurrentPair() {
  if (!state.currentPair) return;
  const word = el.wordInput.value.trim();
  if (!word) {
    setStatus("単語を入力してください。");
    return;
  }

  const payload = {
    pair: state.currentPair,
    word,
    createdAt: Date.now(),
    skipCount: state.entriesMap.get(state.currentPair)?.skipCount || 0,
    favorite: state.entriesMap.get(state.currentPair)?.favorite || false,
    memo: state.entriesMap.get(state.currentPair)?.memo || ""
  };

  await upsertEntry(payload);
  state.entriesMap.set(payload.pair, payload);

  el.wordInput.value = "";
  setStatus(`「${payload.pair} → ${payload.word}」を登録しました。`);
  pickNextUnregisteredPair();
  renderAll();
}

async function skipCurrentPair() {
  if (!state.currentPair) return;
  const existing = state.entriesMap.get(state.currentPair);

  if (existing) {
    existing.skipCount = (existing.skipCount || 0) + 1;
    await upsertEntry(existing);
    state.entriesMap.set(existing.pair, existing);
  }

  setStatus(`「${state.currentPair}」をスキップしました。`);
  pickNextUnregisteredPair();
  renderMain();
}

function renderAll() {
  renderMain();
  renderEntriesList();
  renderStats();
}

function renderMain() {
  const remaining = getUnregisteredPairs().length;
  el.unregisteredCounter.textContent = `${remaining} / ${TOTAL}`;

  if (!state.currentPair) {
    el.currentPair.textContent = "--";
    el.allDone.classList.remove("hidden");
    el.wordInput.disabled = true;
    el.registerBtn.disabled = true;
    el.skipBtn.disabled = true;
    el.nextBtn.disabled = true;
    return;
  }

  el.currentPair.textContent = state.currentPair;
  el.allDone.classList.add("hidden");
  el.wordInput.disabled = false;
  el.registerBtn.disabled = false;
  el.skipBtn.disabled = false;
  el.nextBtn.disabled = false;
}

function renderEntriesList() {
  const query = (el.searchInput.value || "").trim().toLowerCase();
  const entries = [...state.entriesMap.values()]
    .sort((a, b) => a.pair.localeCompare(b.pair, "ja"))
    .filter((row) => {
      if (!query) return true;
      return row.pair.includes(query) || row.word.toLowerCase().includes(query);
    });

  el.entriesList.innerHTML = "";
  if (entries.length === 0) {
    el.entriesList.innerHTML = "<li class='entry-item'>該当データがありません。</li>";
    return;
  }

  entries.forEach((row) => {
    const item = document.createElement("li");
    item.className = "entry-item";
    item.innerHTML = `
      <div class="entry-top">
        <span class="pair-badge">${row.pair}</span>
        <button class="small-btn danger" data-del="${row.pair}">削除</button>
      </div>
      <input class="entry-edit" data-edit="${row.pair}" value="${escapeHtml(row.word)}" />
    `;
    el.entriesList.appendChild(item);
  });

  el.entriesList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pair = btn.dataset.del;
      await deleteEntry(pair);
      state.entriesMap.delete(pair);
      if (!state.currentPair) pickNextUnregisteredPair();
      setStatus(`「${pair}」を削除しました。`);
      renderAll();
    });
  });

  el.entriesList.querySelectorAll("[data-edit]").forEach((input) => {
    input.addEventListener("change", async () => {
      const pair = input.dataset.edit;
      const text = input.value.trim();
      if (!text) {
        input.value = state.entriesMap.get(pair)?.word || "";
        return;
      }
      const base = state.entriesMap.get(pair);
      const updated = { ...base, word: text };
      await upsertEntry(updated);
      state.entriesMap.set(pair, updated);
      setStatus(`「${pair}」を更新しました。`);
      renderStats();
    });
  });
}

function renderStats() {
  const registered = state.entriesMap.size;
  const remaining = TOTAL - registered;
  const rate = Math.round((registered / TOTAL) * 100);

  el.registeredCount.textContent = String(registered);
  el.remainingCount.textContent = String(remaining);
  el.completionRate.textContent = `${rate}%`;
  el.progressBar.style.width = `${rate}%`;
}

function exportJson() {
  const rows = [...state.entriesMap.values()].sort((a, b) => a.pair.localeCompare(b.pair, "ja"));
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "letterpairs.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("JSONをエクスポートしました。");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error("invalid");

    for (const row of rows) {
      if (!row?.pair || !row?.word) continue;
      if (!ALL_PAIRS.includes(row.pair)) continue;
      const merged = {
        pair: row.pair,
        word: String(row.word),
        createdAt: row.createdAt || Date.now(),
        skipCount: Number(row.skipCount || 0),
        favorite: Boolean(row.favorite),
        memo: row.memo ? String(row.memo) : ""
      };
      await upsertEntry(merged);
      state.entriesMap.set(merged.pair, merged);
    }

    pickNextUnregisteredPair();
    renderAll();
    setStatus("JSONをインポートしてマージしました。");
  } catch {
    setStatus("JSONの読み込みに失敗しました。形式を確認してください。");
  } finally {
    event.target.value = "";
  }
}

function setStatus(message) {
  el.statusMessage.textContent = message;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


async function login(provider) {
  try {
    await loginWithProvider(provider);
  } catch (e) {
    setStatus(`ログイン失敗: ${e.message}`);
  }
}

function getAuthInput() {
  const email = (el.authEmail.value || "").trim();
  const password = el.authPassword.value || "";
  if (!email || !password) {
    setStatus("ID（メールアドレス）とパスワードを入力してください。");
    return null;
  }
  return { email, password };
}

async function signupWithIdPassword() {
  const input = getAuthInput();
  if (!input) return;
  try {
    await signupWithEmail(input.email, input.password);
    setStatus("ID/PWを登録しました。確認メールが有効な場合はメール確認後にログインしてください。");
  } catch (e) {
    setStatus(`ID/PW登録失敗: ${e.message}`);
  }
}

async function loginWithIdPassword() {
  const input = getAuthInput();
  if (!input) return;
  try {
    await loginWithEmail(input.email, input.password);
    setStatus("ID/PWでログインしました。");
  } catch (e) {
    setStatus(`ID/PWログイン失敗: ${e.message}`);
  }
}

async function logout() {
  try {
    await logoutCloud();
    setStatus("ログアウトしました。");
  } catch (e) {
    setStatus(`ログアウト失敗: ${e.message}`);
  }
}

async function handleAuthChanged(user, fallbackMessage) {
  if (!user) {
    el.authStatus.textContent = fallbackMessage || "未ログイン";
    return;
  }
  const label = user.email || user.user_metadata?.full_name || user.id;
  el.authStatus.textContent = `ログイン中: ${label}`;
  await loadMailOptFromCloud();
}

async function syncCloud() {
  if (!getCurrentUser()) {
    setStatus("先にログインしてください。");
    return;
  }

  try {
    const cloudRows = await pullCloudEntries();
    for (const row of cloudRows) {
      const local = state.entriesMap.get(row.pair);
      if (!local || (row.createdAt || 0) > (local.createdAt || 0)) {
        await upsertEntry(row);
        state.entriesMap.set(row.pair, row);
      }
    }

    await pushCloudEntries([...state.entriesMap.values()]);
    pickNextUnregisteredPair();
    renderAll();
    setStatus("クラウド同期が完了しました。（クラウド取り込み後、ローカル最新を再アップロード）");
  } catch (e) {
    setStatus(`同期失敗: ${e.message}`);
  }
}
