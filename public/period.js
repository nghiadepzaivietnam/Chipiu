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
const reminderToggle = document.getElementById("reminderToggle");
const reminderPanel = document.getElementById("reminderPanel");
const reminderText = document.getElementById("reminderText");
const reminderRefresh = document.getElementById("reminderRefresh");

const todayIso = toIso(new Date());

const state = {
  monthCursor: parseIso(todayIso),
  anchorDate: "",
  cycleLength: 28,
  periodLength: 5,
  loggedDates: new Set(),
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
  if (!state.loggedDates.size) return out;

  const cycle = clampNum(state.cycleLength, 20, 45, 28);
  const period = clampNum(state.periodLength, 2, 10, 5);
  const sortedLogged = Array.from(state.loggedDates).sort();
  const lastLoggedIso = sortedLogged[sortedLogged.length - 1];
  const lastLoggedDate = parseIso(lastLoggedIso);
  if (!lastLoggedDate) return out;

  let cycleStarts = [sortedLogged[0]];
  for (let i = 1; i < sortedLogged.length; i += 1) {
    const prev = parseIso(sortedLogged[i - 1]);
    const cur = parseIso(sortedLogged[i]);
    if (!prev || !cur) continue;
    const gap = Math.round((cur.getTime() - prev.getTime()) / DAY_MS);
    if (gap > 1) cycleStarts.push(sortedLogged[i]);
  }

  if (!cycleStarts.length) return out;
  const cycleStartDates = cycleStarts.map(parseIso).filter(Boolean);
  let estimatedCycle = cycle;
  if (cycleStartDates.length >= 2) {
    const diffs = [];
    for (let i = 1; i < cycleStartDates.length; i += 1) {
      const diff = Math.round((cycleStartDates[i].getTime() - cycleStartDates[i - 1].getTime()) / DAY_MS);
      if (diff >= 20 && diff <= 45) diffs.push(diff);
    }
    if (diffs.length) {
      estimatedCycle = clampNum(
        Math.round(diffs.reduce((sum, d) => sum + d, 0) / diffs.length),
        20,
        45,
        cycle
      );
    }
  }

  let start = cycleStartDates[cycleStartDates.length - 1];
  while (start.getTime() > rangeStart.getTime()) {
    start = addDays(start, -estimatedCycle);
  }

  const endWithBuffer = addDays(rangeEnd, estimatedCycle + period);
  while (start.getTime() <= endWithBuffer.getTime()) {
    for (let i = 0; i < period; i += 1) {
      const day = addDays(start, i);
      if (day >= rangeStart && day <= rangeEnd && day.getTime() > lastLoggedDate.getTime()) {
        out.add(isoFromUtc(day));
      }
    }
    start = addDays(start, estimatedCycle);
  }

  return out;
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
  if (!lastStart) return null;

  let next = new Date(lastStart.getTime());
  const today = parseIso(todayIso);
  if (!today) return null;

  while (next.getTime() <= today.getTime()) {
    next = addDays(next, cycleLen);
  }
  return isoFromUtc(next);
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
    "Bấm vài ngày có kinh gần nhất để mình bắt đầu dự đoán chuẩn hơn cho bạn nha.",
    "Bạn chưa đánh dấu kỳ kinh, hôm nay thử lưu kỳ gần nhất để app học chu kỳ của bạn.",
    "Tip nhẹ: chỉ cần tích đúng 2-3 kỳ gần nhất là dự báo đã ổn hơn rất nhiều.",
    "Mở lịch và chạm vào các ngày có kinh thực tế để tạo dữ liệu cá nhân nhé.",
    "Chưa có dữ liệu thì chưa dự báo, nhưng bắt đầu từ hôm nay là kịp nè.",
    "Bạn càng tích đều thì lời nhắc và dự báo càng đúng theo cơ thể bạn.",
    "Hãy bắt đầu bằng kỳ gần nhất rồi cập nhật dần, không cần nhập một lúc quá nhiều.",
    "Gợi ý: đánh dấu cả ngày bắt đầu và số ngày hành kinh để hệ thống hiểu tốt hơn.",
    "Đừng lo phải nhớ hết, cứ tích được ngày nào thì tích ngày đó nhé.",
    "Một vài lần cập nhật đầu tiên sẽ giúp app tạo nhịp dự báo riêng cho bạn."
  ],
  in_period: [
    "Hôm nay có thể là ngày trong kỳ, nhớ uống đủ nước ấm và nghỉ ngơi thêm một chút.",
    "Nếu bụng khó chịu, bạn có thể chườm ấm và giảm đồ uống lạnh hôm nay nhé.",
    "Ngày trong kỳ: ưu tiên ngủ sớm, ăn nhẹ và giữ cơ thể thoải mái.",
    "Bạn đang trong giai đoạn nhạy cảm, đừng ép bản thân làm quá sức nha.",
    "Nhớ theo dõi lượng đau và năng lượng cơ thể để chăm sóc mình tốt hơn.",
    "Một ly nước ấm và vài phút thở sâu có thể giúp dễ chịu hơn đó.",
    "Nếu mệt, cho phép bản thân chậm lại một nhịp hôm nay nhé.",
    "Bạn có thể ghi chú triệu chứng hôm nay để theo dõi chu kỳ rõ hơn.",
    "Đây là lúc nên yêu chiều cơ thể: ăn đủ bữa và nghỉ ngơi hợp lý.",
    "Nếu đau kéo dài bất thường, cân nhắc theo dõi thêm và hỏi bác sĩ."
  ],
  due_today: [
    "Dự báo hôm nay có thể bắt đầu kỳ mới, chuẩn bị sẵn đồ cần thiết nhé.",
    "Hôm nay là ngày sát chu kỳ, bạn nhớ mang theo băng/tampon/cốc nguyệt san.",
    "Có khả năng bắt đầu kỳ hôm nay, ưu tiên lịch làm việc nhẹ nhàng hơn một chút.",
    "Đến ngày dự báo rồi nè, nhớ ngủ đủ và hạn chế thức khuya tối nay.",
    "Nếu hôm nay chưa tới ngay thì cũng đang rất gần, cứ chuẩn bị trước cho yên tâm.",
    "Nhắc nhẹ: chuẩn bị túi nhỏ dự phòng để không bị động khi ra ngoài.",
    "Chu kỳ dự báo rơi vào hôm nay, bạn kiểm tra cơ thể và điều chỉnh sinh hoạt nhé.",
    "Đây là mốc dự báo gần nhất, ghi chú lại thực tế để lần sau chính xác hơn.",
    "Hôm nay nên ưu tiên đồ ăn dễ tiêu và uống đủ nước.",
    "Ngày dự báo đã tới, hãy chăm sóc bản thân nhẹ nhàng hơn bình thường."
  ],
  very_near: [
    "Còn rất gần tới kỳ, bạn có thể chuẩn bị trước đồ cần thiết từ hôm nay.",
    "Sắp tới ngày rồi, nhớ ngủ sớm và giảm cà phê nếu bạn hay nhạy cảm.",
    "Bạn đang ở giai đoạn cận kỳ, giữ lịch làm việc thoáng hơn sẽ dễ chịu hơn.",
    "Nếu hay đau bụng trước kỳ, hôm nay có thể bắt đầu chườm ấm nhẹ.",
    "Sắp tới kỳ kinh, ưu tiên uống đủ nước và ăn đủ bữa nhé.",
    "Đây là vài ngày dễ mệt, đừng quên cho cơ thể thời gian nghỉ.",
    "Chu kỳ đang đến gần, bạn theo dõi tâm trạng và năng lượng để chủ động hơn.",
    "Bạn có thể chuẩn bị quần áo thoải mái cho vài ngày tới.",
    "Nhắc nhẹ: kiểm tra lịch cá nhân để tránh dồn việc sát ngày.",
    "Giai đoạn gần kỳ rồi, chăm sóc bản thân thêm một chút nha."
  ],
  near: [
    "Khoảng 1 tuần nữa là tới kỳ dự báo, mình chuẩn bị dần từ bây giờ nhé.",
    "Bạn đang trong tuần cận kỳ, giữ nhịp sinh hoạt đều sẽ đỡ mệt hơn.",
    "Đây là lúc tốt để chuẩn bị vật dụng cần thiết cho kỳ tới.",
    "Nhớ uống nước đều và hạn chế bỏ bữa để cơ thể ổn định hơn.",
    "Tuần này nên ưu tiên giấc ngủ vì sắp bước vào giai đoạn nhạy cảm.",
    "Bạn có thể lên kế hoạch nhẹ nhàng cho những ngày gần kỳ sắp tới.",
    "Nếu dễ cáu gắt trước kỳ, thử giảm áp lực công việc tuần này nhé.",
    "Chu kỳ dự báo đang tiến gần, bạn đang làm rất tốt việc theo dõi đó.",
    "Nhắc nhẹ: dành thời gian thư giãn để giảm stress trước kỳ.",
    "Sắp đến kỳ mới, cứ chuẩn bị từ sớm để luôn chủ động."
  ],
  post_period: [
    "Bạn vừa qua kỳ gần đây, nhớ ăn uống đủ chất để hồi sức nhé.",
    "Sau kỳ kinh, cơ thể cần phục hồi năng lượng nên đừng bỏ bữa nha.",
    "Giai đoạn sau kỳ là lúc tốt để quay lại nhịp vận động nhẹ.",
    "Nếu còn mệt sau kỳ, hãy cho bản thân thêm thời gian nghỉ.",
    "Bạn vừa cập nhật kỳ mới, dữ liệu lần sau sẽ dự báo chuẩn hơn nữa.",
    "Cảm ơn bạn đã ghi lại chu kỳ, thói quen này rất có ích về lâu dài.",
    "Sau kỳ là thời điểm tốt để theo dõi lại giấc ngủ và mức năng lượng.",
    "Một chút vận động nhẹ và uống đủ nước sẽ giúp cơ thể cân bằng lại.",
    "Bạn đã làm rất tốt việc theo dõi, cứ duy trì đều là ổn.",
    "Giai đoạn này thường dễ chịu hơn, tận dụng để chăm sóc bản thân nhé."
  ],
  normal: [
    "Hôm nay là một ngày ổn định, cứ giữ nhịp sinh hoạt đều như hiện tại nhé.",
    "Bạn đang theo dõi chu kỳ rất tốt, duy trì đều đặn là đủ tuyệt vời rồi.",
    "Nhắc nhẹ: ngủ đủ giấc luôn giúp chu kỳ ổn định hơn.",
    "Duy trì uống nước và vận động nhẹ mỗi ngày là quá tốt rồi.",
    "Một ngày bình thường nhưng vẫn nhớ yêu chiều cơ thể mình nha.",
    "Bạn có thể ghi chú cảm xúc hôm nay để hiểu cơ thể rõ hơn.",
    "Theo dõi đều tay như hiện tại sẽ giúp dự báo ngày càng chuẩn.",
    "Cơ thể bạn đang ở pha khá ổn, cứ giữ thói quen tốt nhé.",
    "Bạn đang làm rất đúng: theo dõi đều, không áp lực, nhưng có hệ thống.",
    "Ngày hôm nay chưa cần chuẩn bị gì đặc biệt, cứ thoải mái nha."
  ]
};

