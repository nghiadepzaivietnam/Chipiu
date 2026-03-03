const API_ENDPOINT = "/api/period";
const PERIOD_AI_ENDPOINT = "/api/period-ai";
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
const symptomList = document.getElementById("symptomList");
const reminderToggle = document.getElementById("reminderToggle");
const reminderPanel = document.getElementById("reminderPanel");
const reminderText = document.getElementById("reminderText");
const reminderRefresh = document.getElementById("reminderRefresh");

const nextPeriodLine = document.getElementById("nextPeriodLine");
const fertilityLine = document.getElementById("fertilityLine");
const ovulationLine = document.getElementById("ovulationLine");
const widgetDate = document.getElementById("widgetDate");
const widgetCycleChip = document.getElementById("widgetCycleChip");
const widgetPhaseLabel = document.getElementById("widgetPhaseLabel");
const widgetOvulationCountdown = document.getElementById("widgetOvulationCountdown");
const widgetChanceLabel = document.getElementById("widgetChanceLabel");
const quickLogTodayBtn = document.getElementById("quickLogTodayBtn");
const openSymptomTodayBtn = document.getElementById("openSymptomTodayBtn");

const logDateInput = document.getElementById("logDate");
const moodLevelInput = document.getElementById("moodLevel");
const crampsLevelInput = document.getElementById("crampsLevel");
const backPainLevelInput = document.getElementById("backPainLevel");
const acneLevelInput = document.getElementById("acneLevel");
const sleepLevelInput = document.getElementById("sleepLevel");
const dischargeLevelInput = document.getElementById("dischargeLevel");
const moodValue = document.getElementById("moodValue");
const crampsValue = document.getElementById("crampsValue");
const backPainValue = document.getElementById("backPainValue");
const acneValue = document.getElementById("acneValue");
const sleepValue = document.getElementById("sleepValue");
const dischargeValue = document.getElementById("dischargeValue");
const medicationInput = document.getElementById("medicationInput");
const saveSymptomBtn = document.getElementById("saveSymptomBtn");
const askAiAdviceBtn = document.getElementById("askAiAdviceBtn");
const symptomStatus = document.getElementById("symptomStatus");
const aiAdviceText = document.getElementById("aiAdviceText");
const quickPresetButtons = Array.from(document.querySelectorAll("[data-quick-preset]"));

const lead1 = document.getElementById("lead1");
const lead2 = document.getElementById("lead2");
const lead3 = document.getElementById("lead3");
const pillEnabled = document.getElementById("pillEnabled");
const pillTime = document.getElementById("pillTime");
const ironEnabled = document.getElementById("ironEnabled");
const ironTime = document.getElementById("ironTime");
const padEnabled = document.getElementById("padEnabled");
const padInterval = document.getElementById("padInterval");

const todayIso = toIso(new Date());
const todayUtc = parseIso(todayIso);

const state = {
  monthCursor: parseIso(todayIso),
  anchorDate: "",
  cycleLength: 28,
  periodLength: 5,
  loggedDates: new Set(),
  symptomLogs: {},
  selectedLogDate: todayIso,
  reminders: {
    periodLeadDays: [1, 2, 3],
    pill: { enabled: false, time: "21:00" },
    iron: { enabled: false, time: "08:00" },
    padChange: { enabled: false, intervalHours: 4 },
  },
};

let saveTimer = null;
let lastReminderText = "";

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

function cleanTime(value, fallback) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "")) ? value : fallback;
}

function describeLevel(value) {
  if (value <= 1) return "\u1ed4n";
  if (value <= 3) return "V\u1eeba";
  return "N\u1eb7ng";
}

function paintSlider(input, valueEl) {
  if (!input) return;
  const value = clampNum(input.value, 0, 5, 0);
  const fill = `${(value / 5) * 100}%`;
  input.style.setProperty("--range-fill", fill);
  if (valueEl) valueEl.textContent = `${value} \u2022 ${describeLevel(value)}`;
}

function renderSymptomMeter() {
  paintSlider(moodLevelInput, moodValue);
  paintSlider(crampsLevelInput, crampsValue);
  paintSlider(backPainLevelInput, backPainValue);
  paintSlider(acneLevelInput, acneValue);
  paintSlider(sleepLevelInput, sleepValue);
  paintSlider(dischargeLevelInput, dischargeValue);
}

function sanitizeSymptomEntry(raw) {
  return {
    mood: clampNum(raw?.mood, 0, 5, 0),
    cramps: clampNum(raw?.cramps, 0, 5, 0),
    backPain: clampNum(raw?.backPain, 0, 5, 0),
    acne: clampNum(raw?.acne, 0, 5, 0),
    sleep: clampNum(raw?.sleep, 0, 5, 0),
    discharge: clampNum(raw?.discharge, 0, 5, 0),
    medication: typeof raw?.medication === "string" ? raw.medication.trim().slice(0, 240) : "",
  };
}

