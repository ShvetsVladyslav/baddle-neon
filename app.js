// BADDLE — Neon Dark (Red Accent)
// Один “большой пак” (единый набор данных) без переключателя packs.
// Открой index.html — всё работает без сборки.

const MAX_ATTEMPTS = Number.POSITIVE_INFINITY;

// =====================
// DATA (единый набор)
// =====================

/**
 * Классические колонки (как ты описал)
 * type:
 * - exact   → зелёный если совпало, иначе красный
 * - ordered → зелёный если совпало, жёлтый если рядом по уровню, иначе красный
 */
const ATTRIBUTES = [
  { key: "name",        label: "Ник",         type: "nick" },

  // если значения нет — ставь "-"
  { key: "lolRole",     label: "Роль в LoL",  type: "enum", values: ["Топ","Лес","Мид","АДК","Саппорт","-"] },
  { key: "mainChamp",   label: "Основной чемпион",  type: "exact" },
  { key: "rank",        label: "Ранг",        type: "rank",
    order: ["Железо","Бронза","Серебро","Золото","Платина","Изумруд","Алмаз","Мастер","Грандмастер","Челленджер","-"],
    near: 1
  },
  { key: "serverRole",  label: "Роль на сервере", type: "enum",
    values: ["mommy","министр додепа","сучка","xdd","сладенькие","полусладенькие","без роли"]
  }
];

/**
 * Данные по умолчанию (используются, если data.json недоступен)
 */
const DEFAULT_DATA = {
  players: [
    {
      id: "u1",
      name: "это вино",
      aliases: ["это вино", "vin0", "vino"],
      avatar: "assets/profiles/placeholder-profile.jpg",
      lolRole: "Мид",
      mainChamp: "Мэл",
      rank: "Алмаз",
      serverRole: "mommy",
      emojis: ["🎮","🔥","🧃"]
    }
  ],
  clips: [
    {
      prompt: "Что произошло дальше?",
      mediaType: "video", // "video" | "image"
      src: "assets/clips/16-1_RU-549033542_01.webm",
      cutSeconds: 5
    }
  ]
};

let ROSTER = DEFAULT_DATA.players.slice();
let CLIPS = DEFAULT_DATA.clips.slice();
const CLIPS_CDN_BASE = "https://pub-cb0a978cc7d94413ab1f5b36f5acdc66.r2.dev";
let QUESTIONS = buildQuestions();

function buildQuestions(){
  const rosterCount = ROSTER.length;
  const classic = rosterCount
    ? Array.from({length: 200}, (_, i) => ({
        id: `c${i + 1}`,
        targetId: ROSTER[i % rosterCount].id
      }))
    : [];
  const emoji = rosterCount
    ? Array.from({length: 200}, (_, i) => ({
        id: `e${i + 1}`,
        targetId: ROSTER[i % rosterCount].id
      }))
    : [];
  const profile = rosterCount
    ? [{ id: "p1", targetId: ROSTER[0].id, image: ROSTER[0].avatar }]
    : [];
  const next = CLIPS.map((clip, i) => ({
    id: `n${i + 1}`,
    ...clip,
    src: resolveClipSrc(clip.src)
  }));
  return { classic, emoji, profile, next };
}

function applyData(data){
  ROSTER = Array.isArray(data?.players) ? data.players : [];
  CLIPS = Array.isArray(data?.clips) ? data.clips : [];
  QUESTIONS = buildQuestions();
  bag.classic = []; bag.emoji = []; bag.profile = []; bag.next = [];
  state.index = { classic: 0, emoji: 0, profile: 0, next: 0 };
}

