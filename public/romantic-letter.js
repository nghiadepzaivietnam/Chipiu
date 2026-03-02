const scene = document.getElementById("scene");
const envelopeTrigger = document.getElementById("envelopeTrigger");
const envelopeWrap = document.getElementById("envelopeWrap");
const letter = document.getElementById("letter");
const letterInner = document.getElementById("letterInner");
const sparkBurst = document.getElementById("sparkBurst");
const audioToggle = document.getElementById("audioToggle");

const starsCanvas = document.getElementById("starsCanvas");
const heartsCanvas = document.getElementById("heartsCanvas");
const sctx = starsCanvas.getContext("2d", { alpha: true });
const hctx = heartsCanvas.getContext("2d", { alpha: true });

const bgAmbient = document.getElementById("bgAmbient");
const loveSong = document.getElementById("loveSong");

const SONG_START_SECONDS = 42;

let opened = false;
let soundEnabled = true;
let targetAmbientVolume = 0;
let audioReady = {
  ambient: false,
  song: false,
};

const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

const stars = [];
const hearts = [];
let width = 0;
let height = 0;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function resizeCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;

  starsCanvas.width = Math.floor(width * dpr);
  starsCanvas.height = Math.floor(height * dpr);
  starsCanvas.style.width = `${width}px`;
  starsCanvas.style.height = `${height}px`;
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  heartsCanvas.width = Math.floor(width * dpr);
  heartsCanvas.height = Math.floor(height * dpr);
  heartsCanvas.style.width = `${width}px`;
  heartsCanvas.style.height = `${height}px`;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  seedParticles();
}

function seedParticles() {
  stars.length = 0;
  hearts.length = 0;

  const starCount = Math.max(90, Math.floor((width * height) / 8000));
  const heartCount = Math.max(26, Math.floor((width * height) / 35000));

  for (let i = 0; i < starCount; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.45,
      base: 0.2 + Math.random() * 0.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.02,
      depth: 0.2 + Math.random() * 0.8,
    });
  }

  for (let i = 0; i < heartCount; i += 1) {
    hearts.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 5 + Math.random() * 9,
      vx: (Math.random() - 0.5) * 0.16,
      vy: -0.1 - Math.random() * 0.28,
      a: 0.18 + Math.random() * 0.28,
      twinkle: Math.random() * Math.PI * 2,
      depth: 0.4 + Math.random() * 1.2,
    });
  }
}

function drawHeart(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 14, size / 14);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(0, -3, -10, -3, -10, 4);
  ctx.bezierCurveTo(-10, 10, -3, 14, 0, 18);
  ctx.bezierCurveTo(3, 14, 10, 10, 10, 4);
  ctx.bezierCurveTo(10, -3, 0, -3, 0, 4);
  ctx.closePath();
  ctx.fillStyle = `rgba(255, 157, 214, ${alpha})`;
  ctx.shadowColor = "rgba(255, 179, 234, 0.8)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}

function renderBackground(t) {
  sctx.clearRect(0, 0, width, height);
  hctx.clearRect(0, 0, width, height);

  const px = (pointer.x - 0.5) * 10;
  const py = (pointer.y - 0.5) * 10;

  for (const star of stars) {
    star.twinkle += star.speed;
    const alpha = Math.max(0.05, star.base + Math.sin(star.twinkle) * 0.2);
    const sx = star.x - px * star.depth * 0.12;
    const sy = star.y - py * star.depth * 0.12;

    sctx.beginPath();
    sctx.arc(sx, sy, star.r, 0, Math.PI * 2);
    sctx.fillStyle = `rgba(255, 245, 255, ${alpha})`;
    sctx.fill();
  }

  for (const heart of hearts) {
    heart.y += heart.vy;
    heart.x += heart.vx;
    heart.twinkle += 0.02;

    if (heart.y < -26) {
      heart.y = height + 20;
      heart.x = Math.random() * width;
    }
    if (heart.x < -30) heart.x = width + 20;
    if (heart.x > width + 30) heart.x = -20;

    const alpha = Math.max(0.08, heart.a + Math.sin(heart.twinkle) * 0.12);
    const hx = heart.x - px * heart.depth * 0.25;
    const hy = heart.y - py * heart.depth * 0.25;
    drawHeart(hctx, hx, hy, heart.size, alpha);
  }
}

function updateParallax() {
  pointer.x = lerp(pointer.x, pointer.tx, 0.08);
  pointer.y = lerp(pointer.y, pointer.ty, 0.08);

  const nx = (pointer.x - 0.5) * 2;
  const ny = (pointer.y - 0.5) * 2;

  const tiltX = nx * 4.5;
  const tiltY = -ny * 4.2;
  envelopeWrap.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
  envelopeWrap.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);

  const lx = 50 + nx * 18;
  const ly = 38 + ny * 18;
  envelopeWrap.style.setProperty("--lx", `${lx}%`);
  envelopeWrap.style.setProperty("--ly", `${ly}%`);

  const paperX = 50 + nx * 10;
  const paperY = 28 + ny * 10;
  letter.style.setProperty("--px", `${paperX}%`);
  letter.style.setProperty("--py", `${paperY}%`);
}

function animate(time) {
  updateParallax();
  renderBackground(time);

  const current = bgAmbient.volume;
  const next = lerp(current, targetAmbientVolume, 0.04);
  bgAmbient.volume = Math.max(0, Math.min(0.35, next));

  requestAnimationFrame(animate);
}