function normalizeReminders(raw) {
  const lead = Array.isArray(raw?.periodLeadDays)
    ? Array.from(
        new Set(
          raw.periodLeadDays
            .map((v) => clampNum(v, 1, 3, 0))
            .filter((v) => v >= 1 && v <= 3)
        )
      ).sort((a, b) => a - b)
    : [1, 2, 3];

  return {
    periodLeadDays: lead.length ? lead : [1, 2, 3],
    pill: {
      enabled: Boolean(raw?.pill?.enabled),
      time: cleanTime(raw?.pill?.time, "21:00"),
    },
    iron: {
      enabled: Boolean(raw?.iron?.enabled),
      time: cleanTime(raw?.iron?.time, "08:00"),
    },
    padChange: {
      enabled: Boolean(raw?.padChange?.enabled),
      intervalHours: clampNum(raw?.padChange?.intervalHours, 1, 8, 4),
    },
  };
}

function payload() {
  return {
    anchorDate: state.anchorDate,
    cycleLength: state.cycleLength,
    periodLength: state.periodLength,
    loggedDates: Array.from(state.loggedDates).sort(),
    symptomLogs: state.symptomLogs,
    reminders: state.reminders,
  };
}

function applyPayload(data) {
  if (parseIso(data?.anchorDate)) state.anchorDate = data.anchorDate;
  state.cycleLength = clampNum(data?.cycleLength, 20, 45, state.cycleLength);
  state.periodLength = clampNum(data?.periodLength, 2, 10, state.periodLength);
  if (Array.isArray(data?.loggedDates)) {
    state.loggedDates = new Set(data.loggedDates.filter((x) => parseIso(x)));
  }
  if (data?.symptomLogs && typeof data.symptomLogs === "object") {
    const next = {};
    Object.entries(data.symptomLogs).forEach(([iso, raw]) => {
      if (!parseIso(iso)) return;
      next[iso] = sanitizeSymptomEntry(raw);
    });
    state.symptomLogs = next;
  }
  state.reminders = normalizeReminders(data?.reminders || {});
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
}

function scheduleRemoteSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveRemote()
      .then(() => {
        if (saveStatus) saveStatus.textContent = "\u0110\u00e3 l\u01b0u";
        if (symptomStatus) symptomStatus.textContent = "D\u1eef li\u1ec7u \u0111\u00e3 \u0111\u1ed3ng b\u1ed9";
      })
      .catch(() => {
        if (saveStatus) saveStatus.textContent = "L\u01b0u th\u1ea5t b\u1ea1i, th\u1eed l\u1ea1i sau";
      });
  }, 250);
}

function getSortedLoggedIso() {
  return Array.from(state.loggedDates).sort();
}

function getCycleStartsIso(sortedLogged) {
  if (!sortedLogged.length) return [];
  const starts = [sortedLogged[0]];
  for (let i = 1; i < sortedLogged.length; i += 1) {
    const prev = parseIso(sortedLogged[i - 1]);
    const cur = parseIso(sortedLogged[i]);
    if (!prev || !cur) continue;
    const gap = Math.round((cur.getTime() - prev.getTime()) / DAY_MS);
    if (gap > 1) starts.push(sortedLogged[i]);
  }
  return starts;
}

function estimateCycleLengthFromStarts(startsIso) {
  const fallback = clampNum(state.cycleLength, 20, 45, 28);
  const dates = startsIso.map(parseIso).filter(Boolean);
  if (dates.length < 2) return fallback;

  const diffs = [];
  for (let i = 1; i < dates.length; i += 1) {
    const diff = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / DAY_MS);
    if (diff >= 20 && diff <= 45) diffs.push(diff);
  }
  if (!diffs.length) return fallback;
  return clampNum(Math.round(diffs.reduce((sum, d) => sum + d, 0) / diffs.length), 20, 45, fallback);
}

function getNextPredictedStartIso() {
  const sorted = getSortedLoggedIso();
  if (!sorted.length) return null;
  const starts = getCycleStartsIso(sorted);
  if (!starts.length) return null;
  const cycleLen = estimateCycleLengthFromStarts(starts);
  const lastStart = parseIso(starts[starts.length - 1]);
  if (!lastStart || !todayUtc) return null;
  let next = new Date(lastStart.getTime());
  while (next.getTime() <= todayUtc.getTime()) {
    next = addDays(next, cycleLen);
  }
  return isoFromUtc(next);
}

function getInsights() {
  const sorted = getSortedLoggedIso();
  if (!sorted.length) return null;
  const starts = getCycleStartsIso(sorted);
  if (!starts.length) return null;

  const cycleLen = estimateCycleLengthFromStarts(starts);
  const periodLen = clampNum(state.periodLength, 2, 10, 5);
  const lastStart = parseIso(starts[starts.length - 1]);
  if (!lastStart || !todayUtc) return null;

  let nextStart = new Date(lastStart.getTime());
  while (nextStart.getTime() <= todayUtc.getTime()) {
    nextStart = addDays(nextStart, cycleLen);
  }

  const rangeStart = addDays(nextStart, -2);
  const rangeEnd = addDays(nextStart, 2);
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  return {
    cycleLen,
    periodLen,
    lastStart: isoFromUtc(lastStart),
    nextStart: isoFromUtc(nextStart),
    nextRangeStart: isoFromUtc(rangeStart),
    nextRangeEnd: isoFromUtc(rangeEnd),
    ovulationDate: isoFromUtc(ovulation),
    fertileStart: isoFromUtc(fertileStart),
    fertileEnd: isoFromUtc(fertileEnd),
  };
}

