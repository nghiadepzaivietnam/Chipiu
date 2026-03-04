(function initPremiumBlogGate() {
  const AUTH_KEY = "periodBlogAuthAt";
  const AUTH_TTL_MS = 15 * 60 * 1000;

  function hasValidAuth() {
    const authAtRaw = sessionStorage.getItem(AUTH_KEY);
    const authAt = Number(authAtRaw || "0");
    return Boolean(authAt && !Number.isNaN(authAt) && Date.now() - authAt <= AUTH_TTL_MS);
  }

  function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/period-blog-login.html?next=${encodeURIComponent(next)}`);
  }

  function runGate() {
    if (!hasValidAuth()) {
      redirectToLogin();
      return;
    }

    document.querySelectorAll(".blog-entry").forEach((entry) => {
      entry.addEventListener("click", () => {
        sessionStorage.setItem(AUTH_KEY, String(Date.now()));
      });
    });
  }

  runGate();
})();

