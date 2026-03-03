const DEFAULT_HAIANH = "/hai-anh.jpg";
const DEFAULT_TOI = "/uploads/1772244572266-5389.jpg";

const scrollEl = document.getElementById("journeyScroll");
const trackEl = document.getElementById("journeyTrack");
const fillEl = document.getElementById("journeyLineFill");
const prevBtn = document.getElementById("journeyPrev");
const nextBtn = document.getElementById("journeyNext");
const emptyEl = document.getElementById("journeyEmpty");
const heroEl = document.querySelector(".journey-hero");
const addToggleBtn = document.getElementById("journeyAddToggle");
const addPanelEl = document.getElementById("journeyAddPanel");
const addDateInput = document.getElementById("journeyAddDateText");
const addRoleInput = document.getElementById("journeyAddRole");
const addTitleInput = document.getElementById("journeyAddTitle");
const addDescInput = document.getElementById("journeyAddDesc");
const addFutureInput = document.getElementById("journeyAddFuture");
const addCancelBtn = document.getElementById("journeyAddCancel");
const resetFormBtn = document.getElementById("journeyResetForm");
const addSubmitBtn = document.getElementById("journeyAddSubmit");
const addStatusEl = document.getElementById("journeyAddStatus");
const manageListEl = document.getElementById("journeyManageList");
const formModeEl = document.getElementById("journeyFormMode");

const API_BASE = "/api/journey";

const fallbackData = {
  avatars: {
    haianh: DEFAULT_HAIANH,
    toi: DEFAULT_TOI,
  },
  items: [
    {
      date: "14/02/2023",
      role: "haianh",
      title: "Lan dau noi chuyen that lau",
      desc: "Mot toi tuong binh thuong, lai thanh diem bat dau cua moi dieu diu dang.",
      future: false,
    },
    {
      date: "01/06/2023",
      role: "toi",
      title: "Chinh thuc ben nhau",
      desc: "Tu day timeline cua tui minh co ten, co hen va co trai tim o giua.",
      future: false,
    },
    {
      date: "24/12/2023",
      role: "haianh",
      title: "Noel dau tien cung nhau",
      desc: "Di qua thanh pho day den, nam tay nhau va ke nhung uoc mo be xiu.",
      future: false,
    },
    {
      date: "03/03/2024",
      role: "toi",
      title: "Loi hua cho hanh trinh dai",
      desc: "Khong can qua nhieu tu ngu, chi can luon chon nhau them mot lan nua.",
      future: false,
    },
    {
      date: "Tuong lai",
      role: "both",
      title: "Tuong lai cua chung ta 💍",
      desc: "Ngoi nha nho, nhung chuyen di dai va mot timeline khong bao gio dung lai.",
      future: true,
    },
  ],
};

let fillTarget = 0;
let fillCurrent = 0;
let fillRaf = 0;
let currentJourneyState = {
  avatars: { ...fallbackData.avatars },
  items: fallbackData.items.slice(),
};
let isSavingAdd = false;
let editingIndex = -1;

function roleLabel(role) {
  return role === "toi" ? "Trong Nghia" : "Hai Anh";
}

function roleShortLabel(role) {
  if (role === "toi") return "Trong Nghia";
  if (role === "both") return "Ca hai";
  return "Hai Anh";
}

function avatarOf(role, avatars) {
  return role === "toi" ? avatars.toi || DEFAULT_TOI : avatars.haianh || DEFAULT_HAIANH;
}

function normalizeRole(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "toi" || raw === "me" || raw === "trongnghia" || raw === "trong nghia") return "toi";
  if (raw === "both" || raw === "ca2" || raw === "ca 2" || raw === "hai nguoi") return "both";
  return "haianh";
}

function expandItemByRole(item) {
  const role = normalizeRole(item.role);
  if (role === "both") {
    return [
      { ...item, role: "haianh", side: "top" },
      { ...item, role: "toi", side: "bottom" },
    ];
  }
  return [{ ...item, role, side: role === "toi" ? "bottom" : "top" }];
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  const mapped = [];
  items.forEach((item) => {
    if (!item || typeof item.title !== "string" || !item.title.trim()) return;
    const base = {
      date: String(item.date || "").trim() || "?",
      title: String(item.title || "").trim().slice(0, 180),
      desc: String(item.desc || "").trim().slice(0, 320),
      future: Boolean(item.future),
    };
    expandItemByRole({ ...base, role: item.role }).forEach((x) => mapped.push(x));
  });
  return mapped;
}

