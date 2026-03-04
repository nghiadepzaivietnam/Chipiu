const DEFAULT_HAIANH = "/hai-anh.jpg";
const DEFAULT_TOI = "/uploads/1772244572266-5389.jpg";

const scrollEl = document.getElementById("journeyScroll");
const trackEl = document.getElementById("journeyTrack");
const fillEl = document.getElementById("journeyLineFill");
const prevBtn = document.getElementById("journeyPrev");
const nextBtn = document.getElementById("journeyNext");
const emptyEl = document.getElementById("journeyEmpty");
const heroEl = document.querySelector(".journey-hero");
const navEl = document.querySelector(".journey-nav");
const finaleEl = document.getElementById("journeyFinale");

const API_BASE = "/api/journey";

const fallbackData = {
  avatars: {
    haianh: DEFAULT_HAIANH,
    toi: DEFAULT_TOI,
  },
  items: [],
};

let fillTarget = 0;
let fillCurrent = 0;
let fillRaf = 0;

function roleLabel(role) {
  return role === "toi" ? "Trong Nghia" : "Hai Anh";
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
    fillEl.style.width = "0%";
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

async function loadTimeline() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("load fail");
    const data = await res.json();
    renderTimeline({
      avatars: data?.avatars || fallbackData.avatars,
      items: Array.isArray(data?.items) ? data.items : [],
    });
  } catch (_err) {
    renderTimeline(fallbackData);
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

function bindNavSnap() {
  if (!navEl) return;
  const links = Array.from(navEl.querySelectorAll(".journey-nav-link"));
  if (!links.length) return;

  const leftInset = 8;
  let snapTimer = 0;

  const snapToNearest = (smooth) => {
    const current = navEl.scrollLeft;
    let bestLeft = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    links.forEach((link) => {
      const candidate = Math.max(0, link.offsetLeft - leftInset);
      const distance = Math.abs(candidate - current);
      if (distance < minDistance) {
        minDistance = distance;
        bestLeft = candidate;
      }
    });
    navEl.scrollTo({ left: bestLeft, behavior: smooth ? "smooth" : "auto" });
  };

  const resetToStartOnMobile = () => {
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    navEl.scrollTo({ left: 0, behavior: "auto" });
  };

  resetToStartOnMobile();
  requestAnimationFrame(() => snapToNearest(false));

  navEl.addEventListener(
    "scroll",
    () => {
      clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => snapToNearest(true), 120);
    },
    { passive: true }
  );
}

function bindFinaleReveal() {
  if (!finaleEl) return;
  const reveal = () => finaleEl.classList.add("is-visible");
  if (!("IntersectionObserver" in window)) {
    reveal();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(finaleEl);
}

prevBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: -340, behavior: "smooth" });
});

nextBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: 340, behavior: "smooth" });
});

scrollEl?.addEventListener(
  "scroll",
  () => {
    updateFill();
    updateFocusedStep();
  },
  { passive: true }
);

window.addEventListener(
  "resize",
  () => {
    updateFill();
    updateFocusedStep();
  },
  { passive: true }
);

bindHeroMotion();
bindNavSnap();
bindFinaleReveal();
loadTimeline();