function diffDays(fromDate, toDate) {
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

function getCycleDayInfo() {
  const sorted = getSortedLoggedIso();
  if (!sorted.length || !todayUtc) return null;
  const starts = getCycleStartsIso(sorted);
  if (!starts.length) return null;
  const cycleLen = estimateCycleLengthFromStarts(starts);
  let ref = parseIso(starts[starts.length - 1]);
  if (!ref) return null;

  while (ref.getTime() > todayUtc.getTime()) {
    ref = addDays(ref, -cycleLen);
  }
  while (addDays(ref, cycleLen).getTime() <= todayUtc.getTime()) {
    ref = addDays(ref, cycleLen);
  }

  const cycleDay = diffDays(ref, todayUtc) + 1;
  let ovulation = addDays(ref, cycleLen - 14);
  while (ovulation.getTime() < todayUtc.getTime()) {
    ovulation = addDays(ovulation, cycleLen);
  }
  const untilOvulation = diffDays(todayUtc, ovulation);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const fertileNow = todayUtc.getTime() >= fertileStart.getTime() && todayUtc.getTime() <= fertileEnd.getTime();

  return {
    cycleDay,
    cycleLen,
    ovulationDate: ovulation,
    untilOvulation,
    fertileNow,
  };
}

function getPredictedMeta(rangeStart, rangeEnd) {
  const predictedSet = new Set();
  const fertileSet = new Set();
  const ovulationSet = new Set();
  const uncertainSet = new Set();

  const sorted = getSortedLoggedIso();
  if (!sorted.length) {
    return { predictedSet, fertileSet, ovulationSet, uncertainSet };
  }
  const starts = getCycleStartsIso(sorted);
  const cycleLen = estimateCycleLengthFromStarts(starts);
  const periodLen = clampNum(state.periodLength, 2, 10, 5);
  const lastStart = parseIso(starts[starts.length - 1]);
  const lastLogged = parseIso(sorted[sorted.length - 1]);
  if (!lastStart || !lastLogged) {
    return { predictedSet, fertileSet, ovulationSet, uncertainSet };
  }

  let cursor = new Date(lastStart.getTime());
  while (cursor.getTime() > rangeStart.getTime()) {
    cursor = addDays(cursor, -cycleLen);
  }

  const max = addDays(rangeEnd, cycleLen + periodLen + 8);
  while (cursor.getTime() <= max.getTime()) {
    for (let i = 0; i < periodLen; i += 1) {
      const d = addDays(cursor, i);
      const iso = isoFromUtc(d);
      if (d >= rangeStart && d <= rangeEnd && d.getTime() > lastLogged.getTime()) {
        predictedSet.add(iso);
      }
    }

    const ovulation = addDays(cursor, -14);
    for (let i = -5; i <= 1; i += 1) {
      const f = addDays(ovulation, i);
      const iso = isoFromUtc(f);
      if (f >= rangeStart && f <= rangeEnd && todayUtc && f.getTime() >= todayUtc.getTime()) {
        fertileSet.add(iso);
      }
    }
    if (ovulation >= rangeStart && ovulation <= rangeEnd && todayUtc && ovulation.getTime() >= todayUtc.getTime()) {
      ovulationSet.add(isoFromUtc(ovulation));
    }

    for (let i = -2; i <= 2; i += 1) {
      const u = addDays(cursor, i);
      const iso = isoFromUtc(u);
      if (u >= rangeStart && u <= rangeEnd && u.getTime() > lastLogged.getTime()) {
        uncertainSet.add(iso);
      }
    }

    cursor = addDays(cursor, cycleLen);
  }

  return { predictedSet, fertileSet, ovulationSet, uncertainSet };
}

function pickRandom(list) {
  if (!list?.length) return "";
  if (list.length === 1) return list[0];
  const pool = list.filter((msg) => msg !== lastReminderText);
  const activePool = pool.length ? pool : list;
  const item = activePool[Math.floor(Math.random() * activePool.length)];
  lastReminderText = item;
  return item;
}

const reminderMap = {
  no_data: [
    "B\u1ea5m v\u00e0i ng\u00e0y c\u00f3 kinh g\u1ea7n nh\u1ea5t \u0111\u1ec3 m\u00ecnh b\u1eaft \u0111\u1ea7u d\u1ef1 \u0111o\u00e1n chu\u1ea9n h\u01a1n cho b\u1ea1n nha.",
    "B\u1ea1n ch\u01b0a \u0111\u00e1nh d\u1ea5u k\u1ef3 kinh, h\u00f4m nay th\u1eed l\u01b0u k\u1ef3 g\u1ea7n nh\u1ea5t \u0111\u1ec3 app h\u1ecdc chu k\u1ef3 c\u1ee7a b\u1ea1n.",
    "Tip nh\u1eb9: ch\u1ec9 c\u1ea7n t\u00edch \u0111\u00fang 2-3 k\u1ef3 g\u1ea7n nh\u1ea5t l\u00e0 d\u1ef1 b\u00e1o \u0111\u00e3 \u1ed5n h\u01a1n r\u1ea5t nhi\u1ec1u.",
  ],
  in_period: [
    "H\u00f4m nay c\u00f3 th\u1ec3 l\u00e0 ng\u00e0y trong k\u1ef3, nh\u1edb u\u1ed1ng \u0111\u1ee7 n\u01b0\u1edbc \u1ea5m v\u00e0 ngh\u1ec9 ng\u01a1i th\u00eam m\u1ed9t ch\u00fat.",
    "N\u1ebfu b\u1ee5ng kh\u00f3 ch\u1ecbu, b\u1ea1n c\u00f3 th\u1ec3 ch\u01b0\u1eddm \u1ea5m v\u00e0 gi\u1ea3m \u0111\u1ed3 u\u1ed1ng l\u1ea1nh h\u00f4m nay nh\u00e9.",
    "Ng\u00e0y trong k\u1ef3: \u01b0u ti\u00ean ng\u1ee7 s\u1edbm, \u0103n nh\u1eb9 v\u00e0 gi\u1eef c\u01a1 th\u1ec3 tho\u1ea3i m\u00e1i.",
  ],
  due_today: [
    "D\u1ef1 b\u00e1o h\u00f4m nay c\u00f3 th\u1ec3 b\u1eaft \u0111\u1ea7u k\u1ef3 m\u1edbi, chu\u1ea9n b\u1ecb s\u1eb5n \u0111\u1ed3 c\u1ea7n thi\u1ebft nh\u00e9.",
    "H\u00f4m nay l\u00e0 ng\u00e0y s\u00e1t chu k\u1ef3, b\u1ea1n nh\u1edb mang theo b\u0103ng/tampon/c\u1ed1c nguy\u1ec7t san.",
    "C\u00f3 kh\u1ea3 n\u0103ng b\u1eaft \u0111\u1ea7u k\u1ef3 h\u00f4m nay, \u01b0u ti\u00ean l\u1ecbch l\u00e0m vi\u1ec7c nh\u1eb9 nh\u00e0ng h\u01a1n m\u1ed9t ch\u00fat.",
  ],
  very_near: [
    "C\u00f2n r\u1ea5t g\u1ea7n t\u1edbi k\u1ef3, b\u1ea1n c\u00f3 th\u1ec3 chu\u1ea9n b\u1ecb tr\u01b0\u1edbc \u0111\u1ed3 c\u1ea7n thi\u1ebft t\u1eeb h\u00f4m nay.",
    "S\u1eafp t\u1edbi ng\u00e0y r\u1ed3i, nh\u1edb ng\u1ee7 s\u1edbm v\u00e0 gi\u1ea3m c\u00e0 ph\u00ea n\u1ebfu b\u1ea1n hay nh\u1ea1y c\u1ea3m.",
    "B\u1ea1n \u0111ang \u1edf giai \u0111o\u1ea1n c\u1eadn k\u1ef3, gi\u1eef l\u1ecbch l\u00e0m vi\u1ec7c tho\u00e1ng h\u01a1n s\u1ebd d\u1ec5 ch\u1ecbu h\u01a1n.",
  ],
  near: [
    "Kho\u1ea3ng 1 tu\u1ea7n n\u1eefa l\u00e0 t\u1edbi k\u1ef3 d\u1ef1 b\u00e1o, m\u00ecnh chu\u1ea9n b\u1ecb d\u1ea7n t\u1eeb b\u00e2y gi\u1edd nh\u00e9.",
    "B\u1ea1n \u0111ang trong tu\u1ea7n c\u1eadn k\u1ef3, gi\u1eef nh\u1ecbp sinh ho\u1ea1t \u0111\u1ec1u s\u1ebd \u0111\u1ee1 m\u1ec7t h\u01a1n.",
    "\u0110\u00e2y l\u00e0 l\u00fac t\u1ed1t \u0111\u1ec3 chu\u1ea9n b\u1ecb v\u1eadt d\u1ee5ng c\u1ea7n thi\u1ebft cho k\u1ef3 t\u1edbi.",
  ],
  post_period: [
    "B\u1ea1n v\u1eeba qua k\u1ef3 g\u1ea7n \u0111\u00e2y, nh\u1edb \u0103n u\u1ed1ng \u0111\u1ee7 ch\u1ea5t \u0111\u1ec3 h\u1ed3i s\u1ee9c nh\u00e9.",
    "Sau k\u1ef3 kinh, c\u00f3 th\u1ec3 c\u1ea7n ph\u1ee5c h\u1ed3i n\u0103ng l\u01b0\u1ee3ng n\u00ean \u0111\u1eebng b\u1ecf b\u1eefa nha.",
    "Giai \u0111o\u1ea1n sau k\u1ef3 l\u00e0 l\u00fac t\u1ed1t \u0111\u1ec3 quay l\u1ea1i nh\u1ecbp v\u1eadn \u0111\u1ed9ng nh\u1eb9.",
  ],
  normal: [
    "H\u00f4m nay l\u00e0 m\u1ed9t ng\u00e0y \u1ed5n \u0111\u1ecbnh, c\u1ee9 gi\u1eef nh\u1ecbp sinh ho\u1ea1t \u0111\u1ec1u nh\u01b0 hi\u1ec7n t\u1ea1i nh\u00e9.",
    "B\u1ea1n \u0111ang theo d\u00f5i chu k\u1ef3 r\u1ea5t t\u1ed1t, duy tr\u00ec \u0111\u1ec1u \u0111\u1eb7n l\u00e0 \u0111\u1ee7 tuy\u1ec7t v\u1eddi r\u1ed3i.",
    "Nh\u1eafc nh\u1eb9: ng\u1ee7 \u0111\u1ee7 gi\u1ea5c lu\u00f4n gi\u00fap chu k\u1ef3 \u1ed5n \u0111\u1ecbnh h\u01a1n.",
  ],
};

function getReminderCategory() {
  const sorted = getSortedLoggedIso();
  if (!sorted.length) return "no_data";
  if (state.loggedDates.has(todayIso)) return "in_period";

  const nextIso = getNextPredictedStartIso();
  const next = parseIso(nextIso);

  if (todayUtc && next) {
    const daysUntil = Math.round((next.getTime() - todayUtc.getTime()) / DAY_MS);
    if (daysUntil <= 0) return "due_today";
    if (daysUntil <= 2) return "very_near";
    if (daysUntil <= 7) return "near";
  }

  const lastLogged = parseIso(sorted[sorted.length - 1]);
  if (lastLogged && todayUtc) {
    const sinceLast = Math.round((todayUtc.getTime() - lastLogged.getTime()) / DAY_MS);
    if (sinceLast >= 0 && sinceLast <= 3) return "post_period";
  }
  return "normal";
}

function getTodayTaskReminders() {
  const lines = [];
  const insight = getInsights();
  const next = parseIso(insight?.nextStart);
  if (todayUtc && next) {
    const until = Math.round((next.getTime() - todayUtc.getTime()) / DAY_MS);
    if (state.reminders.periodLeadDays.includes(until)) {
      lines.push(`C\u00f2n ${until} ng\u00e0y n\u1eefa d\u1ef1 ki\u1ebfn t\u1edbi k\u1ef3. Nh\u1edb chu\u1ea9n b\u1ecb \u0111\u1ed3 d\u00f9ng c\u1ea7n thi\u1ebft.`);
    }
  }
  if (state.reminders.pill.enabled) {
    lines.push(`Nh\u1eafc thu\u1ed1c tr\u00e1nh thai l\u00fac ${state.reminders.pill.time}.`);
  }
  if (state.reminders.iron.enabled) {
    lines.push(`Nh\u1eafc b\u1ed5 sung s\u1eaft l\u00fac ${state.reminders.iron.time}.`);
  }
  if (state.reminders.padChange.enabled && state.loggedDates.has(todayIso)) {
    lines.push(`Ng\u00e0y \u0111\u1ea7u k\u1ef3: thay b\u0103ng m\u1edbi ${state.reminders.padChange.intervalHours} gi\u1edd.`);
  }
  return lines;
}

function renderReminder(forceNew = false) {
  if (!reminderText) return;
  const category = getReminderCategory();
  const options = reminderMap[category] || reminderMap.normal;
  let text = (!forceNew && reminderText.textContent) ? reminderText.textContent : pickRandom(options);
  const taskLines = getTodayTaskReminders();
  if (taskLines.length) text += `\n\n${taskLines.join("\n")}`;
  reminderText.textContent = text;
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
  const sorted = getSortedLoggedIso().sort((a, b) => b.localeCompare(a));
  if (!sorted.length) {
    const li = document.createElement("li");
    li.textContent = "Ch\u01b0a c\u00f3 ng\u00e0y n\u00e0o.";
    loggedList.appendChild(li);
    return;
  }
  sorted.slice(0, 120).forEach((iso) => {
    const li = document.createElement("li");
    li.textContent = formatVi(iso);
    loggedList.appendChild(li);
  });
}

function renderSymptomList() {
  if (!symptomList) return;
  symptomList.innerHTML = "";
  const entries = Object.entries(state.symptomLogs).sort((a, b) => b[0].localeCompare(a[0]));
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u tri\u1ec7u ch\u1ee9ng.";
    symptomList.appendChild(li);
    return;
  }
  entries.slice(0, 60).forEach(([iso, s]) => {
    const li = document.createElement("li");
    li.textContent = `${formatVi(iso)} | Mood ${s.mood}, \u0110au b\u1ee5ng ${s.cramps}, \u0110au l\u01b0ng ${s.backPain}, M\u1ee5n ${s.acne}, M\u1ea5t ng\u1ee7 ${s.sleep}, D\u1ecbch ${s.discharge}${s.medication ? ` | Thu\u1ed1c: ${s.medication}` : ""}`;
    symptomList.appendChild(li);
  });
}

