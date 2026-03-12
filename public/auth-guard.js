(() => {
  const path = window.location.pathname;
  if (path.endsWith('/login.html') || path.endsWith('/offline.html') || path.endsWith('/splash.html')) return;

  const ok = localStorage.getItem('app_auth') === '1';
  if (!ok) {
    const next = encodeURIComponent(path + window.location.search + window.location.hash);
    window.location.replace(`/login.html?next=${next}`);
    return;
  }

  if (window.HDHA_DISABLE_HA_SPLASH === true) return;

  const style = document.createElement('style');
  style.textContent = `
    .hdha-splash {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      background: #fff6f2;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 220ms ease;
    }
    .hdha-splash.show {
      opacity: 1;
      pointer-events: auto;
    }
    .hdha-splash-mark {
      font-family: "Baloo 2", "Quicksand", "Space Grotesk", "Segoe UI", sans-serif;
      font-size: clamp(40px, 14vw, 104px);
      font-weight: 700;
      letter-spacing: 0.18em;
      margin-left: 0.18em;
      color: #ff6fb0;
    }
    @media (prefers-reduced-motion: reduce) {
      .hdha-splash {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  let navigating = false;
  let activeSplash = null;

  const ensureSplash = () => {
    if (activeSplash) return activeSplash;
    const splash = document.createElement('div');
    splash.className = 'hdha-splash';
    splash.innerHTML = '<div class="hdha-splash-mark">HA</div>';
    document.body.appendChild(splash);
    activeSplash = splash;
    return splash;
  };

  const showSplash = ({ autoHide } = { autoHide: true }) => {
    const splash = ensureSplash();
    requestAnimationFrame(() => splash.classList.add('show'));
    if (!autoHide) return;
    const holdMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 700 : 1900;
    const hideMs = 300;
    window.setTimeout(() => {
      splash.classList.remove('show');
    }, holdMs);
    window.setTimeout(() => {
      splash.remove();
      activeSplash = null;
    }, holdMs + hideMs + 20);
  };

  showSplash({ autoHide: true });

  document.addEventListener('click', (event) => {
    if (navigating) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.hasAttribute('download')) return;
    const target = link.getAttribute('target');
    if (target && target !== '_self') return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

    event.preventDefault();
    navigating = true;
    showSplash({ autoHide: false });
    const navDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 360 : 560;
    window.setTimeout(() => {
      window.location.href = url.toString();
    }, navDelay);
  }, { capture: true });
})();
