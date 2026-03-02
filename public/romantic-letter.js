const envelopeBtn = document.getElementById("envelopeBtn");
const sparkles = document.getElementById("sparkles");

let opened = false;

function spawnSparkles() {
  sparkles.innerHTML = "";
  for (let i = 0; i < 24; i += 1) {
    const dot = document.createElement("span");
    dot.className = "spark";
    dot.style.left = `${8 + Math.random() * 84}%`;
    dot.style.top = `${20 + Math.random() * 60}%`;
    dot.style.animationDelay = `${Math.random() * 230}ms`;
    dot.style.animationDuration = `${650 + Math.random() * 450}ms`;
    sparkles.appendChild(dot);
  }
}

envelopeBtn.addEventListener("click", () => {
  if (opened) return;
  opened = true;
  envelopeBtn.classList.add("opened", "float");
  spawnSparkles();
});

// floating romantic particles
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let w = 0;
let h = 0;
let particles = [];

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}

function createParticle() {
  const size = 1 + Math.random() * 3;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: size,
    a: 0.1 + Math.random() * 0.45,
    vy: 0.18 + Math.random() * 0.42,
    vx: (Math.random() - 0.5) * 0.18,
    tw: Math.random() * Math.PI * 2,
  };
}

function seed() {
  const count = Math.max(36, Math.round((w * h) / 21000));
  particles = Array.from({ length: count }, createParticle);
}

function draw() {
  ctx.clearRect(0, 0, w, h);

  particles.forEach((p) => {
    p.y -= p.vy;
    p.x += p.vx;
    p.tw += 0.03;

    if (p.y < -10) p.y = h + 10;
    if (p.x > w + 10) p.x = -10;
    if (p.x < -10) p.x = w + 10;

    const alpha = p.a + Math.sin(p.tw) * 0.08;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}

resize();
seed();
draw();
window.addEventListener("resize", () => {
  resize();
  seed();
});
