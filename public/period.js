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
  if (value <= 1) return "Ổn";
  if (value <= 3) return "Vừa";
  return "Nặng";
}

function paintSlider(input, valueEl) {
  if (!input) return;
  const value = clampNum(input.value, 0, 5, 0);
  const fill = `${(value / 5) * 100}%`;
  input.style.setProperty("--range-fill", fill);
  if (valueEl) valueEl.textContent = `${value} • ${describeLevel(value)}`;
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
        if (saveStatus) saveStatus.textContent = "Da luu";
        if (symptomStatus) symptomStatus.textContent = "Du lieu da dong bo";
      })
      .catch(() => {
        if (saveStatus) saveStatus.textContent = "Luu that bai, thu lai sau";
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
    "Bam vai ngay co kinh gan nhat de minh bat dau du doan chuan hon cho ban nha.",
    "Ban chua danh dau ky kinh, hom nay thu luu ky gan nhat de app hoc chu ky cua ban.",
    "Tip nhe: chi can tich dung 2-3 ky gan nhat la du bao da on hon rat nhieu.",
  ],
  in_period: [
    "Hom nay co the la ngay trong ky, nho uong du nuoc am va nghi ngoi them mot chut.",
    "Neu bung kho chiu, ban co the chuom am va giam do uong lanh hom nay nhe.",
    "Ngay trong ky: uu tien ngu som, an nhe va giu co the thoai mai.",
  ],
  due_today: [
    "Du bao hom nay co the bat dau ky moi, chuan bi san do can thiet nhe.",
    "Hom nay la ngay sat chu ky, ban nho mang theo bang/tampon/coc nguyet san.",
    "Co kha nang bat dau ky hom nay, uu tien lich lam viec nhe nhang hon mot chut.",
  ],
  very_near: [
    "Con rat gan toi ky, ban co the chuan bi truoc do can thiet tu hom nay.",
    "Sap toi ngay roi, nho ngu som va giam ca phe neu ban hay nhay cam.",
    "Ban dang o giai doan can ky, giu lich lam viec thoang hon se de chiu hon.",
  ],
  near: [
    "Khoang 1 tuan nua la toi ky du bao, minh chuan bi dan tu bay gio nhe.",
    "Ban dang trong tuan can ky, giu nhip sinh hoat deu se do met hon.",
    "Day la luc tot de chuan bi vat dung can thiet cho ky toi.",
  ],
  post_period: [
    "Ban vua qua ky gan day, nho an uong du chat de hoi suc nhe.",
    "Sau ky kinh, co the can phuc hoi nang luong nen dung bo bua nha.",
    "Giai doan sau ky la luc tot de quay lai nhip van dong nhe.",
  ],
  normal: [
    "Hom nay la mot ngay on dinh, cu giu nhip sinh hoat deu nhu hien tai nhe.",
    "Ban dang theo doi chu ky rat tot, duy tri deu dan la du tuyet voi roi.",
    "Nhac nhe: ngu du giac luon giup chu ky on dinh hon.",
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
      lines.push(`Con ${until} ngay nua du kien toi ky. Nho chuan bi do dung can thiet.`);
    }
  }
  if (state.reminders.pill.enabled) {
    lines.push(`Nhac thuoc tranh thai luc ${state.reminders.pill.time}.`);
  }
  if (state.reminders.iron.enabled) {
    lines.push(`Nhac bo sung sat luc ${state.reminders.iron.time}.`);
  }
  if (state.reminders.padChange.enabled && state.loggedDates.has(todayIso)) {
    lines.push(`Ngay dau ky: thay bang moi ${state.reminders.padChange.intervalHours} gio.`);
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
    li.textContent = "Chua co ngay nao.";
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
    li.textContent = "Chua co du lieu trieu chung.";
    symptomList.appendChild(li);
    return;
  }
  entries.slice(0, 60).forEach(([iso, s]) => {
    const li = document.createElement("li");
    li.textContent = `${formatVi(iso)} | Mood ${s.mood}, Dau bung ${s.cramps}, Dau lung ${s.backPain}, Mun ${s.acne}, Mat ngu ${s.sleep}, Dich ${s.discharge}${s.medication ? ` | Thuoc: ${s.medication}` : ""}`;
    symptomList.appendChild(li);
  });
}

