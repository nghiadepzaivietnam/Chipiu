(() => {
  const path = window.location.pathname;
  if (path.endsWith('/login.html') || path.endsWith('/offline.html') || path.endsWith('/splash.html')) return;

  const ok = localStorage.getItem('app_auth') === '1';
  if (ok) return;

  const next = encodeURIComponent(path + window.location.search + window.location.hash);
  window.location.replace(`/splash.html?next=${next}`);
})();
