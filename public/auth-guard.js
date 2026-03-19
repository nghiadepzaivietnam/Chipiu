(() => {
  const path = window.location.pathname;
  if (path.endsWith('/login.html') || path.endsWith('/offline.html') || path.endsWith('/splash.html') || path.endsWith('/intro.html')) return;

  const ok = localStorage.getItem('app_auth') === '1';
  if (!ok) {
    const next = encodeURIComponent(path + window.location.search + window.location.hash);
    window.location.replace(`/login.html?next=${next}`);
    return;
  }

  const introSeen = localStorage.getItem('intro_seen') === 'true';
  if (!introSeen) {
    const next = encodeURIComponent(path + window.location.search + window.location.hash);
    window.location.replace(`/intro.html?next=${next}`);
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
      background:
        radial-gradient(circle at 18% 18%, rgba(255, 206, 222, 0.38), transparent 45%),
        radial-gradient(circle at 82% 12%, rgba(255, 220, 235, 0.45), transparent 45%),
        radial-gradient(circle at 50% 88%, rgba(255, 195, 219, 0.35), transparent 50%),
        #fff6f2;
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
      text-shadow: 0 10px 22px rgba(255, 120, 170, 0.22);
    }
    .hdha-splash-mark::after {
      content: "♡";
      font-size: 0.5em;
      margin-left: 8px;
      color: #ff8bbf;
      vertical-align: top;
    }
    .hdha-splash-hearts {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .hdha-splash-heart {
      position: absolute;
      bottom: -10%;
      width: 14px;
      height: 14px;
      background: linear-gradient(140deg, #ff94c6, #ffc6dd);
      transform: rotate(45deg);
      border-radius: 4px 4px 0 0;
      opacity: 0;
      filter: drop-shadow(0 6px 10px rgba(255, 140, 188, 0.25));
      animation: hdhaFloat 5s linear infinite;
    }
    .hdha-splash-heart::before,
    .hdha-splash-heart::after {
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: inherit;
    }
    .hdha-splash-heart::before { left: -7px; top: 0; }
    .hdha-splash-heart::after { top: -7px; left: 0; }

    @keyframes hdhaFloat {
      0% { transform: translateY(0) rotate(45deg) scale(0.85); opacity: 0; }
      10% { opacity: 0.9; }
      100% { transform: translateY(-120vh) rotate(45deg) scale(1.1); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hdha-splash {
        transition: none;
      }
      .hdha-splash-heart {
        animation: none;
        opacity: 0.6;
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
    splash.innerHTML = `
      <div class="hdha-splash-hearts">
        <span class="hdha-splash-heart" style="left: 14%; animation-delay: 0.2s;"></span>
        <span class="hdha-splash-heart" style="left: 28%; animation-delay: 1s; animation-duration: 5.6s;"></span>
        <span class="hdha-splash-heart" style="left: 44%; animation-delay: 0.6s; animation-duration: 5.2s;"></span>
        <span class="hdha-splash-heart" style="left: 62%; animation-delay: 1.4s; animation-duration: 5.8s;"></span>
        <span class="hdha-splash-heart" style="left: 76%; animation-delay: 0.4s; animation-duration: 5.4s;"></span>
      </div>
      <div class="hdha-splash-mark">HA</div>
    `;
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