function resolveClipSrc(src){
  const raw = String(src || "").trim();
  if(!raw) return raw;
  if(/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() || normalized;
  if(!fileName) return raw;
  const base = CLIPS_CDN_BASE.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(fileName)}`;
}

// ------------------ Utilities ------------------

function normalize(s){
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я _-]+/g, "")
    .replace(/\s+/g, " ");
}

function modeLabel(mode){
  switch(mode){
    case "classic": return "Классика";
    case "emoji": return "Эмодзи";
    case "profile": return "Размытие профиля";
    case "next": return "Что дальше?";
    default: return mode;
  }
}

function findUserByInput(input){
  const val = normalize(input);
  if(!val) return null;

  for(const u of ROSTER){
    if(normalize(u.name) === val) return u;
    const al = (u.aliases || []).map(normalize);
    if(al.includes(val)) return u;
  }
  return null;
}

function getUserById(id){
  return ROSTER.find(u => u.id === id) || null;
}

// ------------------ Random “bag” (no repeats until empty) ------------------

const bag = { classic: [], emoji: [], profile: [], next: [] };

function refillBag(mode){
  const len = QUESTIONS[mode].length;
  bag[mode] = Array.from({length: len}, (_, i) => i);
  for(let i=bag[mode].length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [bag[mode][i], bag[mode][j]] = [bag[mode][j], bag[mode][i]];
  }
}

function nextFromBag(mode){
  if(!bag[mode].length) refillBag(mode);
  return bag[mode].pop();
}

// ------------------ State ------------------

const state = {
  mode: "classic",
  index: { classic: 0, emoji: 0, profile: 0, next: 0 },
  attempts: 0,
  solved: false,
  selectedChoice: null,
  guessRows: [] // classic rows
};

// ------------------ DOM ------------------

const els = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  modeBadge: document.getElementById("modeBadge"),
  content: document.getElementById("content"),
  inputRow: document.getElementById("inputRow"),
  answerInput: document.getElementById("answerInput"),
  btnSubmit: document.getElementById("btnSubmit"),
  feedback: document.getElementById("feedback"),
  history: document.getElementById("history"),
  btnReset: document.getElementById("btnReset"),
  btnRandom: document.getElementById("btnRandom"),
  btnNewGame: document.getElementById("btnNewGame"),
  suggestions: document.getElementById("suggestions"),
};

// ------------------ Meta ------------------

function currentQuestion(){
  const i = state.index[state.mode] ?? 0;
  return QUESTIONS[state.mode][i];
}

function currentTargetUser(){
  const q = currentQuestion();
  if(!q) return null;
  if(state.mode === "classic" || state.mode === "emoji" || state.mode === "profile"){
    return getUserById(q.targetId);
  }
  return null;
}

function updateMeta(){
  const len = QUESTIONS[state.mode].length;
  const i = len ? (state.index[state.mode] ?? 0) + 1 : 0;
  if(els.modeBadge) els.modeBadge.textContent = modeLabel(state.mode);
}

// ------------------ UI helpers ------------------

function setFeedback(text, kind){
  els.feedback.textContent = text || "";
  els.feedback.classList.remove("ok","bad","warn");
  if(kind) els.feedback.classList.add(kind);
}

function escapeHtml(s){
  return (s ?? "")
    .toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ------------------ Autocomplete ------------------
const AUTOCOMPLETE_LIMIT = 8;
let activeSuggestionIndex = -1;

function isTextGuessMode(){
  return state.mode === "classic" || state.mode === "emoji" || state.mode === "profile";
}

function suggestionMeta(u){
  // подпись в выпадашке (можешь менять)
  const parts = [];
  if(u.lolRole && u.lolRole !== "-") parts.push(u.lolRole);
  if(u.rank && u.rank !== "-") parts.push(u.rank);
  if(u.serverRole) parts.push(u.serverRole);
  return parts.join(" • ");
}

function getSuggestions(query){
  const q = normalize(query);
  if(!q) return [];
  // Приоритет: начинается с… потом содержит
  const starts = [];
  const contains = [];
  for(const u of ROSTER){
    const name = normalize(u.name);
    const aliasHit = (u.aliases || []).some(a => normalize(a).startsWith(q));
    if(name.startsWith(q) || aliasHit){
      starts.push(u);
    }else{
      const aliasContains = (u.aliases || []).some(a => normalize(a).includes(q));
      if(name.includes(q) || aliasContains) contains.push(u);
    }
  }
  const res = [...starts, ...contains].slice(0, AUTOCOMPLETE_LIMIT);
  return res;
}

function hideSuggestions(){
  els.suggestions.classList.add("hidden");
  els.suggestions.innerHTML = "";
  activeSuggestionIndex = -1;
}

function showSuggestions(list){
  if(!isTextGuessMode()){
    hideSuggestions();
    return;
  }
  if(!list.length){
    hideSuggestions();
    return;
  }

  els.suggestions.innerHTML = "";
  list.forEach((u, idx) => {
    const item = document.createElement("div");
    item.className = "suggestion";
    item.setAttribute("role", "option");

    item.innerHTML = `
      <img src="${escapeHtml(u.avatar || "assets/profiles/placeholder-profile.jpg")}" alt="">
      <div>
        <div class="name">${escapeHtml(u.name)}</div>
        <div class="meta">${escapeHtml(suggestionMeta(u))}</div>
      </div>
    `;

    item.addEventListener("mousedown", (e) => {
      // mousedown чтобы не терять фокус до click
      e.preventDefault();
      applySuggestion(u);
    });

    els.suggestions.appendChild(item);
  });

  els.suggestions.classList.remove("hidden");
  activeSuggestionIndex = -1;
}

function applySuggestion(u){
  els.answerInput.value = u.name;
  hideSuggestions();
  els.answerInput.focus();
}

// keyboard navigation
function setActiveSuggestion(idx){
  const items = Array.from(els.suggestions.querySelectorAll(".suggestion"));
  items.forEach(x => x.classList.remove("active"));
  if(idx >= 0 && idx < items.length){
    items[idx].classList.add("active");
    activeSuggestionIndex = idx;
  }else{
    activeSuggestionIndex = -1;
  }
}

function pickActiveSuggestion(){
  const items = Array.from(els.suggestions.querySelectorAll(".suggestion"));
  if(activeSuggestionIndex < 0 || activeSuggestionIndex >= items.length) return false;
  const nameEl = items[activeSuggestionIndex].querySelector(".name");
  if(!nameEl) return false;
  els.answerInput.value = nameEl.textContent;
  hideSuggestions();
  return true;
}

function resetRound(){
  state.attempts = 0;
  state.solved = false;
  state.selectedChoice = null;
  state.guessRows = [];
  els.history.innerHTML = "";
  setFeedback("", null);
}

// ------------------ Render ------------------

function render(){
  hideSuggestions();
  updateMeta();
  const q = currentQuestion();

  if(state.mode === "next"){
    els.inputRow.classList.add("hidden");
  }else{
    els.inputRow.classList.remove("hidden");
  }

  els.answerInput.value = "";
  els.answerInput.placeholder = (state.mode === "classic" || state.mode === "emoji" || state.mode === "profile")
    ? "Введи ник участника..."
    : "";

  els.content.innerHTML = "";

  if(!q){
    els.content.innerHTML = `<div class="note">Нет вопросов для этого режима.</div>`;
    return;
  }

  if(state.mode === "classic") renderClassic(q);
  if(state.mode === "emoji") renderEmoji(q);
  if(state.mode === "profile") renderProfile(q);
  if(state.mode === "next"){
    renderWhatsNext(q);
    state.selectedChoice = null;
  }

  if(state.mode !== "next"){
    setTimeout(() => els.answerInput.focus(), 0);
  }

  updateMeta();
}

function renderClassic(q){
  const target = currentTargetUser();
  if(!target){
    els.content.innerHTML = `<div class="note">Нет targetId/участника в ROSTER.</div>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "classic-grid";
  wrap.style.setProperty("--cols", String(ATTRIBUTES.length));

  const head = document.createElement("div");
  head.className = "grid-head";

  const head0 = document.createElement("div");
  head0.className = "cell small";
  head0.textContent = " ";
  head.appendChild(head0);

  for(const a of ATTRIBUTES){
    const c = document.createElement("div");
    c.className = "cell";
    c.innerHTML = `<div>${escapeHtml(a.label)}</div>`;
    head.appendChild(c);
  }
  wrap.appendChild(head);

  if(state.guessRows.length === 0){
    const note = document.createElement("div");
    note.className = "hint";
    note.innerHTML = `<div class="label">Задача</div>
      <div class="value">Вводишь ник → появляется строка, цвета показывают насколько близко к правильному участнику.</div>`;
    wrap.appendChild(note);
  }

  for(const row of state.guessRows){
    const r = document.createElement("div");
    r.className = "grid-row";

    const imgCell = document.createElement("div");
    imgCell.className = "cell small";
    const img = document.createElement("img");
    img.className = "avatar";
    img.src = row.user.avatar || "assets/profiles/placeholder-profile.jpg";
    img.alt = row.user.name;
    imgCell.appendChild(img);
    r.appendChild(imgCell);

    for(const cell of row.cells){
      const c = document.createElement("div");
      c.className = `cell ${cell.color}`;
      c.textContent = cell.text;
      r.appendChild(c);
    }

    wrap.appendChild(r);
  }

  els.content.appendChild(wrap);
}