function normalizeJourneyState(data) {
  const avatars = {
    haianh: String(data?.avatars?.haianh || DEFAULT_HAIANH).trim() || DEFAULT_HAIANH,
    toi: String(data?.avatars?.toi || DEFAULT_TOI).trim() || DEFAULT_TOI,
  };
  const items = Array.isArray(data?.items)
    ? data.items
        .map((item) => ({
          date: String(item?.date || "").trim().slice(0, 80),
          role: normalizeRole(item?.role),
          title: String(item?.title || "").trim().slice(0, 180),
          desc: String(item?.desc || "").trim().slice(0, 700),
          future: Boolean(item?.future),
        }))
        .filter((item) => item.title)
    : [];
  return { avatars, items };
}

function buildDisplayState(state) {
  const items = Array.isArray(state?.items) ? state.items.slice() : [];
  if (!items.some((item) => item && item.future)) {
    items.push(fallbackData.items[fallbackData.items.length - 1]);
  }
  return {
    avatars: state?.avatars || fallbackData.avatars,
    items,
  };
}

function setFormMode(nextIndex) {
  editingIndex = Number.isInteger(nextIndex) ? nextIndex : -1;
  const editing = editingIndex >= 0;
  if (formModeEl) formModeEl.textContent = editing ? `Che do: Dang sua moc #${editingIndex + 1}` : "Che do: Them moi";
  if (addSubmitBtn) addSubmitBtn.textContent = editing ? "Cap nhat moc" : "Luu moc";
}

function buildStep(item, avatars, index) {
  const step = document.createElement("article");
  step.className = `journey-step ${item.side} ${item.future ? "future" : ""}`;
  step.setAttribute("data-step", "");
  step.setAttribute("data-role", item.role);
  step.style.setProperty("--stagger", `${Math.min(index * 55, 480)}ms`);
  step.innerHTML = `
    <div class="journey-card">
      <div class="journey-date">
        <span>${item.date}</span>
        <img class="journey-avatar" src="${avatarOf(item.role, avatars)}" alt="${roleLabel(item.role)}" />
      </div>
      <span class="journey-role">${roleLabel(item.role)}</span>
      <h3 class="journey-step-title">${item.title}</h3>
      <p class="journey-step-desc">${item.desc}</p>
    </div>
    <div class="journey-node" aria-hidden="true"></div>
  `;
  const avatar = step.querySelector(".journey-avatar");
  if (avatar) {
    avatar.addEventListener(
      "error",
      () => {
        avatar.src = item.role === "toi" ? DEFAULT_TOI : DEFAULT_HAIANH;
      },
      { once: true }
    );
  }
  return step;
}

function animateFill() {
  fillCurrent += (fillTarget - fillCurrent) * 0.16;
  if (Math.abs(fillTarget - fillCurrent) < 0.12) {
    fillCurrent = fillTarget;
  } else {
    fillRaf = requestAnimationFrame(animateFill);
  }
  fillEl.style.width = `${fillCurrent.toFixed(2)}%`;
}

function updateFill() {
  const max = Math.max(1, scrollEl.scrollWidth - scrollEl.clientWidth);
  const progress = Math.min(1, Math.max(0, scrollEl.scrollLeft / max));
  fillTarget = progress * 100;
  if (!fillRaf) {
    fillRaf = requestAnimationFrame(() => {
      fillRaf = 0;
      animateFill();
    });
  }
}

function updateFocusedStep() {
  const steps = Array.from(trackEl.querySelectorAll(".journey-step"));
  if (!steps.length) return;
  const center = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
  let winner = null;
  let minDist = Number.POSITIVE_INFINITY;
  steps.forEach((step) => {
    const stepCenter = step.offsetLeft + step.offsetWidth / 2;
    const dist = Math.abs(stepCenter - center);
    if (dist < minDist) {
      minDist = dist;
      winner = step;
    }
  });
  steps.forEach((step) => step.classList.toggle("focus", step === winner));
}

