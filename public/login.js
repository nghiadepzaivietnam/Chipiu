const form = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const statusEl = document.getElementById('loginStatus');

const HASH = '616e7fe36c4fd47aaf136464690b71a12f073293af7c9a7f5ff15cb9192324e0';

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

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Đang kiểm tra...';
    const value = passwordInput.value || '';
    try {
      const digest = await sha256(value);
      if (digest === HASH) {
        localStorage.setItem('app_auth', '1');
        window.location.replace(getNextUrl());
        return;
      }
    } catch (_err) {}
    statusEl.textContent = 'Sai mật khẩu. Thử lại nhé.';
    passwordInput.focus();
  });
}
