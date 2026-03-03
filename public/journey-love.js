const DEFAULT_HAIANH = "/hai-anh.jpg";
const DEFAULT_TOI = "/uploads/1772244572266-5389.jpg";

const scrollEl = document.getElementById("journeyScroll");
const trackEl = document.getElementById("journeyTrack");
const fillEl = document.getElementById("journeyLineFill");
const prevBtn = document.getElementById("journeyPrev");
const nextBtn = document.getElementById("journeyNext");
const emptyEl = document.getElementById("journeyEmpty");

const fallbackData = {
  avatars: {
    haianh: DEFAULT_HAIANH,
    toi: DEFAULT_TOI,
  },
  items: [
    {
      date: "14/02/2023",
      role: "haianh",
      title: "Lần đầu nói chuyện thật lâu",
      desc: "Một tối tưởng bình thường, lại thành điểm bắt đầu của mọi điều dịu dàng.",
      future: false,
    },
    {
      date: "01/06/2023",
      role: "toi",
      title: "Chính thức bên nhau",
      desc: "Từ đây timeline của tụi mình có tên, có hẹn và có trái tim ở giữa.",
      future: false,
    },
    {
      date: "24/12/2023",
      role: "haianh",
      title: "Noel đầu tiên cùng nhau",
      desc: "Đi qua thành phố đầy đèn, nắm tay nhau và kể những ước mơ bé xíu.",
      future: false,
    },
    {
      date: "03/03/2024",
      role: "toi",
      title: "Lời hứa cho hành trình dài",
      desc: "Không cần quá nhiều từ ngữ, chỉ cần luôn chọn nhau thêm một lần nữa.",
      future: false,
    },
    {
      date: "Tương lai",
      role: "haianh",
      title: "Tương lai của chúng ta 💍",
      desc: "Ngôi nhà nhỏ, những chuyến đi dài và một timeline không bao giờ dừng lại.",
      future: true,
    },
  ],
};

function roleLabel(role) {
  return role === "toi" ? "Trọng Nghĩa" : "Hải Anh";
}

function avatarOf(role, avatars) {
  return role === "toi" ? avatars.toi || DEFAULT_TOI : avatars.haianh || DEFAULT_HAIANH;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.title === "string" && item.title.trim())
    .map((item, index) => {
      const side = index % 2 === 0 ? "top" : "bottom";
      const role = side === "top" ? "haianh" : "toi";
      return {
        date: String(item.date || "").trim() || "?",
        role,
        side,
        title: String(item.title || "").trim().slice(0, 180),
        desc: String(item.desc || "").trim().slice(0, 320),
        future: Boolean(item.future),
      };
    });
}

function buildStep(item, avatars) {
  const step = document.createElement("article");
  step.className = `journey-step ${item.side} ${item.future ? "future" : ""}`;
  step.setAttribute("data-step", "");
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

function updateFill() {
  const max = Math.max(1, scrollEl.scrollWidth - scrollEl.clientWidth);
  const progress = Math.min(1, Math.max(0, scrollEl.scrollLeft / max));
  fillEl.style.width = `${(progress * 100).toFixed(2)}%`;
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
      threshold: 0.42,
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
  items.forEach((item) => {
    trackEl.appendChild(buildStep(item, avatars));
  });
  bindReveal();
  updateFill();
}

async function loadTimeline() {
  try {
    const res = await fetch("/api/journey");
    if (!res.ok) throw new Error("load fail");
    const data = await res.json();

    const withFuture = Array.isArray(data?.items) ? data.items.slice() : [];
    if (!withFuture.some((x) => x && x.future)) {
      withFuture.push(fallbackData.items[fallbackData.items.length - 1]);
    }
    renderTimeline({
      avatars: data?.avatars || fallbackData.avatars,
      items: withFuture,
    });
  } catch (_err) {
    renderTimeline(fallbackData);
  }
}

prevBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: -340, behavior: "smooth" });
});

nextBtn?.addEventListener("click", () => {
  scrollEl.scrollBy({ left: 340, behavior: "smooth" });
});

scrollEl?.addEventListener("scroll", updateFill, { passive: true });
window.addEventListener("resize", updateFill, { passive: true });

loadTimeline();
