const STORAGE_KEY = "hdha.period.tracker.v2";
const API_ENDPOINT = "/api/period";
const DAY_MS = 24 * 60 * 60 * 1000;

const anchorDateInput = document.getElementById("anchorDate");
const cycleLengthInput = document.getElementById("cycleLength");
const periodLengthInput = document.getElementById("periodLength");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const saveStatus = document.getElementById("saveStatus");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const monthTitle = document.getElementById("monthTitle");
const calendarDays = document.getElementById("calendarDays");
const loggedList = document.getElementById("loggedList");

const todayIso = toIso(new Date());

const state = {
  monthCursor: parseIso(todayIso),
  anchorDate: todayIso,
  cycleLength: 28,
  periodLength: 5,
  loggedDates: new Set(),
};

let saveTimer = null;

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function isoFromUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isSameMonth(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function payload() {
  return {
    anchorDate: state.anchorDate,
    cycleLength: state.cycleLength,
    periodLength: state.periodLength,
    loggedDates: Array.from(state.loggedDates).sort(),
  };
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload()));
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    applyPayload(data);
  } catch (_err) {
    // ignore
  }
}

function applyPayload(data) {
  if (parseIso(data?.anchorDate)) state.anchorDate = data.anchorDate;
  state.cycleLength = clampNum(data?.cycleLength, 20, 45, state.cycleLength);
  state.periodLength = clampNum(data?.periodLength, 2, 10, state.periodLength);
  if (Array.isArray(data?.loggedDates)) {
    state.loggedDates = new Set(data.loggedDates.filter((x) => parseIso(x)));
  }
}

async function saveRemote() {
  const res = await fetch(API_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload()),
  });
  if (!res.ok) throw new Error("save failed");
}

async function loadRemote() {
  const res = await fetch(API_ENDPOINT);
  if (!res.ok) return;
  const data = await res.json();
  applyPayload(data);
  saveLocal();
}

function scheduleRemoteSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveRemote()
      .then(() => {
        if (saveStatus) saveStatus.textContent = "Đã lưu";
      })
      .catch(() => {
        if (saveStatus) saveStatus.textContent = "Đã lưu local (mạng yếu)";
      });
  }, 250);
}

function getPredictedSet(rangeStart, rangeEnd) {
  const out = new Set();
  const anchor = parseIso(state.anchorDate);
  if (!anchor) return out;

  const cycle = clampNum(state.cycleLength, 20, 45, 28);
  const period = clampNum(state.periodLength, 2, 10, 5);

  let start = new Date(anchor.getTime());
  while (start.getTime() > rangeStart.getTime()) {
    start = addDays(start, -cycle);
  }

  const endWithBuffer = addDays(rangeEnd, cycle + period);
  while (start.getTime() <= endWithBuffer.getTime()) {
    for (let i = 0; i < period; i += 1) {
      const day = addDays(start, i);
      if (day >= rangeStart && day <= rangeEnd) {
        out.add(isoFromUtc(day));
      }
    }
    start = addDays(start, cycle);
  }

  return out;
}

function formatVi(iso) {
  const d = parseIso(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function renderList() {
  loggedList.innerHTML = "";
  const sorted = Array.from(state.loggedDates).sort((a, b) => b.localeCompare(a));
  if (!sorted.length) {
    const li = document.createElement("li");
    li.textContent = "Chưa có ngày nào.";
    loggedList.appendChild(li);
    return;
  }

  sorted.slice(0, 120).forEach((iso) => {
    const li = document.createElement("li");
    li.textContent = formatVi(iso);
    loggedList.appendChild(li);
  });
}

function renderCalendar() {
  const monthStart = startOfMonth(state.monthCursor);
  const firstWeekDay = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekDay);
  const gridEnd = addDays(gridStart, 41);
  const predictedSet = getPredictedSet(gridStart, gridEnd);

  monthTitle.textContent = `Tháng ${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}/${monthStart.getUTCFullYear()}`;
  calendarDays.innerHTML = "";

  for (let i = 0; i < 42; i += 1) {
    const day = addDays(gridStart, i);
    const iso = isoFromUtc(day);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day";
    btn.dataset.date = iso;
    btn.textContent = String(day.getUTCDate());

    if (!isSameMonth(day, monthStart)) btn.classList.add("outside");
    if (iso === todayIso) btn.classList.add("today");
    if (predictedSet.has(iso)) btn.classList.add("predicted");
    if (state.loggedDates.has(iso)) btn.classList.add("logged");

    calendarDays.appendChild(btn);
  }
}

function renderForm() {
  anchorDateInput.value = state.anchorDate;
  cycleLengthInput.value = String(state.cycleLength);
  periodLengthInput.value = String(state.periodLength);
}

function render() {
  renderForm();
  renderCalendar();
  renderList();
}

function saveAll() {
  saveLocal();
  scheduleRemoteSave();
  render();
}

function bindEvents() {
  saveBtn?.addEventListener("click", () => {
    const nextAnchor = parseIso(anchorDateInput.value) ? anchorDateInput.value : todayIso;
    state.anchorDate = nextAnchor;
    state.cycleLength = clampNum(cycleLengthInput.value, 20, 45, state.cycleLength);
    state.periodLength = clampNum(periodLengthInput.value, 2, 10, state.periodLength);
    if (saveStatus) saveStatus.textContent = "Đang lưu...";
    saveAll();
  });

  clearBtn?.addEventListener("click", () => {
    state.loggedDates.clear();
    if (saveStatus) saveStatus.textContent = "Đang lưu...";
    saveAll();
  });

  prevBtn?.addEventListener("click", () => {
    state.monthCursor = new Date(Date.UTC(state.monthCursor.getUTCFullYear(), state.monthCursor.getUTCMonth() - 1, 1));
    renderCalendar();
  });

  nextBtn?.addEventListener("click", () => {
    state.monthCursor = new Date(Date.UTC(state.monthCursor.getUTCFullYear(), state.monthCursor.getUTCMonth() + 1, 1));
    renderCalendar();
  });

  calendarDays?.addEventListener("click", (event) => {
    const target = event.target.closest("button.day");
    if (!target?.dataset.date) return;
    const dateIso = target.dataset.date;

    if (state.loggedDates.has(dateIso)) {
      state.loggedDates.delete(dateIso);
    } else {
      state.loggedDates.add(dateIso);
    }

    if (saveStatus) saveStatus.textContent = "Đang lưu...";
    saveAll();
  });
}

async function init() {
  loadLocal();
  await loadRemote().catch(() => {});

  const anchor = parseIso(state.anchorDate) || parseIso(todayIso);
  state.monthCursor = startOfMonth(anchor);

  bindEvents();
  render();

  window.__periodAssistant = {
    addLoggedDate: (iso) => {
      if (!parseIso(iso)) return false;
      state.loggedDates.add(iso);
      saveAll();
      return true;
    },
    removeLoggedDate: (iso) => {
      if (!parseIso(iso)) return false;
      state.loggedDates.delete(iso);
      saveAll();
      return true;
    },
    getTodayIso: () => todayIso,
  };
}

init();
