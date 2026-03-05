(function initMoodMapPage() {
  const API = "/api/mood-map";
  const MOODS = [
    { value: "ecstatic", label: "PhÃƒÂ¡Ã‚ÂºÃ‚Â¥n khÃƒÆ’Ã‚Â­ch", icon: "ÃƒÂ°Ã…Â¸Ã‚Â¤Ã‚Â©" },
    { value: "loved", label: "Ãƒâ€žÃ‚ÂÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c yÃƒÆ’Ã‚Âªu thÃƒâ€ Ã‚Â°Ãƒâ€ Ã‚Â¡ng", icon: "ÃƒÂ°Ã…Â¸Ã‚Â¥Ã‚Â°" },
    { value: "happy", label: "Vui vÃƒÂ¡Ã‚ÂºÃ‚Â»", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã¢â‚¬Å¾" },
    { value: "calm", label: "BÃƒÆ’Ã‚Â¬nh yÃƒÆ’Ã‚Âªn", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã…â€™" },
    { value: "grateful", label: "BiÃƒÂ¡Ã‚ÂºÃ‚Â¿t Ãƒâ€ Ã‚Â¡n", icon: "ÃƒÂ°Ã…Â¸Ã¢â€žÂ¢Ã‚Â" },
    { value: "hopeful", label: "Hy vÃƒÂ¡Ã‚Â»Ã‚Âng", icon: "ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â¤ÃƒÂ¯Ã‚Â¸Ã‚Â" },
    { value: "playful", label: "TÃƒâ€ Ã‚Â°Ãƒâ€ Ã‚Â¡i nghÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¹ch", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã…â€œ" },
    { value: "okay", label: "BÃƒÆ’Ã‚Â¬nh thÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âng", icon: "ÃƒÂ°Ã…Â¸Ã¢â€žÂ¢Ã¢â‚¬Å¡" },
    { value: "sensitive", label: "NhÃƒÂ¡Ã‚ÂºÃ‚Â¡y cÃƒÂ¡Ã‚ÂºÃ‚Â£m", icon: "ÃƒÂ°Ã…Â¸Ã‚Â¥Ã‚Âº" },
    { value: "hormonal", label: "Hormone thÃƒÂ¡Ã‚ÂºÃ‚Â¥t thÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âng", icon: "ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â¸" },
    { value: "anxious", label: "Lo ÃƒÆ’Ã‚Â¢u", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã…Â¸" },
    { value: "insecure", label: "BÃƒÂ¡Ã‚ÂºÃ‚Â¥t an", icon: "ÃƒÂ°Ã…Â¸Ã‚Â«Ã‚Â¤" },
    { value: "overthinking", label: "Suy nghÃƒâ€žÃ‚Â© nhiÃƒÂ¡Ã‚Â»Ã‚Âu", icon: "ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â " },
    { value: "overwhelmed", label: "QuÃƒÆ’Ã‚Â¡ tÃƒÂ¡Ã‚ÂºÃ‚Â£i", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚ÂµÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â«" },
    { value: "stressed", label: "CÃƒâ€žÃ†â€™ng thÃƒÂ¡Ã‚ÂºÃ‚Â³ng", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚Â£" },
    { value: "tired", label: "MÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡t mÃƒÂ¡Ã‚Â»Ã‚Âi", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚Âª" },
    { value: "drained", label: "KiÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡t sÃƒÂ¡Ã‚Â»Ã‚Â©c", icon: "ÃƒÂ°Ã…Â¸Ã‚Â«Ã‚Â " },
    { value: "sad", label: "BuÃƒÂ¡Ã‚Â»Ã¢â‚¬Å“n", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚Â¢" },
    { value: "lonely", label: "CÃƒÆ’Ã‚Â´ Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â¡n", icon: "ÃƒÂ°Ã…Â¸Ã‚Â¥Ã‚Â¹" },
    { value: "angry", label: "KhÃƒÆ’Ã‚Â³ chÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¹u", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚Â " },
    { value: "numb", label: "TrÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœng rÃƒÂ¡Ã‚Â»Ã¢â‚¬â€ng", icon: "ÃƒÂ°Ã…Â¸Ã‹Å“Ã‚Â¶" }
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
      <h3 style="margin-bottom:8px;">BÃƒÂ¡Ã‚ÂºÃ‚Â£ng mood kÃƒÆ’Ã‚Â¨m icon</h3>
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
      return "CÃ¡ÂºÂ£nh bÃƒÂ¡o: HÃ¡ÂºÂ£i Anh buÃ¡Â»â€œn. NguyÃ¡Â»â€¦n TrÃ¡Â»Âng NghÃ„Â©a cÃ¡ÂºÂ§n bÃ¡ÂºÂ­t chÃ¡ÂºÂ¿ Ã„â€˜Ã¡Â»â„¢ siÃƒÂªu yÃƒÂªu.";
    }
    if (happySet.has(mood)) {
      return "HÃ¡ÂºÂ£i Anh Ã„â€˜ang hÃ¡ÂºÂ¡nh phÃƒÂºc. CÃƒÂ³ thÃ¡Â»Æ’ do NghÃ„Â©a Ã„â€˜Ã¡ÂºÂ¹p trai.";
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
      empty.textContent = "ChÃƒâ€ Ã‚Â°a cÃƒÆ’Ã‚Â³ dÃƒÂ¡Ã‚Â»Ã‚Â¯ liÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡u mood. BÃƒÂ¡Ã‚ÂºÃ‚Â¯t Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚ÂºÃ‚Â§u lÃƒâ€ Ã‚Â°u ngÃƒÆ’Ã‚Â y Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚ÂºÃ‚Â§u tiÃƒÆ’Ã‚Âªn nhÃƒÆ’Ã‚Â©.";
      historyList.appendChild(empty);
      return;
    }

    entries.slice(0, 20).forEach((entry) => {
      const item = document.createElement("article");
      item.className = "item";
      const mine = moodDisplay(entry.mineMood);
      const partner = moodDisplay(entry.partnerMood);
      const mineReasonText = entry.mineReason ? ` | LÃƒÆ’Ã‚Â½ do bÃƒÂ¡Ã‚ÂºÃ‚Â¡n: ${entry.mineReason}` : "";
      const partnerReasonText = entry.partnerReason ? ` | LÃƒÆ’Ã‚Â½ do cÃƒÆ’Ã‚Â´ ÃƒÂ¡Ã‚ÂºÃ‚Â¥y: ${entry.partnerReason}` : "";
      const noteText = entry.note ? ` | Ghi chÃƒÆ’Ã‚Âº: ${entry.note}` : "";

      item.innerHTML = `
        <h3>${entry.date}</h3>
        <p class="meta">BÃƒÂ¡Ã‚ÂºÃ‚Â¡n: <strong>${mine}</strong> | CÃƒÆ’Ã‚Â´ ÃƒÂ¡Ã‚ÂºÃ‚Â¥y: <strong>${partner}</strong>${mineReasonText}${partnerReasonText}${noteText}</p>
      `;

      item.addEventListener("click", () => fillForm(entry));
      historyList.appendChild(item);
    });
  }

  async function loadData() {
    setStatus("Ãƒâ€žÃ‚Âang tÃƒÂ¡Ã‚ÂºÃ‚Â£i dÃƒÂ¡Ã‚Â»Ã‚Â¯ liÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡u mood...");
    try {
      const res = await fetch(API);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "KhÃƒÆ’Ã‚Â´ng thÃƒÂ¡Ã‚Â»Ã†â€™ tÃƒÂ¡Ã‚ÂºÃ‚Â£i mood map.");
      entries = Array.isArray(data.entries) ? data.entries : [];
      fillForm(data.todayEntry || { date: data.today || toIsoToday(), mineMood: DEFAULT_MOOD, partnerMood: DEFAULT_MOOD });
      renderHistory();
      setStatus("");
    } catch (err) {
      setStatus(`LÃƒÂ¡Ã‚Â»Ã¢â‚¬â€i: ${err.message}`);
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
      setStatus("BÃƒÂ¡Ã‚ÂºÃ‚Â¡n cÃƒÂ¡Ã‚ÂºÃ‚Â§n chÃƒÂ¡Ã‚Â»Ã‚Ân ngÃƒÆ’Ã‚Â y.");
      return;
    }

    setStatus("Ãƒâ€žÃ‚Âang lÃƒâ€ Ã‚Â°u mood...");
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "LÃƒâ€ Ã‚Â°u mood thÃƒÂ¡Ã‚ÂºÃ‚Â¥t bÃƒÂ¡Ã‚ÂºÃ‚Â¡i.");
      entries = Array.isArray(data.entries) ? data.entries : entries;
      renderHistory();
      const funReply = buildFunMoodResponse(payload.partnerMood);
      setStatus(funReply ? `Đã lưu mood. ${funReply}` : "Đã lưu mood vào database.");
    } catch (err) {
      setStatus(`LÃƒÂ¡Ã‚Â»Ã¢â‚¬â€i: ${err.message}`);
    }
  }

  async function deleteData() {
    const date = String(dateInput.value || "").trim();
    if (!date) {
      setStatus("ChÃƒÂ¡Ã‚Â»Ã‚Ân ngÃƒÆ’Ã‚Â y cÃƒÂ¡Ã‚ÂºÃ‚Â§n xÃƒÆ’Ã‚Â³a trÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºc.");
      return;
    }

    const ok = window.confirm(`XÃƒÆ’Ã‚Â³a mood cÃƒÂ¡Ã‚Â»Ã‚Â§a ngÃƒÆ’Ã‚Â y ${date}?`);
    if (!ok) return;

    setStatus("Ãƒâ€žÃ‚Âang xÃƒÆ’Ã‚Â³a mood...");
    try {
      const res = await fetch(`${API}/${encodeURIComponent(date)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "XÃƒÆ’Ã‚Â³a mood thÃƒÂ¡Ã‚ÂºÃ‚Â¥t bÃƒÂ¡Ã‚ÂºÃ‚Â¡i.");
      entries = Array.isArray(data.entries) ? data.entries : entries;
      fillForm({ date, mineMood: DEFAULT_MOOD, partnerMood: DEFAULT_MOOD });
      renderHistory();
      setStatus("Ãƒâ€žÃ‚ÂÃƒÆ’Ã‚Â£ xÃƒÆ’Ã‚Â³a mood ngÃƒÆ’Ã‚Â y Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ chÃƒÂ¡Ã‚Â»Ã‚Ân.");
    } catch (err) {
      setStatus(`LÃƒÂ¡Ã‚Â»Ã¢â‚¬â€i: ${err.message}`);
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

