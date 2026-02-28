const STORAGE_KEY = 'loveStartISO';

const startDateInput = document.getElementById('startDate');
const startTimeInput = document.getElementById('startTime');
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');
const display = document.getElementById('counterDisplay');
const refreshBtn = document.getElementById('refreshBtn');
const bgImageInput = document.getElementById('bgImageInput');
const clearBgBtn = document.getElementById('clearBgBtn');
const bgMsg = document.getElementById('bgMsg');

function applyBackgroundImage(dataUrl) {
  if (!dataUrl) {
    document.body.style.setProperty('--counter-bg-image', 'none');
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
    return;
  }
  const safeUrl = dataUrl.replace(/"/g, '\\"');
  document.body.style.setProperty('--counter-bg-image', `url("${safeUrl}")`);
  document.body.style.backgroundImage = `url("${safeUrl}")`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
}

async function loadSavedBackground() {
  try {
    const res = await fetch('/api/counter-bg');
    if (!res.ok) throw new Error('Cannot load background');
    const data = await res.json();
    applyBackgroundImage(data?.imageUrl || null);
  } catch (_err) {
    applyBackgroundImage(null);
  }
}

function loadSaved() {
  const iso = localStorage.getItem(STORAGE_KEY);
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  startDateInput.value = iso.slice(0, 10);
  const timePart = iso.slice(11, 16);
  if (timePart) startTimeInput.value = timePart;
  return d;
}

function buildDate() {
  const datePart = startDateInput.value;
  if (!datePart) return null;
  const timePart = startTimeInput.value || '00:00';
  const iso = `${datePart}T${timePart}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function humanDiff(start) {
  const now = new Date();
  const diffMs = now - start;
  const days = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(days / 7);
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  const nextMonth = months + 1;
  const nextDate = new Date(start);
  nextDate.setMonth(start.getMonth() + nextMonth);

  const weekdayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const weekday = weekdayNames[start.getDay()];

  return { days, weeks, months, nextDate, weekday };
}

function render() {
  const start = loadSaved();
  if (!start) {
    display.innerHTML = '<p class="status">Chưa có ngày bắt đầu, hãy chọn ở trên nhé.</p>';
    return;
  }
  const { days, weeks, months, nextDate, weekday } = humanDiff(start);
  const fmt = (d) =>
    d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

  display.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <p class="stat-title">Ngày bên nhau</p>
        <p class="stat-value">D+${days}</p>
        <p class="soft-note">Bắt đầu vào ${weekday} ${start.toLocaleDateString('vi-VN')}</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Tuần</p>
        <p class="stat-value">${weeks}</p>
        <p class="soft-note">Cùng nhau đi qua từng tuần lễ</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Tháng</p>
        <p class="stat-value">${months}</p>
        <p class="soft-note">Mỗi tháng một kỷ niệm nho nhỏ</p>
      </div>
      <div class="stat-card">
        <p class="stat-title">Kỷ niệm kế tiếp</p>
        <p class="stat-value">${fmt(nextDate)}</p>
        <p class="soft-note">Đặt lịch hẹn hò nhé!</p>
      </div>
    </div>
  `;
}




saveBtn?.addEventListener('click', () => {
  const d = buildDate();
  if (!d) {
    saveMsg.textContent = 'Ngày/giờ không hợp lệ.';
    return;
  }
  localStorage.setItem(STORAGE_KEY, d.toISOString());
  saveMsg.textContent = 'Đã lưu! Reload tự động.';
  render();
});

refreshBtn?.addEventListener('click', render);

bgImageInput?.addEventListener('change', () => {
  const file = bgImageInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    bgMsg.textContent = 'Vui lòng chọn file ảnh hợp lệ.';
    return;
  }

  const fd = new FormData();
  fd.append('image', file);

  bgMsg.textContent = 'Đang tải ảnh lên...';
  fetch('/api/counter-bg', {
    method: 'POST',
    body: fd,
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Tải ảnh thất bại.');
      }
      applyBackgroundImage(data.imageUrl || null);
      bgMsg.textContent = 'Đã cập nhật ảnh nền.';
    })
    .catch((err) => {
      bgMsg.textContent = `Không cập nhật được ảnh nền: ${err.message}`;
    });
});

