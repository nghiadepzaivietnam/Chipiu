(function initAiWidget() {
  const STORAGE_KEY = "hdha.ai.chat.v1";
  const MAX_MESSAGES = 20;

  if (document.querySelector(".ai-chat-widget")) return;

  const root = document.createElement("section");
  root.className = "ai-chat-widget";
  root.innerHTML = `
    <div class="ai-chat-panel" aria-label="AI chat panel">
      <div class="ai-chat-head">
        <p class="ai-chat-title">AI tu van</p>
        <button class="ai-chat-close" type="button" aria-label="Dong chat">×</button>
      </div>
      <div class="ai-chat-messages" id="aiChatMessages"></div>
      <form class="ai-chat-form" id="aiChatForm">
        <textarea class="ai-chat-input" id="aiChatInput" placeholder="Nhap cau hoi..."></textarea>
        <button class="ai-chat-send" type="submit">Gui</button>
        <p class="ai-chat-note">Thong tin chi de tham khao.</p>
      </form>
    </div>
    <button class="ai-chat-toggle" type="button" aria-label="Mo AI chat" aria-expanded="false" aria-controls="aiChatMessages">
      <span class="ai-chat-toggle-icon" aria-hidden="true">😺</span>
    </button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector(".ai-chat-panel");
  const toggleBtn = root.querySelector(".ai-chat-toggle");
  const closeBtn = root.querySelector(".ai-chat-close");
  const form = root.querySelector("#aiChatForm");
  const input = root.querySelector("#aiChatInput");
  const list = root.querySelector("#aiChatMessages");

  let messages = loadMessages();

  if (!messages.length) {
    messages = [
      {
        role: "assistant",
        content: "Xin chao, minh la AI nho cua ban. Ban co the hoi ve cuoc song, hoc tap, suc khoe chu ky, hoac kien thuc thong dung.",
      },
    ];
  }

  function saveMessages() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content.trim(),
        }))
        .filter((m) => m.content.length > 0)
        .slice(-MAX_MESSAGES);
    } catch (_err) {
      return [];
    }
  }

  function renderMessages() {
    list.innerHTML = "";
    messages.forEach((msg) => {
      const item = document.createElement("div");
      item.className = `ai-msg ${msg.role}`;
      item.textContent = msg.content;
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
  }

  function setOpen(open) {
    root.classList.toggle("open", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) input.focus();
  }

  function textOf(selector, fallback = "") {
    const el = document.querySelector(selector);
    return (el?.textContent || fallback).trim();
  }

  function valueOf(selector, fallback = "") {
    const el = document.querySelector(selector);
    return (el?.value || fallback).trim();
  }

  function collectPageContext() {
    const pathname = location.pathname;
    const base = {
      title: document.title || "",
      pathname,
      h1: textOf("h1"),
    };

    if (pathname === "/counter.html") {
      return {
        ...base,
        pageType: "counter",
        startDate: valueOf("#startDate"),
        startTime: valueOf("#startTime"),
        counterDisplay: textOf("#counterDisplay").slice(0, 900),
      };
    }

    if (pathname === "/period.html") {
      const logged = Array.from(document.querySelectorAll("#loggedDateList li"))
        .map((li) => (li.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 20);
      return {
        ...base,
        pageType: "period",
        anchorDate: valueOf("#anchorDate"),
        cycleLength: valueOf("#cycleLength"),
        periodLength: valueOf("#periodLength"),
        summary: textOf("#summaryText").slice(0, 600),
        loggedDates: logged,
      };
    }

    if (pathname === "/create.html") {
      const selectedOwner = document.querySelector('input[name="owner"]:checked')?.value || "";
      return {
        ...base,
        pageType: "create",
        selectedOwner,
        captionDraft: valueOf('textarea[name="caption"]').slice(0, 700),
        allowCombined: Boolean(document.querySelector('input[name="allowCombined"]')?.checked),
      };
    }

    if (pathname === "/journal.html") {
      const cards = document.querySelectorAll("#journal-feed .camera-card, #journal-feed .locket-card, #journal-feed article");
      return {
        ...base,
        pageType: "journal",
        itemCountInView: cards.length,
        ownerFilter: textOf("#ownerSelectLabel"),
      };
    }

    return {
      ...base,
      pageType: pathname === "/" ? "home" : "generic",
      heroSubtitle: textOf(".subtitle").slice(0, 500),
    };
  }

  function normalizeText(text) {
    return (text || "").toLowerCase().trim();
  }

  function parseDateFromText(text) {
    const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!dmy) return "";
    const d = String(Number(dmy[1])).padStart(2, "0");
    const m = String(Number(dmy[2])).padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  function tryPeriodAction(question) {
    if (location.pathname !== "/period.html") return null;
    const p = window.__periodAssistant;
    if (!p) return null;

    const t = normalizeText(question);
    const dateIso = parseDateFromText(t);

    const isRemove = /bo tich|bo tick|xoa tich|xoa tick|huy tich|huy tick/.test(t);
    const isAdd = /tich|tick|danh dau|mark/.test(t);

    if ((/hom nay|today/.test(t) && isAdd) || (isAdd && !dateIso && /ky kinh/.test(t))) {
      const iso = p.getTodayIso();
      p.addLoggedDate(iso);
      return `Da tich ngay hom nay (${iso}) vao lich ky kinh.`;
    }

    if (/hom nay|today/.test(t) && isRemove) {
      const iso = p.getTodayIso();
      p.removeLoggedDate(iso);
      return `Da bo tich ngay hom nay (${iso}).`;
    }

    if (dateIso && isAdd) {
      p.addLoggedDate(dateIso);
      return `Da tich ngay ${dateIso} vao lich ky kinh.`;
    }

    if (dateIso && isRemove) {
      p.removeLoggedDate(dateIso);
      return `Da bo tich ngay ${dateIso}.`;
    }

    const cycleMatch = t.match(/chu ky\s*(\d{2})\s*ngay/);
    if (cycleMatch) {
      const est = p.getEstimatedCycleLength?.();
      return `Trang nay dang du doan chu ky tu dong tu du lieu da tich. Chu ky uoc tinh hien tai: ${est || "dang cap nhat"} ngay.`;
    }

    const periodMatch = t.match(/hanh kinh\s*(\d{1,2})\s*ngay/);
    if (periodMatch) {
      const v = p.setPeriodLength(Number(periodMatch[1]));
      return `Da cap nhat so ngay hanh kinh: ${v} ngay.`;
    }

    return null;
  }

  async function askAi(question) {
    const payload = {
      page: location.pathname,
      messages: messages.slice(-12),
      context: collectPageContext(),
    };

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "AI dang ban, thu lai sau.");
    }
    return (data.reply || "").trim() || "Minh chua co cau tra loi phu hop.";
  }

  toggleBtn.addEventListener("click", () => {
    setOpen(!root.classList.contains("open"));
  });
  closeBtn.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    messages.push({ role: "user", content: text });
    messages = messages.slice(-MAX_MESSAGES);
    input.value = "";
    renderMessages();
    saveMessages();

    const thinking = { role: "assistant", content: "Dang suy nghi..." };
    messages.push(thinking);
    renderMessages();

    try {
      const localActionReply = tryPeriodAction(text);
      const reply = localActionReply || (await askAi(text));
      messages[messages.length - 1] = { role: "assistant", content: reply };
    } catch (err) {
      messages[messages.length - 1] = {
        role: "assistant",
        content: `Loi: ${err.message}`,
      };
    }

    messages = messages.slice(-MAX_MESSAGES);
    renderMessages();
    saveMessages();
  });

  renderMessages();
})();
