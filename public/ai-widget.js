(function initAiWidget() {
  const STORAGE_KEY = "hdha.ai.quick.v1";
  const APP_DATA_ENDPOINT = "/api/ai-chat/app-data";
  const MAX_MESSAGES = 20;
  const APP_DATA_CACHE_MS = 30 * 1000;

  if (document.querySelector(".ai-chat-widget")) return;

  const root = document.createElement("section");
  root.className = "ai-chat-widget";
  root.innerHTML = `
    <div class="ai-chat-panel" aria-label="AI chat panel">
      <div class="ai-chat-head">
        <p class="ai-chat-title">AI tư vấn</p>
      </div>
      <div class="ai-chat-messages" id="aiChatMessages"></div>
      <form class="ai-chat-form" id="aiChatForm">
        <textarea class="ai-chat-input" id="aiChatInput" placeholder="Nhập câu hỏi..."></textarea>
        <button class="ai-chat-send" type="submit">Gửi</button>
        <p class="ai-chat-note">Thông tin chỉ để tham khảo.</p>
      </form>
    </div>
    <button class="ai-chat-toggle" type="button" aria-label="Mở AI chat" aria-expanded="false" aria-controls="aiChatMessages">
      <span class="ai-chat-toggle-icon" aria-hidden="true">AI</span>
    </button>
  `;
  document.body.appendChild(root);

  const toggleBtn = root.querySelector(".ai-chat-toggle");
  const form = root.querySelector("#aiChatForm");
  const input = root.querySelector("#aiChatInput");
  const list = root.querySelector("#aiChatMessages");

  let state = loadState();
  let appDataCache = null;
  let appDataCacheAt = 0;

  let pointerActive = false;
  let pointerId = null;
  let pressX = 0;
  let pressY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let suppressClick = false;
  let pendingX = 0;
  let pendingY = 0;
  let dragRafId = 0;

  function makeAssistantGreeting() {
    return {
      role: "assistant",
      content: "Xin chào, mình là AI của bạn. Bạn có thể hỏi về cuộc sống, học tập, sức khỏe chu kỳ, hoặc kiến thức thông dụng.",
    };
  }

  function normalizeMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
      .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.trim().slice(0, 2000),
      }))
      .filter((m) => m.content.length > 0)
      .slice(-MAX_MESSAGES);
  }

  function normalizeState(raw) {
    const messages = normalizeMessages(raw?.messages || []);
    const x = Number.isFinite(raw?.widgetPosition?.x) ? Math.round(raw.widgetPosition.x) : null;
    const y = Number.isFinite(raw?.widgetPosition?.y) ? Math.round(raw.widgetPosition.y) : null;
    return {
      open: Boolean(raw?.open),
      messages: messages.length ? messages : [makeAssistantGreeting()],
      widgetPosition: { x, y },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeState({});
      return normalizeState(JSON.parse(raw));
    } catch (_err) {
      return normalizeState({});
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderMessages() {
    list.innerHTML = "";
    state.messages.forEach((msg) => {
      const item = document.createElement("div");
      item.className = `ai-msg ${msg.role}`;
      item.textContent = msg.content;
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
  }

  function setOpen(open) {
    state.open = Boolean(open);
    root.classList.toggle("open", state.open);
    toggleBtn.setAttribute("aria-expanded", state.open ? "true" : "false");
    if (state.open) input.focus();
    saveState();
  }

  function clampPosition(x, y) {
    const margin = 8;
    const rect = toggleBtn.getBoundingClientRect();
    const width = rect.width || 64;
    const height = rect.height || 64;
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    return {
      x: Math.min(vw - width - margin, Math.max(margin, Math.round(x))),
      y: Math.min(vh - height - margin, Math.max(margin, Math.round(y))),
    };
  }

  function applyPosition(x, y, persist) {
    const pos = clampPosition(x, y);
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.classList.toggle("dock-right", pos.x > ((window.innerWidth || 0) - 220));
    if (persist) {
      state.widgetPosition = { x: pos.x, y: pos.y };
      saveState();
    }
  }

  function queuePosition(x, y) {
    pendingX = x;
    pendingY = y;
    if (dragRafId) return;
    dragRafId = window.requestAnimationFrame(() => {
      dragRafId = 0;
      applyPosition(pendingX, pendingY, false);
    });
  }

  function applySavedPosition() {
    const x = state?.widgetPosition?.x;
    const y = state?.widgetPosition?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    applyPosition(x, y, false);
  }

  function snapToNearestEdge(persist) {
    const margin = 8;
    const rect = toggleBtn.getBoundingClientRect();
    const vw = window.visualViewport?.width || window.innerWidth;
    const targetX = rect.left + rect.width / 2 < vw / 2 ? margin : Math.max(margin, vw - rect.width - margin);
    root.classList.add("snapping");
    applyPosition(targetX, rect.top, persist);
    setTimeout(() => root.classList.remove("snapping"), 160);
  }

  function collectPageContext() {
    const pathname = location.pathname;
    const h1 = (document.querySelector("h1")?.textContent || "").trim();
    return {
      title: document.title || "",
      pathname,
      pageType: pathname === "/" ? "home" : "generic",
      h1,
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
    return `${dmy[3]}-${m}-${d}`;
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
      return `Đã tích ngày hôm nay (${iso}) vào lịch kỳ kinh.`;
    }
    if (/hom nay|today/.test(t) && isRemove) {
      const iso = p.getTodayIso();
      p.removeLoggedDate(iso);
      return `Đã bỏ tích ngày hôm nay (${iso}).`;
    }
    if (dateIso && isAdd) {
      p.addLoggedDate(dateIso);
      return `Đã tích ngày ${dateIso} vào lịch kỳ kinh.`;
    }
    if (dateIso && isRemove) {
      p.removeLoggedDate(dateIso);
      return `Đã bỏ tích ngày ${dateIso}.`;
    }
    return null;
  }

  async function getAppDataSnapshot() {
    const now = Date.now();
    if (appDataCache && now - appDataCacheAt < APP_DATA_CACHE_MS) return appDataCache;
    try {
      const res = await fetch(APP_DATA_ENDPOINT);
      if (!res.ok) return appDataCache || null;
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return appDataCache || null;
      appDataCache = data;
      appDataCacheAt = now;
      return appDataCache;
    } catch (_err) {
      return appDataCache || null;
    }
  }

  async function askAi(messages) {
    const appData = await getAppDataSnapshot();
    const payload = {
      page: location.pathname,
      messages: messages.slice(-12),
      context: {
        ...collectPageContext(),
        appData,
      },
    };

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "AI đang bận, thử lại sau.");
    return (data.reply || "").trim() || "Mình chưa có câu trả lời phù hợp.";
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerActive = true;
    pointerId = event.pointerId;
    moved = false;
    pressX = event.clientX;
    pressY = event.clientY;
    const rect = root.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    root.classList.add("dragging");
    try {
      toggleBtn.setPointerCapture(pointerId);
    } catch (_err) {
      // ignore
    }
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!pointerActive) return;
    const dx = event.clientX - pressX;
    const dy = event.clientY - pressY;
    if (!moved && (dx * dx + dy * dy) > 9) moved = true;
    if (!moved) return;
    event.preventDefault();
    queuePosition(startLeft + dx, startTop + dy);
  }

  function onPointerUp(event) {
    if (!pointerActive) return;
    pointerActive = false;
    root.classList.remove("dragging");
    try {
      toggleBtn.releasePointerCapture(pointerId);
    } catch (_err) {
      // ignore
    }
    pointerId = null;

    if (dragRafId) {
      window.cancelAnimationFrame(dragRafId);
      dragRafId = 0;
    }

    if (moved) {
      suppressClick = true;
      snapToNearestEdge(true);
      setTimeout(() => {
        suppressClick = false;
      }, 140);
      return;
    }

    if (event.pointerType !== "mouse" || event.button === 0) {
      setOpen(!state.open);
    }
  }

  toggleBtn.addEventListener("pointerdown", onPointerDown);
  toggleBtn.addEventListener("pointermove", onPointerMove);
  toggleBtn.addEventListener("pointerup", onPointerUp);
  toggleBtn.addEventListener("pointercancel", onPointerUp);

  toggleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (suppressClick) {
      event.stopImmediatePropagation();
    }
  }, true);

  toggleBtn.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(!state.open);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!state.open) return;
    if (root.contains(event.target)) return;
    setOpen(false);
  });

  window.addEventListener("resize", () => {
    const x = state?.widgetPosition?.x;
    const y = state?.widgetPosition?.y;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      applyPosition(x, y, false);
      return;
    }
    const rect = root.getBoundingClientRect();
    applyPosition(rect.left, rect.top, false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    state.messages.push({ role: "user", content: text });
    state.messages = normalizeMessages(state.messages);
    input.value = "";
    renderMessages();
    saveState();

    const thinking = { role: "assistant", content: "Đang suy nghĩ..." };
    state.messages.push(thinking);
    renderMessages();

    try {
      const localActionReply = tryPeriodAction(text);
      const reply = localActionReply || (await askAi(state.messages));
      state.messages[state.messages.length - 1] = { role: "assistant", content: reply };
    } catch (err) {
      state.messages[state.messages.length - 1] = { role: "assistant", content: `Lỗi: ${err.message}` };
    }

    state.messages = normalizeMessages(state.messages);
    renderMessages();
    saveState();
  });

  renderMessages();
  setOpen(state.open);
  applySavedPosition();
})();