function renderPredictionSummary() {
  const insight = getInsights();
  if (!insight) {
    nextPeriodLine.textContent = "K\u1ef3 k\u1ebf ti\u1ebfp: ch\u01b0a c\u00f3 d\u1eef li\u1ec7u.";
    fertilityLine.textContent = "C\u1eeda s\u1ed5 d\u1ec5 th\u1ee5 thai: ch\u01b0a c\u00f3 d\u1eef li\u1ec7u.";
    ovulationLine.textContent = "Ng\u00e0y r\u1ee5ng tr\u1ee9ng: ch\u01b0a c\u00f3 d\u1eef li\u1ec7u.";
    return;
  }
  nextPeriodLine.textContent = `K\u1ef3 k\u1ebf ti\u1ebfp: ${formatVi(insight.nextStart)} (sai s\u1ed1 d\u1ef1 ki\u1ebfn ${formatVi(insight.nextRangeStart)} - ${formatVi(insight.nextRangeEnd)}).`;
  fertilityLine.textContent = `C\u1eeda s\u1ed5 d\u1ec5 th\u1ee5 thai: ${formatVi(insight.fertileStart)} - ${formatVi(insight.fertileEnd)}.`;
  ovulationLine.textContent = `Ng\u00e0y r\u1ee5ng tr\u1ee9ng d\u1ef1 ki\u1ebfn: ${formatVi(insight.ovulationDate)}.`;
}

