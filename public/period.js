const STORAGE_KEY = "hdha.period.tracker.v1";
const API_ENDPOINT = "/api/period";
const dayMs = 24 * 60 * 60 * 1000;

const topNavWrap = document.getElementById("topNavWrap");
const navToggle = document.getElementById("navToggle");

const anchorDateInput = document.getElementById("anchorDate");
const periodLengthInput = document.getElementById("periodLength");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const clearLoggedBtn = document.getElementById("clearLoggedBtn");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const monthTitle = document.getElementById("monthTitle");
const calendarGrid = document.getElementById("calendarGrid");
const summaryText = document.getElementById("summaryText");
const loggedDateList = document.getElementById("loggedDateList");

const todayIso = toIsoLocalDate(new Date());

const state = {
  monthCursor: parseIsoAsUtc(todayIso),
  anchorDate: todayIso,
  cycleLength: 28,
  periodLength: 5,
  loggedDates: new Set(),
};
let saveTimer = null;

function toIsoLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoAsUtc(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcToIso(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * dayMs);
}

function startOfMonthUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function sameMonthUtc(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function saveState() {
  const payload = {
    anchorDate: state.anchorDate,
    cycleLength: state.cycleLength,
    periodLength: state.periodLength,
    loggedDates: Array.from(state.loggedDates).sort(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  scheduleRemoteSave();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (parseIsoAsUtc(data.anchorDate)) state.anchorDate = data.anchorDate;
    state.cycleLength = clampNumber(data.cycleLength, 20, 45, 28);
    state.periodLength = clampNumber(data.periodLength, 2, 10, 5);
    if (Array.isArray(data.loggedDates)) {
      state.loggedDates = new Set(
        data.loggedDates.filter((d) => parseIsoAsUtc(d))
      );
    }
  } catch (_err) {
    // ignore invalid local storage
  }
}

function toPayload() {
  return {
    anchorDate: state.anchorDate,
    cycleLength: state.cycleLength,
    periodLength: state.periodLength,
    loggedDates: Array.from(state.loggedDates).sort(),
  };
}

function applyPayload(data) {
  if (parseIsoAsUtc(data?.anchorDate)) state.anchorDate = data.anchorDate;
  state.cycleLength = clampNumber(data?.cycleLength, 20, 45, state.cycleLength);
  state.periodLength = clampNumber(data?.periodLength, 2, 10, state.periodLength);
  if (Array.isArray(data?.loggedDates)) {
    state.loggedDates = new Set(data.loggedDates.filter((d) => parseIsoAsUtc(d)));
  }
}

async function loadRemoteState() {
  const res = await fetch(API_ENDPOINT);
  if (!res.ok) throw new Error("Could not fetch period data");
  const data = await res.json();
  applyPayload(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toPayload()));
}

async function saveRemoteState() {
  const res = await fetch(API_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload()),
  });
  if (!res.ok) throw new Error("Could not save period data");
}

function scheduleRemoteSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveRemoteState().catch(() => {
      // Keep local data if API is unavailable.
    });
  }, 300);
}

function getCycleStartDates() {
  const starts = [];
  const sorted = Array.from(state.loggedDates)
    .filter((d) => parseIsoAsUtc(d))
    .sort();

  let prev = null;
  for (const iso of sorted) {
    const current = parseIsoAsUtc(iso);
    if (!current) continue;
    if (!prev) {
      starts.push(iso);
      prev = current;
      continue;
    }
    const diff = Math.round((current.getTime() - prev.getTime()) / dayMs);
    if (diff > 1) starts.push(iso);
    prev = current;
  }

  if (!starts.length && parseIsoAsUtc(state.anchorDate)) starts.push(state.anchorDate);
  return starts;
}

function getEstimatedCycleLength() {
  const starts = getCycleStartDates().map(parseIsoAsUtc).filter(Boolean);
  if (starts.length < 2) return state.cycleLength;

  const diffs = [];
  for (let i = 1; i < starts.length; i += 1) {
    const diff = Math.round((starts[i].getTime() - starts[i - 1].getTime()) / dayMs);
    if (diff >= 20 && diff <= 45) diffs.push(diff);
  }
  if (!diffs.length) return state.cycleLength;
  const avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  return clampNumber(avg, 20, 45, state.cycleLength);
}