function renderEmoji(q){
  const target = currentTargetUser();
  if(!target){
    els.content.innerHTML = `<div class="note">Нет targetId/участника в ROSTER.</div>`;
    return;
  }

  const emojis = Array.isArray(target.emojis) ? target.emojis.slice(0,5) : [];
  const shown = state.solved
    ? (emojis.length || 5)
    : Math.min(1 + state.attempts, 5, emojis.length || 5);

  const box = document.createElement("div");
  box.className = "hint";
  box.innerHTML = `<div class="label">Режим</div>
                   <div class="value">1 эмодзи → с каждой попыткой открывается ещё (макс. 5).</div>`;

  const big = document.createElement("div");
  big.className = "big-emoji";
  const display = (emojis.length ? emojis.slice(0, shown) : ["❓","❓","❓","❓","❓"].slice(0, shown));
  big.textContent = display.join(" ");

  els.content.appendChild(box);
  els.content.appendChild(big);
}

function renderProfile(q){
  const target = currentTargetUser();
  if(!target){
    els.content.innerHTML = `<div class="note">Нет targetId/участника в ROSTER.</div>`;
    return;
  }

  const pw = document.createElement("div");
  pw.className = "profile-wrap";

  const img = document.createElement("img");
  img.className = "profile-img";
  img.alt = "Профиль (размыт)";
  img.src = q.image || target.avatar || "assets/profiles/placeholder-profile.jpg";

  const blur = state.solved ? 0 : Math.max(2, 18 - state.attempts * 3);
  img.style.filter = `blur(${blur}px) saturate(1.05) contrast(1.05)`;

  const right = document.createElement("div");
  right.className = "hints";
  const box = document.createElement("div");
  box.className = "hint";
  box.innerHTML = `<div class="label">Режим</div><div class="value">Угадай, чей профиль. Чем больше попыток — тем меньше размытие.</div>`;
  right.appendChild(box);

  pw.appendChild(img);
  pw.appendChild(right);
  els.content.appendChild(pw);
}