function renderTodayWidget() {
  if (widgetDate) {
    widgetDate.textContent = new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      month: "long",
      weekday: "long",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
  }

  const cycleInfo = getCycleDayInfo();
  if (!cycleInfo) {
    if (widgetCycleChip) widgetCycleChip.textContent = "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u chu k\u1ef3";
    if (widgetPhaseLabel) widgetPhaseLabel.textContent = "R\u1ee5ng tr\u1ee9ng sau";
    if (widgetOvulationCountdown) widgetOvulationCountdown.textContent = "-- ng\u00e0y";
    if (widgetChanceLabel) widgetChanceLabel.textContent = "C\u01a1 h\u1ed9i th\u1ee5 thai: ch\u01b0a x\u00e1c \u0111\u1ecbnh";
    if (quickLogTodayBtn) quickLogTodayBtn.textContent = state.loggedDates.has(todayIso) ? "Bo danh dau h\u00f4m nay" : "Ghi k\u1ef3 kinh h\u00f4m nay";
    return;
  }

  if (widgetCycleChip) widgetCycleChip.textContent = `Ng\u00e0y ${cycleInfo.cycleDay} / ${cycleInfo.cycleLen}`;
  if (widgetPhaseLabel) widgetPhaseLabel.textContent = "R\u1ee5ng tr\u1ee9ng sau";
  if (widgetOvulationCountdown) {
    const dayText = cycleInfo.untilOvulation <= 0 ? "h\u00f4m nay" : `${cycleInfo.untilOvulation} ng\u00e0y`;
    widgetOvulationCountdown.textContent = dayText;
  }
  if (widgetChanceLabel) {
    widgetChanceLabel.textContent = cycleInfo.fertileNow
      ? "C\u01a1 h\u1ed9i th\u1ee5 thai: Cao (\u0111ang trong c\u1eeda s\u1ed5 fertile)"
      : "C\u01a1 h\u1ed9i th\u1ee5 thai: Trung b\u00ecnh/Th\u1ea5p";
  }
  if (quickLogTodayBtn) quickLogTodayBtn.textContent = state.loggedDates.has(todayIso) ? "Bo danh dau h\u00f4m nay" : "Ghi k\u1ef3 kinh h\u00f4m nay";
}