clearBgBtn?.addEventListener('click', () => {
  fetch('/api/counter-bg', { method: 'DELETE' })
    .then((res) => {
      if (!res.ok) throw new Error('Xoá ảnh thất bại.');
      applyBackgroundImage(null);
      if (bgImageInput) bgImageInput.value = '';
      bgMsg.textContent = 'Đã xoá ảnh nền.';
    })
    .catch((err) => {
      bgMsg.textContent = `Không xoá được ảnh nền: ${err.message}`;
    });
});

/* ===== HEART PARTICLE EFFECT ===== */

const canvas = document.getElementById('heartCanvas');
const ctx = canvas?.getContext('2d');

function heartFunction(t) {
  return {
    x: 16 * Math.sin(t) ** 3,
    y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
  };
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticles(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const pos = heartFunction(t);
    const layer = Math.random();
    const depth = 0.52 + Math.pow(layer, 1.15) * 0.6;

    list.push({
      baseX: pos.x * depth,
      baseY: pos.y * depth,
      size: 0.7 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
      jitterRadius: Math.random() * 2.6,
      jitterAngle: Math.random() * Math.PI * 2,
      speed: 0.75 + Math.random() * 0.7,
      edge: layer > 0.72,
    });
  }
  return list;
}

function createSparkles(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.35 + Math.random() * 1.2,
      alpha: 0.15 + Math.random() * 0.35,
      speed: 0.3 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
    });
  }
  return list;
}

let time = 0;
let particles = [];
let sparkles = [];

function drawGlow(cx, cy, radius) {
  const g = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
  g.addColorStop(0, 'rgba(255, 205, 225, 0.22)');
  g.addColorStop(0.4, 'rgba(255, 105, 170, 0.16)');
  g.addColorStop(1, 'rgba(124, 58, 237, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  if (!canvas || !ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  sparkles.forEach((s) => {
    const twinkle = 0.5 + Math.sin(time * s.speed + s.offset) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * (0.5 + twinkle * 0.6)})`;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r + twinkle * 0.8, 0, Math.PI * 2);
    ctx.fill();
  });

  const centerX = w * 0.5;
  const centerY = h * 0.52;
  const baseScale = Math.min(w, h) * 0.018;
  const heartbeat = 1 + Math.sin(time * 2.6) * 0.065 + Math.sin(time * 5.2) * 0.018;
  const scale = baseScale * heartbeat;

  drawGlow(centerX, centerY, Math.min(w, h) * 0.3);

  particles.forEach((p) => {
    const jitterPulse = Math.sin(time * p.speed + p.twinkleOffset);
    const jitter = p.jitterRadius * jitterPulse;
    const x = centerX + p.baseX * scale + Math.cos(p.jitterAngle) * jitter;
    const y = centerY + p.baseY * scale + Math.sin(p.jitterAngle) * jitter;
    const twinkle = 0.45 + Math.sin(time * 2 + p.twinkleOffset) * 0.55;
    const alpha = p.edge ? 0.78 : 0.5;
    const hue = p.edge ? 350 : 328;
    const sat = p.edge ? 100 : 92;
    const light = p.edge ? 76 : 66;

    ctx.beginPath();
    ctx.arc(x, y, p.size + twinkle * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.shadowColor = p.edge ? 'rgba(255, 88, 154, 0.7)' : 'rgba(255, 122, 182, 0.5)';
    ctx.shadowBlur = p.edge ? 18 : 10;
    ctx.fill();
  });

  ctx.shadowBlur = 0;
  time += 0.022;
  requestAnimationFrame(animate);
}

if (canvas && ctx) {
  const particleCount = window.innerWidth < 640 ? 1100 : 1800;
  particles = createParticles(particleCount);
  sparkles = createSparkles(100);
  resizeCanvas();
  animate();
  window.addEventListener('resize', resizeCanvas);
}

loadSavedBackground();
render();