function renderWhatsNext(q){
  const wrap = document.createElement("div");
  wrap.className = "video-wrap";

  if(q.mediaType === "video"){
    const v = document.createElement("video");
    v.controls = true;
    v.src = q.src;
    v.preload = "metadata";

    const cut = typeof q.cutSeconds === "number" ? q.cutSeconds : 6;
    let enforceCut = false;
    const onTime = () => {
      if(enforceCut && v.currentTime >= cut){
        v.pause();
        v.removeEventListener("timeupdate", onTime);
        enforceCut = false;
      }
    };
    v.addEventListener("play", () => {
      if(enforceCut){
        v.addEventListener("timeupdate", onTime);
      }
    });

    wrap.appendChild(v);

    const actions = document.createElement("div");
    actions.className = "video-actions";

    const btnPlay = document.createElement("button");
    btnPlay.className = "btn";
    btnPlay.textContent = `▶ Показать начало (${cut}s)`;
    btnPlay.onclick = () => {
      enforceCut = true;
      v.currentTime = 0;
      v.play();
      v.addEventListener("timeupdate", onTime);
    };
    actions.appendChild(btnPlay);

    const prompt = document.createElement("div");
    prompt.className = "hint";
    prompt.innerHTML = `<div class="label">Вопрос</div><div class="value">${escapeHtml(q.prompt || "Что было дальше?")}</div>`;

    wrap.appendChild(actions);
    wrap.appendChild(prompt);
  }else{
    const img = document.createElement("img");
    img.className = "profile-img";
    img.src = q.src;
    img.alt = "Кадр";
    wrap.appendChild(img);

    const prompt = document.createElement("div");
    prompt.className = "hint";
    prompt.innerHTML = `<div class="label">Вопрос</div><div class="value">${escapeHtml(q.prompt || "Что было дальше?")}</div>`;
    wrap.appendChild(prompt);
  }

  els.content.appendChild(wrap);
}

