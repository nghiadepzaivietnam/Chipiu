(function initMoodMapPage() {
  const API = "/api/mood-map";
  const MOODS = [
    { value: "ecstatic", label: "Phấn khích" },
    { value: "loved", label: "Được yêu thương" },
    { value: "happy", label: "Vui vẻ" },
    { value: "calm", label: "Bình yên" },
    { value: "okay", label: "Bình thường" },
    { value: "sensitive", label: "Nhạy cảm" },
    { value: "tired", label: "Mệt mỏi" },
    { value: "overthinking", label: "Suy nghĩ nhiều" },
    { value: "stressed", label: "Căng thẳng" },
    { value: "sad", label: "Buồn" },
    { value: "angry", label: "Khó chịu" },
    { value: "lonely", label: "Cô đơn" },
    { value: "numb", label: "Trống rỗng" }
  ];

  const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.value, m.label]));
  const DEFAULT_MOOD = "okay";

  const form = document.getElementById("moodForm");
  const dateInput = document.getElementById("dateInput");
  const mineMoodRange = document.getElementById("mineMoodRange");
  const partnerMoodRange = document.getElementById("partnerMoodRange");
  const mineMoodLabel = document.getElementById("mineMoodLabel");
  const partnerMoodLabel = document.getElementById("partnerMoodLabel");
  const mineReason = document.getElementById("mineReason");
  const partnerReason = document.getElementById("partnerReason");
  const noteInput = document.getElementById("note");
  const deleteBtn = document.getElementById("deleteBtn");
  const historyList = document.getElementById("historyList");
  const statusText = document.getElementById("statusText");

  let entries = [];

  function setStatus(msg) {
    if (statusText) statusText.textContent = msg || "";
  }

  function toIsoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function moodAt(indexLike) {
    const i = Number(indexLike);
    if (!Number.isFinite(i)) return MOODS[4];
    const safe = Math.min(MOODS.length - 1, Math.max(0, Math.round(i)));
    return MOODS[safe];
  }

  function moodIndexByValue(value) {
    const idx = MOODS.findIndex((m) => m.value === value);
    return idx >= 0 ? idx : 4;
  }

  function refreshSliderLabels() {
    mineMoodLabel.textContent = moodAt(mineMoodRange.value).label;
    partnerMoodLabel.textContent = moodAt(partnerMoodRange.value).label;
  }

  function fillForm(entry) {
    const safe = entry || {
      date: dateInput.value || toIsoToday(),
      mineMood: DEFAULT_MOOD,
      partnerMood: DEFAULT_MOOD,
      mineReason: "",
      partnerReason: "",
      note: ""
    };

    dateInput.value = safe.date || toIsoToday();
    mineMoodRange.value = String(moodIndexByValue(safe.mineMood));
    partnerMoodRange.value = String(moodIndexByValue(safe.partnerMood));
    mineReason.value = safe.mineReason || "";
    partnerReason.value = safe.partnerReason || "";
    noteInput.value = safe.note || "";
    refreshSliderLabels();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = "Chưa có dữ liệu mood. Bắt đầu lưu ngày đầu tiên nhé.";
      historyList.appendChild(empty);
      return;
    }

    entries.slice(0, 20).forEach((entry) => {
      const item = document.createElement("article");
      item.className = "item";
      const mine = MOOD_LABEL[entry.mineMood] || entry.mineMood || "Bình thường";
      const partner = MOOD_LABEL[entry.partnerMood] || entry.partnerMood || "Bình thường";
      const mineReasonText = entry.mineReason ? ` | Lý do bạn: ${entry.mineReason}` : "";
      const partnerReasonText = entry.partnerReason ? ` | Lý do cô ấy: ${entry.partnerReason}` : "";
      const noteText = entry.note ? ` | Ghi chú: ${entry.note}` : "";

      item.innerHTML = `
        <h3>${entry.date}</h3>
        <p class="meta">Bạn: <strong>${mine}</strong> | Cô ấy: <strong>${partner}</strong>${mineReasonText}${partnerReasonText}${noteText}</p>
      `;

      item.addEventListener("click", () => fillForm(entry));
      historyList.appendChild(item);
    });
  }

  async function loadData() {
    setStatus("Đang tải dữ liệu mood...");
    try {
      const res = await fetch(API);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không thể tải mood map.");
      entries = Array.isArray(data.entries) ? data.entries : [];
      fillForm(data.todayEntry || { date: data.today || toIsoToday(), mineMood: DEFAULT_MOOD, partnerMood: DEFAULT_MOOD });
      renderHistory();
      setStatus("");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  }

  async function saveData(event) {
    event.preventDefault();
    const payload = {
      date: String(dateInput.value || "").trim(),
      mineMood: moodAt(mineMoodRange.value).value,
      partnerMood: moodAt(partnerMoodRange.value).value,
      mineReason: String(mineReason.value || "").trim(),
      partnerReason: String(partnerReason.value || "").trim(),
      note: String(noteInput.value || "").trim()
    };

    if (!payload.date) {
      setStatus("Bạn cần chọn ngày.");
      return;
    }

    setStatus("Đang lưu mood...");
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lưu mood thất bại.");
      entries = Array.isArray(data.entries) ? data.entries : entries;
      renderHistory();
      setStatus("Đã lưu mood vào database.");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  }

  async function deleteData() {
    const date = String(dateInput.value || "").trim();
    if (!date) {
      setStatus("Chọn ngày cần xóa trước.");
      return;
    }

    const ok = window.confirm(`Xóa mood của ngày ${date}?`);
    if (!ok) return;

    setStatus("Đang xóa mood...");
    try {
      const res = await fetch(`${API}/${encodeURIComponent(date)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xóa mood thất bại.");
      entries = Array.isArray(data.entries) ? data.entries : entries;
      fillForm({ date, mineMood: DEFAULT_MOOD, partnerMood: DEFAULT_MOOD });
      renderHistory();
      setStatus("Đã xóa mood ngày đã chọn.");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  }

  mineMoodRange.max = String(MOODS.length - 1);
  partnerMoodRange.max = String(MOODS.length - 1);
  mineMoodRange.addEventListener("input", refreshSliderLabels);
  partnerMoodRange.addEventListener("input", refreshSliderLabels);

  dateInput.value = toIsoToday();
  form.addEventListener("submit", saveData);
  deleteBtn.addEventListener("click", deleteData);
  dateInput.addEventListener("change", () => {
    const found = entries.find((entry) => entry.date === dateInput.value);
    if (found) fillForm(found);
    else fillForm({ date: dateInput.value, mineMood: DEFAULT_MOOD, partnerMood: DEFAULT_MOOD });
  });

  refreshSliderLabels();
  loadData();
})();