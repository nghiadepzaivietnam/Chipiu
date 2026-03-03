(function initAiWidget() {
  const STORAGE_KEY = "hdha.ai.chat.v2";
  const HISTORY_ENDPOINT = "/api/ai-chat/history";
  const MAX_MESSAGES = 20;
  const MAX_CONVERSATIONS = 30;

  if (document.querySelector(".ai-chat-widget")) return;

  const root = document.createElement("section");
  root.className = "ai-chat-widget";
  root.innerHTML = `
    <div class="ai-chat-panel" aria-label="AI chat panel">
      <div class="ai-chat-head">
        <div class="ai-chat-head-top">
          <p class="ai-chat-title">AI tu van</p>
          <div class="ai-chat-head-actions">
            <button class="ai-chat-mini" id="aiChatNew" type="button" aria-label="Thêm đoạn chat mới">Thêm đoạn chat mới</button>
            <button class="ai-chat-mini" id="aiChatRename" type="button" aria-label="Đổi tên đoạn chat">Đổi tên đoạn chat</button>
            <button class="ai-chat-mini danger" id="aiChatDelete" type="button" aria-label="Xóa đoạn chat">Xóa đoạn chat</button>
            <button class="ai-chat-close" type="button" aria-label="Dong chat">x</button>
          </div>
        </div>
        <select class="ai-chat-thread-select" id="aiChatThreads" aria-label="Danh sach doan chat"></select>
      </div>
      <div class="ai-chat-messages" id="aiChatMessages"></div>
      <form class="ai-chat-form" id="aiChatForm">
        <textarea class="ai-chat-input" id="aiChatInput" placeholder="Nhap cau hoi..."></textarea>
        <button class="ai-chat-send" type="submit">Gui</button>
        <p class="ai-chat-note">Thong tin chi de tham khao.</p>
      </form>
    </div>
    <button class="ai-chat-toggle" type="button" aria-label="Mo AI chat" aria-expanded="false" aria-controls="aiChatMessages">
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
  let dragTimer = null;
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let suppressToggleClick = false;

  function makeAssistantGreeting() {
    return {
      role: "assistant",
      content: "Xin chao, minh la AI nho cua ban. Ban co the hoi ve cuoc song, hoc tap, suc khoe chu ky, hoac kien thuc thong dung.",
    };
  }

  function makeConversation(seedTitle) {
    const now = new Date().toISOString();
    return {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: (seedTitle || "Doan chat moi").slice(0, 120),
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
        title: (typeof c?.title === "string" ? c.title.trim() : "") || "Doan chat moi",
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
      const legacy = makeConversation("Doan chat cu");
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
    return clean ? clean.slice(0, 46) : "Doan chat moi";
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
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(maxX, Math.max(margin, Math.round(x))),
      y: Math.min(maxY, Math.max(margin, Math.round(y))),
    };
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
      return `Chu ky uoc tinh hien tai: ${est || "dang cap nhat"} ngay.`;
    }
    const periodMatch = t.match(/hanh kinh\s*(\d{1,2})\s*ngay/);
    if (periodMatch) {
      const v = p.setPeriodLength(Number(periodMatch[1]));
      return `Da cap nhat so ngay hanh kinh: ${v} ngay.`;
    }
    return null;
  }

  async function askAi(activeMessages) {
    const payload = {
      page: location.pathname,
      messages: activeMessages.slice(-12),
      context: collectPageContext(),
    };

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "AI dang ban, thu lai sau.");
    return (data.reply || "").trim() || "Minh chua co cau tra loi phu hop.";
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
    const nextTitle = window.prompt("Nhap ten moi cho doan chat:", active.title || "");
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
    const ok = window.confirm(`Xoa doan chat "${active.title}"?`);
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

  toggleBtn.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    suppressToggleClick = false;
    dragTimer = setTimeout(() => {
      dragging = true;
      root.classList.add("dragging");
      const rect = root.getBoundingClientRect();
      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;
      try {
        toggleBtn.setPointerCapture(event.pointerId);
      } catch (_err) {
        // ignore
      }
    }, 260);
  });

  toggleBtn.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    event.preventDefault();
    const x = event.clientX - dragOffsetX;
    const y = event.clientY - dragOffsetY;
    applyWidgetPosition(x, y, false);
  });

  function stopDrag(event) {
    if (dragTimer) {
      clearTimeout(dragTimer);
      dragTimer = null;
    }
    if (!dragging) return;
    dragging = false;
    root.classList.remove("dragging");
    suppressToggleClick = true;
    const rect = root.getBoundingClientRect();
    applyWidgetPosition(rect.left, rect.top, true);
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
  toggleBtn.addEventListener("click", (event) => {
    if (!suppressToggleClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener("resize", () => {
    const rect = root.getBoundingClientRect();
    if (root.style.top && root.style.left) {
      applyWidgetPosition(rect.left, rect.top, true);
    }
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

    if (active.title === "Doan chat moi" || active.title === "Cuoc tro chuyen moi") {
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

    const thinking = { role: "assistant", content: "Dang suy nghi..." };
    active.messages.push(thinking);
    renderMessages();

    try {
      const localActionReply = tryPeriodAction(text);
      const reply = localActionReply || (await askAi(active.messages));
      active.messages[active.messages.length - 1] = { role: "assistant", content: reply };
    } catch (err) {
      active.messages[active.messages.length - 1] = { role: "assistant", content: `Loi: ${err.message}` };
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