function bindReveal() {
  const steps = Array.from(trackEl.querySelectorAll("[data-step]"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    {
      root: scrollEl,
      threshold: 0.32,
    }
  );
  steps.forEach((step) => observer.observe(step));
}

function renderTimeline(data) {
  trackEl.querySelectorAll(".journey-step").forEach((n) => n.remove());
  const avatars = data?.avatars || fallbackData.avatars;
  const items = normalizeItems(data?.items);

  if (!items.length) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  items.forEach((item, index) => {
    trackEl.appendChild(buildStep(item, avatars, index));
  });
  bindReveal();
  updateFill();
  updateFocusedStep();
}

function renderManageList() {
  if (!manageListEl) return;
  const items = Array.isArray(currentJourneyState?.items) ? currentJourneyState.items : [];
  manageListEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "journey-create-hint";
    empty.textContent = "Chua co moc nao.";
    manageListEl.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "journey-manage-item";
    row.innerHTML = `
      <div class="journey-manage-head">
        <span class="journey-manage-time">${item.date || "Moc moi"}</span>
        <span class="journey-manage-role">${roleShortLabel(normalizeRole(item.role))}</span>
      </div>
      <p class="journey-manage-name">${item.title || "(Chua co tieu de)"}</p>
      <div class="journey-manage-actions">
        <button class="journey-mini-btn" type="button" data-act="edit" data-idx="${index}">Sua</button>
        <button class="journey-mini-btn danger" type="button" data-act="delete" data-idx="${index}">Xoa</button>
      </div>
    `;
    manageListEl.appendChild(row);
  });
}

async function saveJourneyState(nextState) {
  const res = await fetch(API_BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextState),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Khong the luu du lieu hanh trinh.");
  }
  currentJourneyState = normalizeJourneyState(data);
  renderTimeline(buildDisplayState(currentJourneyState));
  renderManageList();
}

async function loadTimeline() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("load fail");
    const data = await res.json();
    currentJourneyState = normalizeJourneyState(data);
    renderTimeline(buildDisplayState(currentJourneyState));
    renderManageList();
  } catch (_err) {
    currentJourneyState = normalizeJourneyState(fallbackData);
    renderTimeline(buildDisplayState(currentJourneyState));
    renderManageList();
  }
}

function setAddPanelOpen(open) {
  if (!addPanelEl || !addToggleBtn) return;
  addPanelEl.hidden = !open;
  addToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
  addToggleBtn.textContent = open ? "Dong them hanh trinh" : "Them hanh trinh";
  document.body.classList.toggle("journey-sheet-open", Boolean(open));
  if (addStatusEl && open) addStatusEl.textContent = "";
  if (open) {
    addTitleInput?.focus();
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }
}

function clearAddForm() {
  if (addDateInput) addDateInput.value = "";
  if (addRoleInput) addRoleInput.value = "haianh";
  if (addTitleInput) addTitleInput.value = "";
  if (addDescInput) addDescInput.value = "";
  if (addFutureInput) addFutureInput.checked = false;
  setFormMode(-1);
}

function collectAddItem() {
  const title = String(addTitleInput?.value || "").trim().slice(0, 180);
  if (!title) {
    return { error: "Can nhap tieu de moc." };
  }
  const role = normalizeRole(addRoleInput?.value || "haianh");
  const date = String(addDateInput?.value || "").trim().slice(0, 80) || "Moc moi";
  const desc = String(addDescInput?.value || "").trim().slice(0, 700);
  const future = Boolean(addFutureInput?.checked);
  return {
    item: { date, role, title, desc, future },
  };
}