function getLatestLoggedDateUtc() {
  const sorted = Array.from(state.loggedDates)
    .filter((d) => parseIsoAsUtc(d))
    .sort();
  if (!sorted.length) return null;
  return parseIsoAsUtc(sorted[sorted.length - 1]);
}

function getPredictionSet(rangeStart, rangeEnd) {
  const set = new Set();
  const anchor = parseIsoAsUtc(state.anchorDate);
  if (!anchor) return set;

  const cycle = getEstimatedCycleLength();
  const period = clampNumber(state.periodLength, 2, 10, 5);
  const latestLogged = getLatestLoggedDateUtc();

  const diffDays = Math.floor((rangeStart.getTime() - anchor.getTime()) / dayMs);
  const cycleOffset = Math.floor(diffDays / cycle);
  let start = addDaysUtc(anchor, cycleOffset * cycle);

  while (start.getTime() > rangeStart.getTime()) {
    start = addDaysUtc(start, -cycle);
  }

  const endBuffer = addDaysUtc(rangeEnd, period + cycle);
  while (start.getTime() <= endBuffer.getTime()) {
    for (let i = 0; i < period; i += 1) {
      const day = addDaysUtc(start, i);
      if (
        day.getTime() >= rangeStart.getTime() &&
        day.getTime() <= rangeEnd.getTime() &&
        (!latestLogged || day.getTime() > latestLogged.getTime())
      ) {
        set.add(formatUtcToIso(day));
      }
    }
    start = addDaysUtc(start, cycle);
  }

  return set;
}

function getNextPredictedStart() {
  const anchor = parseIsoAsUtc(state.anchorDate);
  if (!anchor) return null;
  const cycle = getEstimatedCycleLength();
  const period = clampNumber(state.periodLength, 2, 10, 5);
  const today = parseIsoAsUtc(todayIso);

  const diffDays = Math.floor((today.getTime() - anchor.getTime()) / dayMs);
  let offset = Math.floor(diffDays / cycle);
  if (offset < 0) offset = 0;

  let start = addDaysUtc(anchor, offset * cycle);
  while (addDaysUtc(start, period - 1).getTime() < today.getTime()) {
    start = addDaysUtc(start, cycle);
  }
  return formatUtcToIso(start);
}