function loadSymptomForm(iso) {
  const symptom = sanitizeSymptomEntry(state.symptomLogs[iso] || {});
  moodLevelInput.value = String(symptom.mood);
  crampsLevelInput.value = String(symptom.cramps);
  backPainLevelInput.value = String(symptom.backPain);
  acneLevelInput.value = String(symptom.acne);
  sleepLevelInput.value = String(symptom.sleep);
  dischargeLevelInput.value = String(symptom.discharge);
  medicationInput.value = symptom.medication || "";
  renderSymptomMeter();
}

function renderCalendar() {
  const monthStart = startOfMonth(state.monthCursor);
  const firstWeekDay = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekDay);
  const gridEnd = addDays(gridStart, 41);
  const meta = getPredictedMeta(gridStart, gridEnd);

  monthTitle.textContent = `Th\u00e1ng ${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}/${monthStart.getUTCFullYear()}`;
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
    if (meta.uncertainSet.has(iso)) btn.classList.add("uncertain");
    if (meta.fertileSet.has(iso)) btn.classList.add("fertile");
    if (meta.ovulationSet.has(iso)) btn.classList.add("ovulation");
    if (meta.predictedSet.has(iso)) btn.classList.add("predicted");
    if (state.loggedDates.has(iso)) btn.classList.add("logged");

    calendarDays.appendChild(btn);
  }
}

