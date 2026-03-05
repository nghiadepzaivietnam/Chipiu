(function initMoodMapPage() {
  const API = "/api/mood-map";
  const MOODS = [
    { value: "great", label: "Tuyệt vời" },
    { value: "good", label: "Ổn và vui" },
    { value: "okay", label: "Bình thường" },
    { value: "tired", label: "Hơi mệt" },
    { value: "sad", label: "Buồn" },
    { value: "stressed", label: "Căng thẳng" },
    { value: "angry", label: "Khó chịu" },
  ];
  const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.value, m.label]));

  const form = document.getElementById("moodForm");
  const dateInput = document.getElementById("dateInput");
  const mineMood = document.getElementById("mineMood");
  const partnerMood = document.getElementById("partnerMood");
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

  function renderMoodOptions(selectEl) {
    selectEl.innerHTML = "";
    MOODS.forEach((mood) => {
      const option = document.createElement("option");
      option.value = mood.value;
      option.textContent = mood.label;
      selectEl.appendChild(option);
    });
  }

  function toIsoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function fillForm(entry) {
    const safe = entry || {
      date: dateInput.value || toIsoToday(),
      mineMood: "okay",
      partnerMood: "okay",
      mineReason: "",
      partnerReason: "",
      note: "",
    };
    dateInput.value = safe.date || toIsoToday();
    mineMood.value = safe.mineMood || "okay";
    partnerMood.value = safe.partnerMood || "okay";
    mineReason.value = safe.mineReason || "";
    partnerReason.value = safe.partnerReason || "";
    noteInput.value = safe.note || "";
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
      fillForm(data.todayEntry || { date: data.today || toIsoToday(), mineMood: "okay", partnerMood: "okay" });
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
      mineMood: mineMood.value,
      partnerMood: partnerMood.value,
      mineReason: String(mineReason.value || "").trim(),
      partnerReason: String(partnerReason.value || "").trim(),
      note: String(noteInput.value || "").trim(),
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
        body: JSON.stringify(payload),
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
      fillForm({ date, mineMood: "okay", partnerMood: "okay" });
      renderHistory();
      setStatus("Đã xóa mood ngày đã chọn.");
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  }

  renderMoodOptions(mineMood);
  renderMoodOptions(partnerMood);
  dateInput.value = toIsoToday();
  form.addEventListener("submit", saveData);
  deleteBtn.addEventListener("click", deleteData);
  dateInput.addEventListener("change", () => {
    const found = entries.find((entry) => entry.date === dateInput.value);
    if (found) fillForm(found);
    else fillForm({ date: dateInput.value, mineMood: "okay", partnerMood: "okay" });
  });

  loadData();
})();