function renderPredictionSummary() {
  const insight = getInsights();
  if (!insight) {
    nextPeriodLine.textContent = "Ky ke tiep: chua co du lieu.";
    fertilityLine.textContent = "Cua so de thu thai: chua co du lieu.";
    ovulationLine.textContent = "Ngay rung trung: chua co du lieu.";
    return;
  }
  nextPeriodLine.textContent = `Ky ke tiep: ${formatVi(insight.nextStart)} (sai so du kien ${formatVi(insight.nextRangeStart)} - ${formatVi(insight.nextRangeEnd)}).`;
  fertilityLine.textContent = `Cua so de thu thai: ${formatVi(insight.fertileStart)} - ${formatVi(insight.fertileEnd)}.`;
  ovulationLine.textContent = `Ngay rung trung du kien: ${formatVi(insight.ovulationDate)}.`;
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
    if (widgetCycleChip) widgetCycleChip.textContent = "Chua co du lieu chu ky";
    if (widgetPhaseLabel) widgetPhaseLabel.textContent = "Rung trung sau";
    if (widgetOvulationCountdown) widgetOvulationCountdown.textContent = "-- ngay";
    if (widgetChanceLabel) widgetChanceLabel.textContent = "Co hoi thu thai: chua xac dinh";
    if (quickLogTodayBtn) quickLogTodayBtn.textContent = state.loggedDates.has(todayIso) ? "Bo danh dau hom nay" : "Ghi ky kinh hom nay";
    return;
  }

  if (widgetCycleChip) widgetCycleChip.textContent = `Ngay ${cycleInfo.cycleDay} / ${cycleInfo.cycleLen}`;
  if (widgetPhaseLabel) widgetPhaseLabel.textContent = "Rung trung sau";
  if (widgetOvulationCountdown) {
    const dayText = cycleInfo.untilOvulation <= 0 ? "hom nay" : `${cycleInfo.untilOvulation} ngay`;
    widgetOvulationCountdown.textContent = dayText;
  }
  if (widgetChanceLabel) {
    widgetChanceLabel.textContent = cycleInfo.fertileNow
      ? "Co hoi thu thai: Cao (dang trong cua so fertile)"
      : "Co hoi thu thai: Trung binh/Thap";
  }
  if (quickLogTodayBtn) quickLogTodayBtn.textContent = state.loggedDates.has(todayIso) ? "Bo danh dau hom nay" : "Ghi ky kinh hom nay";
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

  monthTitle.textContent = `Thang ${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}/${monthStart.getUTCFullYear()}`;
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
      mood: 3, cramps: 5, backPain: 4, acne: 2, sleep: 4, discharge: 2, medication: "Thuoc giam dau (neu co)",
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
  if (symptomStatus) symptomStatus.textContent = "Da luu nhanh hom nay";
  if (saveStatus) saveStatus.textContent = "Dang luu...";
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
  const message = `Hay tu van ngan gon dua tren log ngay ${iso}: mood ${symptom.mood}/5, dau bung ${symptom.cramps}/5, dau lung ${symptom.backPain}/5, mun ${symptom.acne}/5, mat ngu ${symptom.sleep}/5, dich am dao ${symptom.discharge}/5, thuoc: ${symptom.medication || "khong"}.`;
  const res = await fetch(PERIOD_AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context: buildAiAdviceContext(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Khong the lay tu van AI luc nay.");
  return (data.reply || "").trim();
}

function bindEvents() {
  saveBtn?.addEventListener("click", () => {
    state.anchorDate = parseIso(anchorDateInput.value) ? anchorDateInput.value : "";
    state.cycleLength = clampNum(cycleLengthInput.value, 20, 45, state.cycleLength);
    state.periodLength = clampNum(periodLengthInput.value, 2, 10, state.periodLength);
    readReminderForm();
    if (saveStatus) saveStatus.textContent = "Dang luu...";
    saveAll();
  });

  clearBtn?.addEventListener("click", () => {
    state.loggedDates.clear();
    if (saveStatus) saveStatus.textContent = "Dang luu...";
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

    if (saveStatus) saveStatus.textContent = "Dang luu...";
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
    if (symptomStatus) symptomStatus.textContent = "Dang luu trieu chung...";
    saveAll();
  });

  quickLogTodayBtn?.addEventListener("click", () => {
    if (state.loggedDates.has(todayIso)) {
      state.loggedDates.delete(todayIso);
      if (symptomStatus) symptomStatus.textContent = "Da bo danh dau ky kinh hom nay";
    } else {
      state.loggedDates.add(todayIso);
      if (symptomStatus) symptomStatus.textContent = "Da danh dau ky kinh hom nay";
    }
    if (saveStatus) saveStatus.textContent = "Dang luu...";
    saveAll();
  });

  openSymptomTodayBtn?.addEventListener("click", () => {
    state.selectedLogDate = todayIso;
    if (logDateInput) logDateInput.value = todayIso;
    loadSymptomForm(todayIso);
    if (symptomStatus) symptomStatus.textContent = "Dang mo log hom nay";
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
    if (aiAdviceText) aiAdviceText.textContent = "AI dang phan tich du lieu...";
    try {
      const reply = await askPeriodAi();
      if (aiAdviceText) aiAdviceText.textContent = reply || "AI chua co du lieu phu hop.";
      if (symptomStatus) symptomStatus.textContent = "Da nhan tu van AI";
    } catch (err) {
      if (aiAdviceText) aiAdviceText.textContent = `Loi AI: ${err.message}`;
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
