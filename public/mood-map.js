(function initMoodMapPage() {
  const API = "/api/mood-map";
  const MOODS = [
    { value: "ecstatic", label: "Phấn khích", icon: "🤩" },
    { value: "loved", label: "Được yêu thương", icon: "🥰" },
    { value: "happy", label: "Vui vẻ", icon: "😄" },
    { value: "calm", label: "Bình yên", icon: "😌" },
    { value: "grateful", label: "Biết ơn", icon: "🙏" },
    { value: "hopeful", label: "Hy vọng", icon: "🫤" },
    { value: "playful", label: "Tinh nghịch", icon: "😜" },
    { value: "okay", label: "Bình thường", icon: "🙂" },
    { value: "sensitive", label: "Nhạy cảm", icon: "😺" },
    { value: "hormonal", label: "Hormone thất thường", icon: "🌀" },
    { value: "anxious", label: "Lo âu", icon: "😟" },
    { value: "insecure", label: "Bất an", icon: "🫤" },
    { value: "overthinking", label: "Suy nghĩ nhiều", icon: "🧠" },
    { value: "overwhelmed", label: "Quá tải", icon: "😵‍💫" },
    { value: "stressed", label: "Căng thẳng", icon: "😣" },
    { value: "tired", label: "Mệt mỏi", icon: "😪" },
    { value: "drained", label: "Kiệt sức", icon: "🫠" },
    { value: "sad", label: "Buồn", icon: "😢" },
    { value: "lonely", label: "Cô đơn", icon: "😹" },
    { value: "angry", label: "Khó chịu", icon: "😠" },
    { value: "numb", label: "Trống rỗng", icon: "😶" }
  ];

  const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.value, m]));
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

  function mountMoodLegend() {
    const historyCard = historyList?.closest(".card");
    if (!historyCard) return;
    if (historyCard.querySelector("[data-mood-legend='true']")) return;

    const legend = document.createElement("article");
    legend.className = "item";
    legend.setAttribute("data-mood-legend", "true");

    const cells = MOODS.map((m) => {
      return `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #f0dce3;border-radius:999px;background:#fff;">
        <span>${m.icon}</span><span>${m.label}</span>
      </span>`;
    }).join("");

    legend.innerHTML = `
      <h3 style="margin-bottom:8px;">Bảng mood kèm icon</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">${cells}</div>
    `;

    historyCard.insertBefore(legend, historyList);
  }

  function setStatus(msg) {
    if (statusText) statusText.textContent = msg || "";
  }

  function buildFunMoodResponse(partnerMood) {
    const mood = String(partnerMood || "").trim().toLowerCase();
    const sadSet = new Set(["sad", "lonely", "numb"]);
    const happySet = new Set(["happy", "ecstatic", "loved", "playful", "grateful", "hopeful"]);

    if (sadSet.has(mood)) {
      return "Cảnh báo: Hải Anh buồn. Nguyễn Trọng Nghĩa cần bật chế độ siêu yêu.";
    }
    if (happySet.has(mood)) {
      return "Hải Anh đang hạnh phúc. Có thể do Nghĩa đẹp trai.";
    }
    return "";
  }

  function toIsoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function moodAt(indexLike) {
    const i = Number(indexLike);
    if (!Number.isFinite(i)) return MOODS[7];
    const safe = Math.min(MOODS.length - 1, Math.max(0, Math.round(i)));
    return MOODS[safe];
  }

  function moodIndexByValue(value) {
    const idx = MOODS.findIndex((m) => m.value === value);
    return idx >= 0 ? idx : 7;
  }

  function moodDisplay(value) {
    const m = MOOD_MAP[value] || MOOD_MAP[DEFAULT_MOOD];
    return `${m.icon} ${m.label}`;
  }

  function refreshSliderLabels() {
    mineMoodLabel.textContent = moodDisplay(moodAt(mineMoodRange.value).value);
    partnerMoodLabel.textContent = moodDisplay(moodAt(partnerMoodRange.value).value);
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
      const mine = moodDisplay(entry.mineMood);
      const partner = moodDisplay(entry.partnerMood);
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
      const funReply = buildFunMoodResponse(payload.partnerMood);
      setStatus(funReply ? `Đã lưu mood. ${funReply}` : "Đã lưu mood vào database.");
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

  mountMoodLegend();
  refreshSliderLabels();
  loadData();
})();