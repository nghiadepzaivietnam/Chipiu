(function initPremiumBlogGate() {
  const BLOG_GATE_KEY = "periodBlogGateAt";
  const PREMIUM_UNLOCK_KEY = "periodBlogPremiumUnlockAt";
  const BLOG_GATE_MAX_MS = 5 * 60 * 1000;
  const PREMIUM_UNLOCK_MS = 12 * 60 * 60 * 1000;

  // SHA-256 hash for the premium passcode.
  // Update this hash if you want to change the premium code.
  const PREMIUM_CODE_HASH = "0d1fe9e84fd88bf3798f050af9e2c2e0c1debacbdbc20242b4d6304da8f827bb";

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

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function requestPremiumUnlock() {
    if (hasValidPremiumUnlock()) return true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = window.prompt("Premium blog: nhập mã truy cập");
      if (code == null) return false;
      const trimmed = code.trim();
      if (!trimmed) continue;
      try {
        const digest = await sha256Hex(trimmed);
        if (digest === PREMIUM_CODE_HASH) {
          sessionStorage.setItem(PREMIUM_UNLOCK_KEY, String(Date.now()));
          return true;
        }
      } catch (_err) {
        // Fallback when Web Crypto is unavailable.
        if (trimmed === "chipiu-0803") {
          sessionStorage.setItem(PREMIUM_UNLOCK_KEY, String(Date.now()));
          return true;
        }
      }
      window.alert("Sai mã Premium. Thử lại nhé.");
    }
    return false;
  }

  async function runGate() {
    if (!hasValidBlogEntryGate()) {
      window.location.replace("/period.html");
      return;
    }
    const ok = await requestPremiumUnlock();
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
