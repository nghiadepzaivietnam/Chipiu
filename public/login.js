const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('user');
const passwordInput = document.getElementById('pass');
const statusEl = document.getElementById('loginStatus');
const kitty = document.getElementById('kitty');
const eyeL = document.getElementById('eyeL');
const eyeR = document.getElementById('eyeR');
const handL = document.getElementById('handL');
const handR = document.getElementById('handR');
const tear1 = document.getElementById('tear1');
const tear2 = document.getElementById('tear2');

const HASH = '616e7fe36c4fd47aaf136464690b71a12f073293af7c9a7f5ff15cb9192324e0';
const USERNAME = 'chipiu';
let attempts = 0;

function getNextUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next) return '/index.html';
  if (next.startsWith('/')) return next;
  return '/index.html';
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function spawnHearts() {
  for (let i = 0; i < 20; i += 1) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '❤️';
    heart.style.left = Math.random() * window.innerWidth + 'px';
    heart.style.top = '450px';
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 2000);
  }
}

if (usernameInput) {
  usernameInput.addEventListener('keyup', () => {
    const pos = usernameInput.selectionStart || 0;
    const move = Math.min(pos * 2, 20);
    if (eyeL) eyeL.setAttribute('cx', String(80 + move));
    if (eyeR) eyeR.setAttribute('cx', String(120 + move));
  });
}

if (passwordInput) {
  passwordInput.addEventListener('focus', () => {
    if (handL) handL.style.display = 'block';
    if (handR) handR.style.display = 'block';
    if (eyeL) eyeL.style.visibility = 'hidden';
    if (eyeR) eyeR.style.visibility = 'hidden';
  });
  passwordInput.addEventListener('blur', () => {
    if (handL) handL.style.display = 'none';
    if (handR) handR.style.display = 'none';
    if (eyeL) eyeL.style.visibility = 'visible';
    if (eyeR) eyeR.style.visibility = 'visible';
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Đang kiểm tra...';
    const userValue = (usernameInput?.value || '').trim();
    const passValue = passwordInput?.value || '';
    try {
      const digest = await sha256(passValue);
      if (userValue === USERNAME && digest === HASH) {
        localStorage.setItem('app_auth', '1');
        spawnHearts();
        setTimeout(() => window.location.replace(getNextUrl()), 300);
        return;
      }
    } catch (_err) {}
    attempts += 1;
    statusEl.textContent = 'Sai thông tin. Thử lại nhé.';
    if (kitty) {
      kitty.classList.add('angry');
      setTimeout(() => kitty.classList.remove('angry'), 300);
    }
    if (attempts >= 5) {
      if (tear1) tear1.style.display = 'block';
      if (tear2) tear2.style.display = 'block';
    }
    passwordInput?.focus();
  });
}