async function submitAddItem() {
  if (isSavingAdd) return;
  const { item, error } = collectAddItem();
  if (error) {
    if (addStatusEl) addStatusEl.textContent = error;
    return;
  }

  isSavingAdd = true;
  if (addSubmitBtn) addSubmitBtn.disabled = true;
  if (addStatusEl) addStatusEl.textContent = "Dang luu moc...";

  try {
    const wasEditing = editingIndex >= 0;
    const existing = Array.isArray(currentJourneyState.items) ? currentJourneyState.items.slice() : [];
    if (editingIndex >= 0 && editingIndex < existing.length) {
      existing[editingIndex] = item;
    } else {
      existing.push(item);
    }
    const nextState = {
      avatars: currentJourneyState.avatars || fallbackData.avatars,
      items: existing,
    };
    await saveJourneyState(nextState);
    clearAddForm();
    if (addStatusEl) addStatusEl.textContent = wasEditing ? "Da cap nhat moc." : "Da luu moc moi.";
  } catch (err) {
    if (addStatusEl) addStatusEl.textContent = `Loi: ${err.message}`;
  } finally {
    isSavingAdd = false;
    if (addSubmitBtn) addSubmitBtn.disabled = false;
  }
}

function bindHeroMotion() {
  if (!heroEl || window.matchMedia("(max-width: 980px)").matches) return;
  heroEl.addEventListener("pointermove", (event) => {
    const rect = heroEl.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    heroEl.style.setProperty("--mx", `${(x * 8).toFixed(2)}px`);
    heroEl.style.setProperty("--my", `${(y * 8).toFixed(2)}px`);
  });
  heroEl.addEventListener("pointerleave", () => {
    heroEl.style.setProperty("--mx", "0px");
    heroEl.style.setProperty("--my", "0px");
  });
}

prevBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: -340, behavior: "smooth" });
});

nextBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: 340, behavior: "smooth" });
});

scrollEl?.addEventListener("scroll", () => {
  updateFill();
  updateFocusedStep();
}, { passive: true });

window.addEventListener("resize", () => {
  updateFill();
  updateFocusedStep();
}, { passive: true });

addToggleBtn?.addEventListener("click", () => {
  const willOpen = addPanelEl?.hidden;
  setAddPanelOpen(Boolean(willOpen));
});

addCancelBtn?.addEventListener("click", () => {
  setAddPanelOpen(false);
  clearAddForm();
});

addSubmitBtn?.addEventListener("click", () => {
  submitAddItem();
});

resetFormBtn?.addEventListener("click", () => {
  clearAddForm();
  if (addStatusEl) addStatusEl.textContent = "Da reset form.";
});

manageListEl?.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  const act = btn.getAttribute("data-act");
  const idx = Number(btn.getAttribute("data-idx"));
  if (!Number.isInteger(idx)) return;
  const items = Array.isArray(currentJourneyState.items) ? currentJourneyState.items : [];
  const target = items[idx];
  if (!target) return;

  if (act === "edit") {
    if (addDateInput) addDateInput.value = target.date || "";
    if (addRoleInput) addRoleInput.value = normalizeRole(target.role);
    if (addTitleInput) addTitleInput.value = target.title || "";
    if (addDescInput) addDescInput.value = target.desc || "";
    if (addFutureInput) addFutureInput.checked = Boolean(target.future);
    setFormMode(idx);
    if (addStatusEl) addStatusEl.textContent = `Dang sua moc #${idx + 1}`;
    if (addPanelEl?.hidden) setAddPanelOpen(true);
    addTitleInput?.focus();
    return;
  }

  if (act === "delete") {
    const ok = window.confirm(`Xoa moc "${target.title || "khong tieu de"}"?`);
    if (!ok) return;
    if (addStatusEl) addStatusEl.textContent = "Dang xoa moc...";
    try {
      const nextItems = items.filter((_, i) => i !== idx);
      await saveJourneyState({
        avatars: currentJourneyState.avatars || fallbackData.avatars,
        items: nextItems,
      });
      if (editingIndex === idx) clearAddForm();
      if (editingIndex > idx) setFormMode(editingIndex - 1);
      if (addStatusEl) addStatusEl.textContent = "Da xoa moc.";
    } catch (err) {
      if (addStatusEl) addStatusEl.textContent = `Loi: ${err.message}`;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAddPanelOpen(false);
});

bindHeroMotion();
loadTimeline();