// ------------------ Сравнение (зелёный/жёлтый/красный) ------------------

function compareValue(attr, guessVal, targetVal){
  const t = attr.type;

  const gvRaw = (guessVal ?? "-");
  const tvRaw = (targetVal ?? "-");

  // Ник — просто показывает имя, зелёный если угадал человека
  if(t === "nick"){
    return {
      color: gvRaw === tvRaw ? "green" : "red",
      text: String(gvRaw ?? "-")
    };
  }

  // exact
  if(t === "exact"){
    const g = normalize(gvRaw);
    const tv = normalize(tvRaw);
    if(g && g === tv) return { color: "green", text: String(gvRaw) };
    return { color: "red", text: String(gvRaw) };
  }

  // enum
  if(t === "enum"){
    const g = String(gvRaw);
    const tv = String(tvRaw);
    if(g === tv) return { color: "green", text: g };
    return { color: "red", text: g };
  }

  // rank
  if(t === "rank"){
    const order = attr.order || [];
    const near = Number(attr.near ?? 0);

    const g = order.indexOf(String(gvRaw));
    const tv = order.indexOf(String(tvRaw));

    if(String(gvRaw) === "-" && String(tvRaw) === "-"){
      return { color: "green", text: "-" };
    }

    if(g === -1 || tv === -1){
      return { color: "red", text: String(gvRaw) };
    }

    if(g === tv) return { color: "green", text: String(gvRaw) };
    if(near > 0 && Math.abs(g - tv) <= near) return { color: "yellow", text: String(gvRaw) };
    return { color: "red", text: String(gvRaw) };
  }

  return { color: "red", text: String(gvRaw) };
}

// ------------------ Actions ------------------

function submitTextAnswer(){
  if(state.solved) return;

  const input = els.answerInput.value;
  const guessed = findUserByInput(input);

  if(!guessed){
    setFeedback("Не нашёл такого участника в ROSTER. Проверь ник/aliases.", "warn");
    return;
  }

  state.attempts++;
  updateMeta();

  if(state.mode === "classic"){
    const target = currentTargetUser();
    const cells = ATTRIBUTES.map(a => {
      const res = compareValue(a, guessed[a.key], target[a.key]);
      return { color: res.color, text: String(guessed[a.key] ?? "—") };
    });

    state.guessRows.push({ user: guessed, cells });

    const isCorrect = guessed.id === target.id;
    if(isCorrect){
      state.solved = true;
      setFeedback(`✔ Правильно! Это: ${target.name}`, "ok");
    }else if(state.attempts >= MAX_ATTEMPTS){
      state.solved = true;
      setFeedback(`✖ Попытки закончились. Ответ: ${target.name}`, "bad");
    }else{
      setFeedback("Неправильно. Смотри цвета и пробуй ещё!", "bad");
    }

    render();
    return;
  }

  if(state.mode === "emoji" || state.mode === "profile"){
    const target = currentTargetUser();
    const isCorrect = guessed.id === target.id;

    const chip = document.createElement("div");
    chip.className = "chip " + (isCorrect ? "good" : "bad");
    chip.textContent = input.trim();
    els.history.appendChild(chip);

    if(isCorrect){
      state.solved = true;
      setFeedback(`✔ Правильно! Это: ${target.name}`, "ok");
    }else if(state.attempts >= MAX_ATTEMPTS){
      state.solved = true;
      setFeedback(`✖ Попытки закончились. Ответ: ${target.name}`, "bad");
    }else{
      setFeedback(state.mode === "emoji" ? "Неправильно. Открылся следующий эмодзи." : "Неправильно. Размытие стало меньше.", "bad");
    }

    render();
    return;
  }
}