function formatDateVi(iso) {
  const date = parseIsoAsUtc(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function renderSummary() {
  if (summaryText) summaryText.textContent = "";
}

function renderLoggedDateList() {
  const list = Array.from(state.loggedDates).sort((a, b) => b.localeCompare(a));
  loggedDateList.innerHTML = "";
  if (!list.length) {
    const li = document.createElement("li");
    li.textContent = "Chưa có ngày nào. Bấm vào ngày trong lịch để tích.";
    loggedDateList.appendChild(li);
    return;
  }
  list.slice(0, 90).forEach((iso) => {
    const li = document.createElement("li");
    li.textContent = formatDateVi(iso);
    loggedDateList.appendChild(li);
  });
}

function renderCalendar() {
  const monthStart = startOfMonthUtc(state.monthCursor);
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = addDaysUtc(monthStart, -firstWeekday);
  const gridEnd = addDaysUtc(gridStart, 41);
  const predicted = getPredictionSet(gridStart, gridEnd);

  monthTitle.textContent = `Tháng ${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}/${monthStart.getUTCFullYear()}`;

  calendarGrid.innerHTML = "";
  for (let i = 0; i < 42; i += 1) {
    const day = addDaysUtc(gridStart, i);
    const iso = formatUtcToIso(day);
    const inMonth = sameMonthUtc(day, monthStart);
    const isLogged = state.loggedDates.has(iso);
    const isPredicted = predicted.has(iso);
    const isToday = iso === todayIso;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";
    cell.setAttribute("aria-label", `Ngày ${iso}`);
    if (!inMonth) cell.classList.add("outside");
    if (isToday) cell.classList.add("today");
    if (isPredicted) cell.classList.add("predicted");
    if (isLogged) cell.classList.add("logged");
    cell.dataset.date = iso;

    const dayNumber = document.createElement("span");
    dayNumber.className = "d";
    dayNumber.textContent = String(day.getUTCDate());
    cell.appendChild(dayNumber);

    calendarGrid.appendChild(cell);
  }
}

function renderAll() {
  anchorDateInput.value = state.anchorDate;
  periodLengthInput.value = String(state.periodLength);
  renderCalendar();
  renderSummary();
  renderLoggedDateList();
}

function addLoggedDate(iso) {
  if (!parseIsoAsUtc(iso)) return false;
  state.loggedDates.add(iso);
  saveState();
  renderAll();
  return true;
}

function removeLoggedDate(iso) {
  if (!parseIsoAsUtc(iso)) return false;
  state.loggedDates.delete(iso);
  saveState();
  renderAll();
  return true;
}

function setNavOpen(open) {
  topNavWrap?.classList.toggle("open", open);
  if (navToggle) navToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function handleToggleDate(iso) {
  if (state.loggedDates.has(iso)) state.loggedDates.delete(iso);
  else state.loggedDates.add(iso);
  saveState();
  renderAll();
}

function bindEvents() {
  navToggle?.addEventListener("click", () => {
    setNavOpen(!topNavWrap?.classList.contains("open"));
  });
  document.addEventListener("click", (event) => {
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    if (!isMobile || !topNavWrap?.classList.contains("open")) return;
    if (topNavWrap.contains(event.target)) return;
    setNavOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavOpen(false);
  });
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 720px)").matches) setNavOpen(false);
  });

  saveSettingsBtn?.addEventListener("click", () => {
    const anchor = parseIsoAsUtc(anchorDateInput.value) ? anchorDateInput.value : todayIso;
    state.anchorDate = anchor;
    state.periodLength = clampNumber(periodLengthInput.value, 2, 10, 5);
    saveState();
    renderAll();
  });

  clearLoggedBtn?.addEventListener("click", () => {
    state.loggedDates.clear();
    saveState();
    renderAll();
  });

  prevMonthBtn?.addEventListener("click", () => {
    state.monthCursor = new Date(Date.UTC(state.monthCursor.getUTCFullYear(), state.monthCursor.getUTCMonth() - 1, 1));
    renderCalendar();
  });
  nextMonthBtn?.addEventListener("click", () => {
    state.monthCursor = new Date(Date.UTC(state.monthCursor.getUTCFullYear(), state.monthCursor.getUTCMonth() + 1, 1));
    renderCalendar();
  });

  let lastTapTs = 0;
  const onCalendarTap = (event) => {
    const btn = event.target.closest("button.day");
    if (!btn?.dataset.date) return;
    const now = Date.now();
    if (now - lastTapTs < 120) return;
    lastTapTs = now;
    handleToggleDate(btn.dataset.date);
  };

  calendarGrid?.addEventListener("pointerup", onCalendarTap);
  calendarGrid?.addEventListener("click", onCalendarTap);
}

async function init() {
  loadState();
  try {
    await loadRemoteState();
  } catch (_err) {
    // Use local data when API is unavailable.
  }
  const maybeAnchor = parseIsoAsUtc(state.anchorDate);
  state.monthCursor = maybeAnchor ? startOfMonthUtc(maybeAnchor) : startOfMonthUtc(parseIsoAsUtc(todayIso));
  bindEvents();
  renderAll();

  // Expose safe actions for AI widget on this page only.
  window.__periodAssistant = {
    addLoggedDate,
    removeLoggedDate,
    getTodayIso: () => todayIso,
    setPeriodLength: (n) => {
      state.periodLength = clampNumber(n, 2, 10, state.periodLength);
      saveState();
      renderAll();
      return state.periodLength;
    },
    getEstimatedCycleLength,
  };
}

init();