function renderForm() {
  anchorDateInput.value = state.anchorDate || "";
  cycleLengthInput.value = String(state.cycleLength);
  periodLengthInput.value = String(state.periodLength);

  logDateInput.value = state.selectedLogDate || todayIso;
  loadSymptomForm(logDateInput.value);

  const leads = state.reminders.periodLeadDays;
  lead1.checked = leads.includes(1);
  lead2.checked = leads.includes(2);
  lead3.checked = leads.includes(3);
  pillEnabled.checked = state.reminders.pill.enabled;
  pillTime.value = state.reminders.pill.time;
  ironEnabled.checked = state.reminders.iron.enabled;
  ironTime.value = state.reminders.iron.time;
  padEnabled.checked = state.reminders.padChange.enabled;
  padInterval.value = String(state.reminders.padChange.intervalHours);
}

function render() {
  renderForm();
  renderCalendar();
  renderList();
  renderSymptomList();
  renderPredictionSummary();
  renderTodayWidget();
  if (reminderPanel?.classList.contains("open")) {
    renderReminder(true);
  }
}

function saveAll() {
  scheduleRemoteSave();
  render();
}

function readSymptomForm() {
  return sanitizeSymptomEntry({
    mood: moodLevelInput.value,
    cramps: crampsLevelInput.value,
    backPain: backPainLevelInput.value,
    acne: acneLevelInput.value,
    sleep: sleepLevelInput.value,
    discharge: dischargeLevelInput.value,
    medication: medicationInput.value,
  });
}

function applyQuickPreset(preset) {
  const map = {
    balanced: {
      mood: 1, cramps: 0, backPain: 0, acne: 1, sleep: 1, discharge: 1, medication: "",
      markPeriod: false,
    },
    "pms-light": {
      mood: 2, cramps: 2, backPain: 1, acne: 2, sleep: 2, discharge: 1, medication: "",
      markPeriod: false,
    },
    "period-heavy": {
      mood: 3, cramps: 5, backPain: 4, acne: 2, sleep: 4, discharge: 2, medication: "Thu\u1ed1c gi\u1ea3m \u0111au (n\u1ebfu c\u00f3)",
      markPeriod: true,
    },
    "period-start": {
      mood: 2, cramps: 3, backPain: 3, acne: 1, sleep: 2, discharge: 1, medication: "",
      markPeriod: true,
    },
  };

  const presetData = map[preset];
  if (!presetData) return false;

  state.selectedLogDate = todayIso;
  if (logDateInput) logDateInput.value = todayIso;
  state.symptomLogs[todayIso] = sanitizeSymptomEntry(presetData);

  if (presetData.markPeriod) state.loggedDates.add(todayIso);

  loadSymptomForm(todayIso);
  if (symptomStatus) symptomStatus.textContent = "\u0110\u00e3 l\u01b0u nhanh h\u00f4m nay";
  if (saveStatus) saveStatus.textContent = "\u0110ang l\u01b0u...";
  saveAll();
  return true;
}

function readReminderForm() {
  const leadDays = [];
  if (lead1.checked) leadDays.push(1);
  if (lead2.checked) leadDays.push(2);
  if (lead3.checked) leadDays.push(3);
  state.reminders = normalizeReminders({
    periodLeadDays: leadDays,
    pill: { enabled: pillEnabled.checked, time: pillTime.value },
    iron: { enabled: ironEnabled.checked, time: ironTime.value },
    padChange: { enabled: padEnabled.checked, intervalHours: padInterval.value },
  });
}

function buildAiAdviceContext() {
  const insight = getInsights();
  const selectedIso = state.selectedLogDate || todayIso;
  return {
    cycleLength: state.cycleLength,
    periodLength: state.periodLength,
    estimatedCycleLength: insight?.cycleLen || state.cycleLength,
    nextPredictedStart: insight?.nextStart || "",
    ovulationDate: insight?.ovulationDate || "",
    fertilityWindow: insight ? { start: insight.fertileStart, end: insight.fertileEnd } : null,
    selectedDate: selectedIso,
    selectedSymptomLog: sanitizeSymptomEntry(state.symptomLogs[selectedIso] || {}),
    recentLoggedDates: getSortedLoggedIso().slice(-12),
    reminders: state.reminders,
  };
}

