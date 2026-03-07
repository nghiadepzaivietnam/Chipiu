(function initAiWidget() {
  const STORAGE_KEY = "hdha.ai.chat.v2";
  const HISTORY_ENDPOINT = "/api/ai-chat/history";
  const APP_DATA_ENDPOINT = "/api/ai-chat/app-data";
  const MAX_MESSAGES = 20;
  const MAX_CONVERSATIONS = 30;
  const APP_DATA_CACHE_MS = 30 * 1000;

  if (document.querySelector(".ai-chat-widget")) return;

  const root = document.createElement("section");
  root.className = "ai-chat-widget";
  root.innerHTML = `
    <div class="ai-chat-panel" aria-label="AI chat panel">
      <div class="ai-chat-head">
        <div class="ai-chat-head-top">
          <p class="ai-chat-title">AI t\u01b0 v\u1ea5n</p>
          <div class="ai-chat-head-actions">
            <button class="ai-chat-mini" id="aiChatNew" type="button" aria-label="Th\u00eam \u0111o\u1ea1n chat m\u1edbi">Th\u00eam \u0111o\u1ea1n chat m\u1edbi</button>
            <button class="ai-chat-mini" id="aiChatRename" type="button" aria-label="\u0110\u1ed5i t\u00ean \u0111o\u1ea1n chat">\u0110\u1ed5i t\u00ean \u0111o\u1ea1n chat</button>
            <button class="ai-chat-mini danger" id="aiChatDelete" type="button" aria-label="X\u00f3a \u0111o\u1ea1n chat">X\u00f3a \u0111o\u1ea1n chat</button>
            <button class="ai-chat-close" type="button" aria-label="\u0110\u00f3ng chat">x</button>
          </div>
        </div>
        <select class="ai-chat-thread-select" id="aiChatThreads" aria-label="Danh s\u00e1ch \u0111o\u1ea1n chat"></select>
      </div>
      <div class="ai-chat-messages" id="aiChatMessages"></div>
      <form class="ai-chat-form" id="aiChatForm">
        <textarea class="ai-chat-input" id="aiChatInput" placeholder="Nh\u1eadp c\u00e2u h\u1ecfi..."></textarea>
        <button class="ai-chat-send" type="submit">G\u1eedi</button>
        <p class="ai-chat-note">Th\u00f4ng tin ch\u1ec9 \u0111\u1ec3 tham kh\u1ea3o.</p>
      </form>
    </div>
    <button class="ai-chat-toggle" type="button" aria-label="M\u1edf AI chat" aria-expanded="false" aria-controls="aiChatMessages">
      <span class="ai-chat-toggle-icon" aria-hidden="true">AI</span>
    </button>
  `;
  document.body.appendChild(root);

  const toggleBtn = root.querySelector(".ai-chat-toggle");
  const closeBtn = root.querySelector(".ai-chat-close");
  const newBtn = root.querySelector("#aiChatNew");
  const renameBtn = root.querySelector("#aiChatRename");
  const deleteBtn = root.querySelector("#aiChatDelete");
  const threadSelect = root.querySelector("#aiChatThreads");
  const form = root.querySelector("#aiChatForm");
  const input = root.querySelector("#aiChatInput");
  const list = root.querySelector("#aiChatMessages");

  let state = loadLocalState();
  let historySaveTimer = null;
  let appDataCache = null;
  let appDataCacheAt = 0;
  let dragTimer = null;
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let suppressToggleClick = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let pendingDragX = 0;
  let pendingDragY = 0;
  let dragRafId = 0;
  let dragBounds = null;
  let dragMoved = false;
  const supportsPointerEvents = typeof window !== "undefined" && "PointerEvent" in window;

  function makeAssistantGreeting() {
    return {
      role: "assistant",
      content: "Xin ch\u00e0o, m\u00ecnh l\u00e0 AI nh\u1ecf c\u1ee7a b\u1ea1n. B\u1ea1n c\u00f3 th\u1ec3 h\u1ecfi v\u1ec1 cu\u1ed9c s\u1ed1ng, h\u1ecdc t\u1eadp, s\u1ee9c kh\u1ecfe chu k\u1ef3, ho\u1eb7c ki\u1ebfn th\u1ee9c th\u00f4ng d\u1ee5ng.",
    };
  }

  function makeConversation(seedTitle) {
    const now = new Date().toISOString();
    return {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: (seedTitle || "\u0110o\u1ea1n chat m\u1edbi").slice(0, 120),
      messages: [makeAssistantGreeting()],
      createdAt: now,
      updatedAt: now,
    };
  }

  function normalizeMessages(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.trim().slice(0, 2000),
      }))
      .filter((m) => m.content.length > 0)
      .slice(-MAX_MESSAGES);
  }

  function normalizeConversations(conversations) {
    if (!Array.isArray(conversations)) return [];
    const out = [];
    const ids = new Set();
    conversations.forEach((c) => {
      const idRaw = typeof c?.id === "string" ? c.id.trim().slice(0, 64) : "";
      const id = idRaw || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (ids.has(id)) return;
      ids.add(id);
      out.push({
        id,
        title: (typeof c?.title === "string" ? c.title.trim() : "") || "\u0110o\u1ea1n chat m\u1edbi",
        messages: normalizeMessages(c?.messages || []),
        createdAt: c?.createdAt || new Date().toISOString(),
        updatedAt: c?.updatedAt || new Date().toISOString(),
      });
    });
    out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return out.slice(0, MAX_CONVERSATIONS);
  }

  function normalizeState(raw) {
    // Backward compat: legacy shape was just message array.
    if (Array.isArray(raw)) {
      const legacy = makeConversation("\u0110o\u1ea1n chat c\u0169");
      legacy.id = "legacy";
      legacy.messages = normalizeMessages(raw);
      if (!legacy.messages.length) legacy.messages = [makeAssistantGreeting()];
      return { conversations: [legacy], activeConversationId: legacy.id, widgetPosition: { x: null, y: null } };
    }

    const conversations = normalizeConversations(raw?.conversations || []);
    if (!conversations.length) {
      const fallback = makeConversation();
      return { conversations: [fallback], activeConversationId: fallback.id, widgetPosition: { x: null, y: null } };
    }
    const requested = typeof raw?.activeConversationId === "string" ? raw.activeConversationId.trim() : "";
    const activeConversationId = conversations.some((c) => c.id === requested) ? requested : conversations[0].id;
    const x = Number.isFinite(raw?.widgetPosition?.x) ? Math.round(raw.widgetPosition.x) : null;
    const y = Number.isFinite(raw?.widgetPosition?.y) ? Math.round(raw.widgetPosition.y) : null;
    return { conversations, activeConversationId, widgetPosition: { x, y } };
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fallback = makeConversation();
        return { conversations: [fallback], activeConversationId: fallback.id, widgetPosition: { x: null, y: null } };
      }
      return normalizeState(JSON.parse(raw));
    } catch (_err) {
      const fallback = makeConversation();
      return { conversations: [fallback], activeConversationId: fallback.id, widgetPosition: { x: null, y: null } };
    }
  }

  function saveLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getActiveConversation() {
    const active = state.conversations.find((c) => c.id === state.activeConversationId);
    if (active) return active;
    const first = state.conversations[0];
    state.activeConversationId = first?.id || "";
    return first || null;
  }

  function syncConversationOrder() {
    state.conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  function summarizeTitle(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    return clean ? clean.slice(0, 46) : "\u0110o\u1ea1n chat m\u1edbi";
  }

  function renderThreadSelector() {
    threadSelect.innerHTML = "";
    state.conversations.forEach((c, idx) => {
      const op = document.createElement("option");
      op.value = c.id;
      op.textContent = `${idx + 1}. ${c.title}`;
      threadSelect.appendChild(op);
    });
    threadSelect.value = state.activeConversationId;
    deleteBtn.disabled = state.conversations.length <= 1;
    renameBtn.disabled = !state.conversations.length;
  }

  function renderMessages() {
    const active = getActiveConversation();
    list.innerHTML = "";
    if (!active) return;
    active.messages.forEach((msg) => {
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

  function renderAll() {
    renderThreadSelector();
    renderMessages();
  }

  function scheduleSaveRemoteHistory() {
    if (historySaveTimer) clearTimeout(historySaveTimer);
    historySaveTimer = setTimeout(() => {
      saveRemoteHistory().catch(() => {});
    }, 300);
  }

  function persistAll() {
    saveLocalState();
    scheduleSaveRemoteHistory();
  }

  async function loadRemoteHistory() {
    const res = await fetch(HISTORY_ENDPOINT);
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return normalizeState(data || {});
  }

  async function saveRemoteHistory() {
    await fetch(HISTORY_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        widgetPosition: state.widgetPosition || { x: null, y: null },
      }),
    });
  }

  function clampWidgetPosition(x, y) {
    const margin = 8;
    const width = toggleBtn.offsetWidth || 68;
    const height = toggleBtn.offsetHeight || 68;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const maxX = Math.max(margin, viewportWidth - width - margin);
    const maxY = Math.max(margin, viewportHeight - height - margin);
    return {
      x: Math.min(maxX, Math.max(margin, Math.round(x))),
      y: Math.min(maxY, Math.max(margin, Math.round(y))),
    };
  }

  function buildDragBounds() {
    const margin = 8;
    const width = toggleBtn.offsetWidth || 68;
    const height = toggleBtn.offsetHeight || 68;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    return {
      margin,
      maxX: Math.max(margin, viewportWidth - width - margin),
      maxY: Math.max(margin, viewportHeight - height - margin),
    };
  }

  function clampWithBounds(x, y, bounds) {
    if (!bounds) return clampWidgetPosition(x, y);
    return {
      x: Math.min(bounds.maxX, Math.max(bounds.margin, Math.round(x))),
      y: Math.min(bounds.maxY, Math.max(bounds.margin, Math.round(y))),
    };
  }

  function applyDragFrame() {
    dragRafId = 0;
    if (!dragging) return;
    const pos = clampWithBounds(pendingDragX, pendingDragY, dragBounds);
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
  }

  function queueDragMove(x, y) {
    pendingDragX = x;
    pendingDragY = y;
    dragMoved = true;
    if (dragRafId) return;
    dragRafId = window.requestAnimationFrame(applyDragFrame);
  }

  function activateDrag(pointerId) {
    if (dragging) return;
    if (dragTimer) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }
    dragging = true;
    root.classList.add("dragging");
    const rect = toggleBtn.getBoundingClientRect();
    dragOffsetX = lastPointerX - rect.left;
    dragOffsetY = lastPointerY - rect.top;
    dragBounds = buildDragBounds();
    if (pointerId != null) {
      try {
        toggleBtn.setPointerCapture(pointerId);
      } catch (_err) {
        // ignore
      }
    }
  }

  function saveWidgetPosition(x, y) {
    state.widgetPosition = { x: Math.round(x), y: Math.round(y) };
    scheduleSaveRemoteHistory();
  }

  function updatePanelDock(x) {
    const dockRight = x > (window.innerWidth - 220);
    root.classList.toggle("dock-right", dockRight);
  }

  function applyWidgetPosition(x, y, persist) {
    const pos = clampWidgetPosition(x, y);
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    updatePanelDock(pos.x);
    if (persist) saveWidgetPosition(pos.x, pos.y);
  }

  function applySavedWidgetPosition() {
    const x = state?.widgetPosition?.x;
    const y = state?.widgetPosition?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    applyWidgetPosition(x, y, false);
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
      const logged = Array.from(document.querySelectorAll("#loggedList li"))
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

  function sanitizeForAi(value, depth = 0) {
    if (value == null) return value;
    if (typeof value === "string") return value.slice(0, 2000);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (depth >= 3) return String(value).slice(0, 2000);
    if (Array.isArray(value)) {
      return value.slice(0, 80).map((item) => sanitizeForAi(item, depth + 1));
    }
    if (typeof value === "object") {
      const entries = Object.entries(value).slice(0, 80).map(([k, v]) => [k, sanitizeForAi(v, depth + 1)]);
      return Object.fromEntries(entries);
    }
    return String(value).slice(0, 2000);
  }

  async function getAppDataSnapshot() {
    const now = Date.now();
    if (appDataCache && now - appDataCacheAt < APP_DATA_CACHE_MS) {
      return appDataCache;
    }
    try {
      const res = await fetch(APP_DATA_ENDPOINT);
      if (!res.ok) return appDataCache || null;
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return appDataCache || null;
      appDataCache = sanitizeForAi(data);
      appDataCacheAt = now;
      return appDataCache;
    } catch (_err) {
      return appDataCache || null;
    }
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
      return `\u0110\u00e3 t\u00edch ng\u00e0y h\u00f4m nay (${iso}) v\u00e0o l\u1ecbch k\u1ef3 kinh.`;
    }
    if (/hom nay|today/.test(t) && isRemove) {
      const iso = p.getTodayIso();
      p.removeLoggedDate(iso);
      return `\u0110\u00e3 b\u1ecf t\u00edch ng\u00e0y h\u00f4m nay (${iso}).`;
    }
    if (dateIso && isAdd) {
      p.addLoggedDate(dateIso);
      return `\u0110\u00e3 t\u00edch ng\u00e0y ${dateIso} v\u00e0o l\u1ecbch k\u1ef3 kinh.`;
    }
    if (dateIso && isRemove) {
      p.removeLoggedDate(dateIso);
      return `\u0110\u00e3 b\u1ecf t\u00edch ng\u00e0y ${dateIso}.`;
    }
    const cycleMatch = t.match(/chu ky\s*(\d{2})\s*ngay/);
    if (cycleMatch) {
      const est = p.getEstimatedCycleLength?.();
      return `Chu k\u1ef3 \u01b0\u1edbc t\u00ednh hi\u1ec7n t\u1ea1i: ${est || "\u0111ang c\u1eadp nh\u1eadt"} ng\u00e0y.`;
    }
    const periodMatch = t.match(/hanh kinh\s*(\d{1,2})\s*ngay/);
    if (periodMatch) {
      const v = p.setPeriodLength(Number(periodMatch[1]));
      return `\u0110\u00e3 c\u1eadp nh\u1eadt s\u1ed1 ng\u00e0y h\u00e0nh kinh: ${v} ng\u00e0y.`;
    }
    return null;
  }

  async function askAi(activeMessages) {
    const appData = await getAppDataSnapshot();
    const pageContext = collectPageContext();
    const payload = {
      page: location.pathname,
      messages: activeMessages.slice(-12),
      context: {
        ...pageContext,
        appData,
      },
    };

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "AI \u0111ang b\u1eadn, th\u1eed l\u1ea1i sau.");
    return (data.reply || "").trim() || "M\u00ecnh ch\u01b0a c\u00f3 c\u00e2u tr\u1ea3 l\u1eddi ph\u00f9 h\u1ee3p.";
  }

  toggleBtn.addEventListener("click", () => setOpen(!root.classList.contains("open")));
  closeBtn.addEventListener("click", () => setOpen(false));

  newBtn.addEventListener("click", () => {
    const next = makeConversation();
    state.conversations.unshift(next);
    state.activeConversationId = next.id;
    renderAll();
    persistAll();
    input.focus();
  });

  renameBtn.addEventListener("click", () => {
    const active = getActiveConversation();
    if (!active) return;
    const nextTitle = window.prompt("Nh\u1eadp t\u00ean m\u1edbi cho \u0111o\u1ea1n chat:", active.title || "");
    if (nextTitle == null) return;
    const title = nextTitle.trim().slice(0, 120);
    if (!title) return;
    active.title = title;
    active.updatedAt = new Date().toISOString();
    syncConversationOrder();
    state.activeConversationId = active.id;
    renderAll();
    persistAll();
  });

  deleteBtn.addEventListener("click", () => {
    const active = getActiveConversation();
    if (!active) return;
    const ok = window.confirm(`X\u00f3a \u0111o\u1ea1n chat "${active.title}"?`);
    if (!ok) return;
    state.conversations = state.conversations.filter((c) => c.id !== active.id);
    if (!state.conversations.length) {
      const fallback = makeConversation();
      state.conversations = [fallback];
      state.activeConversationId = fallback.id;
    } else {
      state.activeConversationId = state.conversations[0].id;
    }
    renderAll();
    persistAll();
  });

  threadSelect.addEventListener("change", () => {
    state.activeConversationId = threadSelect.value;
    renderMessages();
    persistAll();
  });

  function startDrag(pointerType, clientX, clientY, pointerId) {
    suppressToggleClick = false;
    dragMoved = false;
    lastPointerX = clientX;
    lastPointerY = clientY;
    dragStartX = clientX;
    dragStartY = clientY;
    const holdDelay = pointerType === "touch" ? 0 : 120;
    if (holdDelay <= 0) {
      activateDrag(pointerId);
      return;
    }
    dragTimer = setTimeout(() => {
      activateDrag(pointerId);
    }, holdDelay);
  }

  toggleBtn.addEventListener("pointerdown", (event) => {
    // Touch pointer may not consistently expose button=0 across browsers.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
    startDrag(event.pointerType || "mouse", event.clientX, event.clientY, event.pointerId);
  });

  toggleBtn.addEventListener("pointermove", (event) => {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    if (!dragging) {
      if (!dragTimer) return;
      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;
      if ((dx * dx + dy * dy) < 16) return;
      activateDrag(event.pointerId);
    }
    event.preventDefault();
    const x = event.clientX - dragOffsetX;
    const y = event.clientY - dragOffsetY;
    queueDragMove(x, y);
  });

  function stopDrag(event) {
    if (dragTimer) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }
    if (!dragging) return;
    dragging = false;
    root.classList.remove("dragging");
    dragBounds = null;
    if (dragRafId) {
      window.cancelAnimationFrame(dragRafId);
      dragRafId = 0;
    }
    if (dragMoved) {
      suppressToggleClick = true;
      const rect = toggleBtn.getBoundingClientRect();
      applyWidgetPosition(rect.left, rect.top, true);
    }
    try {
      toggleBtn.releasePointerCapture(event.pointerId);
    } catch (_err) {
      // ignore
    }
    setTimeout(() => {
      suppressToggleClick = false;
    }, 120);
  }

  toggleBtn.addEventListener("pointerup", stopDrag);
  toggleBtn.addEventListener("pointercancel", stopDrag);

  // Fallback only when Pointer Events are not available.
  if (!supportsPointerEvents) {
    toggleBtn.addEventListener("touchstart", (event) => {
      const t = event.changedTouches?.[0];
      if (!t) return;
      event.preventDefault();
      startDrag("touch", t.clientX, t.clientY, null);
    }, { passive: false });
    toggleBtn.addEventListener("touchmove", (event) => {
      const t = event.changedTouches?.[0];
      if (!t) return;
      event.preventDefault();
      lastPointerX = t.clientX;
      lastPointerY = t.clientY;
      if (!dragging) {
        if (!dragTimer) return;
        const dx = t.clientX - dragStartX;
        const dy = t.clientY - dragStartY;
        if ((dx * dx + dy * dy) < 16) return;
        activateDrag(null);
      }
      const x = t.clientX - dragOffsetX;
      const y = t.clientY - dragOffsetY;
      queueDragMove(x, y);
    }, { passive: false });
    toggleBtn.addEventListener("touchend", () => stopDrag({ pointerId: null }), { passive: true });
    toggleBtn.addEventListener("touchcancel", () => stopDrag({ pointerId: null }), { passive: true });
  }
  toggleBtn.addEventListener("click", (event) => {
    if (!suppressToggleClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener("resize", () => {
    const savedX = state?.widgetPosition?.x;
    const savedY = state?.widgetPosition?.y;
    if (Number.isFinite(savedX) && Number.isFinite(savedY)) {
      applyWidgetPosition(savedX, savedY, false);
      return;
    }
    const rect = toggleBtn.getBoundingClientRect();
    applyWidgetPosition(rect.left, rect.top, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const active = getActiveConversation();
    if (!active) return;

    if (active.title === "\u0110o\u1ea1n chat m\u1edbi" || active.title === "Cu\u1ed9c tr\u00f2 chuy\u1ec7n m\u1edbi") {
      active.title = summarizeTitle(text);
    }

    active.messages.push({ role: "user", content: text });
    active.messages = normalizeMessages(active.messages);
    active.updatedAt = new Date().toISOString();
    input.value = "";
    syncConversationOrder();
    state.activeConversationId = active.id;
    renderAll();
    persistAll();

    const thinking = { role: "assistant", content: "\u0110ang suy ngh\u0129..." };
    active.messages.push(thinking);
    renderMessages();

    try {
      const localActionReply = tryPeriodAction(text);
      const reply = localActionReply || (await askAi(active.messages));
      active.messages[active.messages.length - 1] = { role: "assistant", content: reply };
    } catch (err) {
      active.messages[active.messages.length - 1] = { role: "assistant", content: `L\u1ed7i: ${err.message}` };
    }

    active.messages = normalizeMessages(active.messages);
    active.updatedAt = new Date().toISOString();
    syncConversationOrder();
    state.activeConversationId = active.id;
    renderAll();
    persistAll();
  });

  renderAll();
  applySavedWidgetPosition();

  loadRemoteHistory()
    .then((remote) => {
      if (!remote) return;
      state = remote;
      renderAll();
      saveLocalState();
      applySavedWidgetPosition();
    })
    .catch(() => {});
})();