function getReminderCategory() {
  const sorted = getSortedLoggedIso();
  if (!sorted.length) return "no_data";
  if (state.loggedDates.has(todayIso)) return "in_period";

  const nextIso = getNextPredictedStartIso();
  const today = parseIso(todayIso);
  const next = parseIso(nextIso);

  if (today && next) {
    const daysUntil = Math.round((next.getTime() - today.getTime()) / DAY_MS);
    if (daysUntil <= 0) return "due_today";
    if (daysUntil <= 2) return "very_near";
    if (daysUntil <= 7) return "near";
  }

  const lastLogged = parseIso(sorted[sorted.length - 1]);
  if (lastLogged && today) {
    const sinceLast = Math.round((today.getTime() - lastLogged.getTime()) / DAY_MS);
    if (sinceLast >= 0 && sinceLast <= 3) return "post_period";
  }
  return "normal";
}

function renderReminder(forceNew = false) {
  if (!reminderText) return;
  const category = getReminderCategory();
  const options = reminderMap[category] || reminderMap.normal;
  if (!forceNew && reminderText.textContent) return;
  reminderText.textContent = pickRandom(options);
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
  anchorDateInput.value = state.anchorDate || "";
  cycleLengthInput.value = String(state.cycleLength);
  periodLengthInput.value = String(state.periodLength);
}

function render() {
  renderForm();
  renderCalendar();
  renderList();
  if (reminderPanel?.classList.contains("open")) {
    renderReminder(true);
  }
}

function saveAll() {
  saveLocal();
  scheduleRemoteSave();
  render();
}

function bindEvents() {
  saveBtn?.addEventListener("click", () => {
    state.anchorDate = parseIso(anchorDateInput.value) ? anchorDateInput.value : "";
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

  reminderToggle?.addEventListener("click", () => {
    const isOpen = reminderPanel?.classList.toggle("open");
    reminderToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      renderReminder(true);
    }
  });

  reminderRefresh?.addEventListener("click", () => {
    renderReminder(true);
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