async function askPeriodAi() {
  const iso = state.selectedLogDate || todayIso;
  const symptom = sanitizeSymptomEntry(state.symptomLogs[iso] || readSymptomForm());
  const message = `H\u00e3y t\u01b0 v\u1ea5n ng\u1eafn g\u1ecdn d\u1ef1a tr\u00ean log ng\u00e0y ${iso}: mood ${symptom.mood}/5, \u0111au b\u1ee5ng ${symptom.cramps}/5, \u0111au l\u01b0ng ${symptom.backPain}/5, m\u1ee5n ${symptom.acne}/5, m\u1ea5t ng\u1ee7 ${symptom.sleep}/5, d\u1ecbch \u00e2m \u0111\u1ea1o ${symptom.discharge}/5, thu\u1ed1c: ${symptom.medication || "kh\u00f4ng"}.`;
  const res = await fetch(PERIOD_AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context: buildAiAdviceContext(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Kh\u00f4ng th\u1ec3 l\u1ea5y t\u01b0 v\u1ea5n AI l\u00fac n\u00e0y.");
  return (data.reply || "").trim();
}

function bindEvents() {
  saveBtn?.addEventListener("click", () => {
    state.anchorDate = parseIso(anchorDateInput.value) ? anchorDateInput.value : "";
    state.cycleLength = clampNum(cycleLengthInput.value, 20, 45, state.cycleLength);
    state.periodLength = clampNum(periodLengthInput.value, 2, 10, state.periodLength);
    readReminderForm();
    if (saveStatus) saveStatus.textContent = "\u0110ang l\u01b0u...";
    saveAll();
  });

  clearBtn?.addEventListener("click", () => {
    state.loggedDates.clear();
    if (saveStatus) saveStatus.textContent = "\u0110ang l\u01b0u...";
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

    state.selectedLogDate = dateIso;
    logDateInput.value = dateIso;
    loadSymptomForm(dateIso);

    if (state.loggedDates.has(dateIso)) {
      state.loggedDates.delete(dateIso);
    } else {
      state.loggedDates.add(dateIso);
    }

    if (saveStatus) saveStatus.textContent = "\u0110ang l\u01b0u...";
    saveAll();
  });

  logDateInput?.addEventListener("change", () => {
    const iso = parseIso(logDateInput.value) ? logDateInput.value : todayIso;
    state.selectedLogDate = iso;
    loadSymptomForm(iso);
  });

  [moodLevelInput, crampsLevelInput, backPainLevelInput, acneLevelInput, sleepLevelInput, dischargeLevelInput].forEach((el) => {
    el?.addEventListener("input", () => {
      renderSymptomMeter();
    });
  });

  saveSymptomBtn?.addEventListener("click", () => {
    const iso = parseIso(logDateInput.value) ? logDateInput.value : todayIso;
    state.selectedLogDate = iso;
    state.symptomLogs[iso] = readSymptomForm();
    readReminderForm();
    if (symptomStatus) symptomStatus.textContent = "\u0110ang l\u01b0u tri\u1ec7u ch\u1ee9ng...";
    saveAll();
  });

  quickLogTodayBtn?.addEventListener("click", () => {
    if (state.loggedDates.has(todayIso)) {
      state.loggedDates.delete(todayIso);
      if (symptomStatus) symptomStatus.textContent = "\u0110\u00e3 b\u1ecf \u0111\u00e1nh d\u1ea5u k\u1ef3 kinh h\u00f4m nay";
    } else {
      state.loggedDates.add(todayIso);
      if (symptomStatus) symptomStatus.textContent = "\u0110\u00e3 \u0111\u00e1nh d\u1ea5u k\u1ef3 kinh h\u00f4m nay";
    }
    if (saveStatus) saveStatus.textContent = "\u0110ang l\u01b0u...";
    saveAll();
  });

  openSymptomTodayBtn?.addEventListener("click", () => {
    state.selectedLogDate = todayIso;
    if (logDateInput) logDateInput.value = todayIso;
    loadSymptomForm(todayIso);
    if (symptomStatus) symptomStatus.textContent = "Dang mo log h\u00f4m nay";
  });

  quickPresetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.quickPreset || "";
      applyQuickPreset(key);
    });
  });

  askAiAdviceBtn?.addEventListener("click", async () => {
    const iso = parseIso(logDateInput.value) ? logDateInput.value : todayIso;
    state.selectedLogDate = iso;
    if (!state.symptomLogs[iso]) {
      state.symptomLogs[iso] = readSymptomForm();
      saveAll();
    }
    if (aiAdviceText) aiAdviceText.textContent = "AI \u0111ang ph\u00e2n t\u00edch d\u1eef li\u1ec7u...";
    try {
      const reply = await askPeriodAi();
      if (aiAdviceText) aiAdviceText.textContent = reply || "AI ch\u01b0a c\u00f3 d\u1eef li\u1ec7u ph\u00f9 h\u1ee3p.";
      if (symptomStatus) symptomStatus.textContent = "\u0110\u00e3 nh\u1eadn t\u01b0 v\u1ea5n AI";
    } catch (err) {
      if (aiAdviceText) aiAdviceText.textContent = `L\u1ed7i AI: ${err.message}`;
    }
  });

  [lead1, lead2, lead3, pillEnabled, pillTime, ironEnabled, ironTime, padEnabled, padInterval].forEach((el) => {
    el?.addEventListener("change", () => {
      readReminderForm();
      saveAll();
    });
  });

  reminderToggle?.addEventListener("click", () => {
    const isOpen = reminderPanel?.classList.toggle("open");
    reminderToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) renderReminder(true);
  });

  reminderRefresh?.addEventListener("click", () => {
    renderReminder(true);
  });
}

async function init() {
  await loadRemote().catch(() => {});

  const anchor = parseIso(state.anchorDate) || parseIso(todayIso);
  state.monthCursor = startOfMonth(anchor);
  state.selectedLogDate = parseIso(state.selectedLogDate) ? state.selectedLogDate : todayIso;

  bindEvents();
  render();
  renderSymptomMeter();

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
    getEstimatedCycleLength: () => {
      const starts = getCycleStartsIso(getSortedLoggedIso());
      return estimateCycleLengthFromStarts(starts);
    },
    setPeriodLength: (n) => {
      state.periodLength = clampNum(n, 2, 10, state.periodLength);
      saveAll();
      return state.periodLength;
    },
  };
}

init();