function nextQuestion(){
  state.index[state.mode] = nextFromBag(state.mode);
  resetRound();
  render();
}

function newGame(){
  // сбрасываем мешки (чтобы можно было пройти заново без повторов)
  bag.classic = []; bag.emoji = []; bag.profile = []; bag.next = [];
  nextQuestion();
}

function revealHint(){
  if(state.solved) return;

  if(state.mode === "next"){
    setFeedback("В этом режиме подсказок нет — обсуждайте устно 🙂", "warn");
    return;
  }

  state.attempts++;
  updateMeta();

  if(state.attempts >= MAX_ATTEMPTS){
    state.solved = true;
    const t = currentTargetUser();
    setFeedback(`✖ Попытки закончились. Ответ: ${t?.name ?? "—"}`, "bad");
  }else{
    setFeedback("Подсказка/инфо раскрыта (минус попытка).", "warn");
    render();
  }
}

function revealAnswer(){
  state.solved = true;
  if(state.mode === "next"){
    setFeedback("В этом режиме нет правильного ответа.", "warn");
    return;
  }
  const t = currentTargetUser();
  setFeedback(`Ответ: ${t?.name ?? "—"}`, "warn");
}

function switchMode(mode){
  state.mode = mode;
  resetRound();
  render();
  els.tabs.forEach(t => {
    const active = t.dataset.mode === mode;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function resetRoundOnly(){
  resetRound();
  render();
}

function randomCurrentMode(){
  const len = QUESTIONS[state.mode].length;
  state.index[state.mode] = Math.floor(Math.random() * len);
  resetRound();
  render();
}

// ------------------ Events ------------------
document.addEventListener("click", (e) => {
  // закрыть подсказки, если клик вне input-wrap
  const wrap = document.getElementById("inputWrap");
  if(wrap && !wrap.contains(e.target)){
    hideSuggestions();
  }
});


els.tabs.forEach(t => t.addEventListener("click", () => switchMode(t.dataset.mode)));

els.btnSubmit.addEventListener("click", submitTextAnswer);
els.answerInput.addEventListener("input", () => {
  if(!isTextGuessMode()) return;
  const list = getSuggestions(els.answerInput.value);
  showSuggestions(list);
});

els.answerInput.addEventListener("keydown", (e) => {
  // Навигация по подсказкам
  if(!els.suggestions.classList.contains("hidden")){
    if(e.key === "ArrowDown"){
      e.preventDefault();
      const items = els.suggestions.querySelectorAll(".suggestion").length;
      setActiveSuggestion(Math.min((activeSuggestionIndex + 1), items - 1));
      return;
    }
    if(e.key === "ArrowUp"){
      e.preventDefault();
      setActiveSuggestion(Math.max((activeSuggestionIndex - 1), 0));
      return;
    }
    if(e.key === "Tab"){
      // Tab — выбрать активный, если есть
      const picked = pickActiveSuggestion();
      if(picked){
        e.preventDefault();
        return;
      }
    }
    if(e.key === "Enter"){
      // Если выбран вариант — применить; иначе обычная отправка
      const picked = pickActiveSuggestion();
      if(picked){
        e.preventDefault();
        submitTextAnswer();
        return;
      }
    }
    if(e.key === "Escape"){
      hideSuggestions();
      return;
    }
  }

  if(e.key === "Enter"){
    submitTextAnswer();
  }
});

els.btnReset.addEventListener("click", resetRoundOnly);
els.btnRandom.addEventListener("click", randomCurrentMode);
els.btnNewGame.addEventListener("click", newGame);

// ------------------ Boot ------------------
async function loadData(){
  try{
    const res = await fetch("data.json", { cache: "no-store" });
    if(!res.ok) throw new Error(`data.json status ${res.status}`);
    const data = await res.json();
    applyData(data);
  }catch(err){
    console.warn("data.json не загрузился, использую DEFAULT_DATA", err);
    applyData(DEFAULT_DATA);
  }
}

async function init(){
  await loadData();
  state.index[state.mode] = nextFromBag(state.mode);
  render();
}

init();