function spawnSparkBurst() {
  sparkBurst.innerHTML = "";
  for (let i = 0; i < 34; i += 1) {
    const s = document.createElement("span");
    s.className = "spark";
    s.style.left = `${5 + Math.random() * 90}%`;
    s.style.top = `${8 + Math.random() * 80}%`;
    s.style.animationDelay = `${Math.random() * 160}ms`;
    s.style.animationDuration = `${700 + Math.random() * 500}ms`;
    sparkBurst.appendChild(s);
  }
}

function revealLines() {
  const lines = letterInner.querySelectorAll(".line");
  lines.forEach((line, idx) => {
    setTimeout(() => line.classList.add("visible"), 580 + idx * 220);
  });
}

function createAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  return AC ? new AC() : null;
}

const fxCtx = createAudioContext();

function playPaperFx() {
  if (!fxCtx || !soundEnabled) return;
  const now = fxCtx.currentTime;
  const noiseBuffer = fxCtx.createBuffer(1, fxCtx.sampleRate * 0.25, fxCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = fxCtx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = fxCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.8;

  const gain = fxCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(fxCtx.destination);
  source.start(now);
  source.stop(now + 0.26);
}

function playSparkleFx() {
  if (!fxCtx || !soundEnabled) return;
  const now = fxCtx.currentTime;
  for (let i = 0; i < 6; i += 1) {
    const osc = fxCtx.createOscillator();
    const gain = fxCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 900 + i * 180;
    gain.gain.setValueAtTime(0.0001, now + i * 0.03);
    gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.03 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 0.18);

    osc.connect(gain);
    gain.connect(fxCtx.destination);
    osc.start(now + i * 0.03);
    osc.stop(now + i * 0.03 + 0.2);
  }
}

async function tryPlay(audioEl) {
  try {
    await audioEl.play();
  } catch (_err) {
    // ignore playback blocked or missing file
  }
}

function updateAudioUi() {
  audioToggle.classList.toggle("muted", !soundEnabled);
  const missingAll = !audioReady.ambient && !audioReady.song;
  audioToggle.textContent = missingAll ? "!" : soundEnabled ? "♫" : "♪";
  audioToggle.title = missingAll
    ? "Missing audio files: /audio/romantic-ambient.mp3 and /audio/noi-nay-co-anh.mp3"
    : "Toggle sound";
}

async function startAudioExperience() {
  if (!soundEnabled) return;
  if (!audioReady.ambient && !audioReady.song) return;

  if (fxCtx && fxCtx.state === "suspended") {
    await fxCtx.resume().catch(() => {});
  }

  if (audioReady.ambient) {
    targetAmbientVolume = 0.16;
    await tryPlay(bgAmbient);
  }

  if (audioReady.song) {
    loveSong.currentTime = SONG_START_SECONDS;
    loveSong.volume = 0.9;
    await tryPlay(loveSong);
  }
}

function fadeOutSong() {
  const fade = setInterval(() => {
    if (loveSong.volume <= 0.03) {
      loveSong.pause();
      loveSong.volume = 0.9;
      clearInterval(fade);
      return;
    }
    loveSong.volume = Math.max(0, loveSong.volume - 0.03);
  }, 80);
}

audioToggle.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (!audioReady.ambient && !audioReady.song) {
    alert("Không tìm thấy file nhạc. Hãy thêm:\n- public/audio/noi-nay-co-anh.mp3\n- public/audio/romantic-ambient.mp3");
    return;
  }
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    targetAmbientVolume = audioReady.ambient ? (opened ? 0.16 : 0.08) : 0;
    if (audioReady.ambient) await tryPlay(bgAmbient);
    if (opened && audioReady.song) {
      await tryPlay(loveSong);
    }
  } else {
    targetAmbientVolume = 0;
    if (audioReady.song) fadeOutSong();
  }

  updateAudioUi();
});

envelopeTrigger.addEventListener("click", async () => {
  if (opened) return;
  opened = true;

  scene.classList.add("opening");
  document.body.classList.add("focus-envelope");

  spawnSparkBurst();
  playPaperFx();

  setTimeout(() => {
    scene.classList.add("opened");
    playSparkleFx();
    revealLines();
  }, 260);

  setTimeout(() => {
    document.body.classList.remove("focus-envelope");
    document.body.classList.add("focus-letter");
    scene.classList.remove("opening");
  }, 1200);

  await startAudioExperience();
});

window.addEventListener("mousemove", (e) => {
  pointer.tx = e.clientX / width;
  pointer.ty = e.clientY / height;
});

window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (!t) return;
  pointer.tx = t.clientX / width;
  pointer.ty = t.clientY / height;
}, { passive: true });

window.addEventListener("resize", resizeCanvases);

bgAmbient.addEventListener("canplaythrough", () => {
  audioReady.ambient = true;
  updateAudioUi();
});
loveSong.addEventListener("canplaythrough", () => {
  audioReady.song = true;
  updateAudioUi();
});
bgAmbient.addEventListener("error", () => {
  audioReady.ambient = false;
  updateAudioUi();
});
loveSong.addEventListener("error", () => {
  audioReady.song = false;
  updateAudioUi();
});

updateAudioUi();
resizeCanvases();
requestAnimationFrame(animate);
