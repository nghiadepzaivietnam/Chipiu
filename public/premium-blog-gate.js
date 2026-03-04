(function initPremiumBlogGate() {
  const BLOG_GATE_KEY = "periodBlogGateAt";
  const PREMIUM_UNLOCK_KEY = "periodBlogPremiumUnlockAt";
  const BLOG_GATE_MAX_MS = 5 * 60 * 1000;
  const PREMIUM_UNLOCK_MS = 12 * 60 * 60 * 1000;

  const PREMIUM_CODE = "chipiu-0803";

  function hasValidBlogEntryGate() {
    const openedAtRaw = sessionStorage.getItem(BLOG_GATE_KEY);
    const openedAt = Number(openedAtRaw || "0");
    return Boolean(openedAt && !Number.isNaN(openedAt) && Date.now() - openedAt <= BLOG_GATE_MAX_MS);
  }

  function hasValidPremiumUnlock() {
    const unlockedAtRaw = sessionStorage.getItem(PREMIUM_UNLOCK_KEY);
    const unlockedAt = Number(unlockedAtRaw || "0");
    return Boolean(unlockedAt && !Number.isNaN(unlockedAt) && Date.now() - unlockedAt <= PREMIUM_UNLOCK_MS);
  }

  function requestPremiumUnlock() {
    if (hasValidPremiumUnlock()) return true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = window.prompt("Premium blog: nhập mã truy cập");
      if (code == null) return false;
      const trimmed = code.trim();
      if (!trimmed) continue;
      if (trimmed === PREMIUM_CODE) {
        sessionStorage.setItem(PREMIUM_UNLOCK_KEY, String(Date.now()));
        return true;
      }
      window.alert("Sai mã Premium. Thử lại nhé.");
    }
    return false;
  }

  function runGate() {
    if (!hasValidBlogEntryGate()) {
      window.location.replace("/period.html");
      return;
    }
    const ok = requestPremiumUnlock();
    if (!ok) {
      window.location.replace("/period.html");
      return;
    }
    // Refresh gate when user navigates between private blog pages.
    document.querySelectorAll(".blog-entry").forEach((entry) => {
      entry.addEventListener("click", () => {
        sessionStorage.setItem(BLOG_GATE_KEY, String(Date.now()));
      });
    });
  }

  runGate();
})();
