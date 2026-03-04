(function initPremiumBlogGate() {
  const BLOG_GATE_KEY = "periodBlogGateAt";
  const PREMIUM_UNLOCK_KEY = "periodBlogPremiumUnlockAt";
  const BLOG_GATE_MAX_MS = 5 * 60 * 1000;
  const PREMIUM_UNLOCK_MS = 12 * 60 * 60 * 1000;

  const PREMIUM_CODE = "chipiu";

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

  function requestPremiumCodeViaModal() {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.position = "fixed";
      backdrop.style.inset = "0";
      backdrop.style.background = "rgba(21, 9, 17, 0.45)";
      backdrop.style.display = "grid";
      backdrop.style.placeItems = "center";
      backdrop.style.zIndex = "9999";

      const panel = document.createElement("div");
      panel.style.width = "min(92vw, 340px)";
      panel.style.background = "#fff";
      panel.style.borderRadius = "16px";
      panel.style.padding = "14px";
      panel.style.border = "1px solid rgba(235, 134, 186, 0.45)";
      panel.style.boxShadow = "0 18px 34px rgba(0, 0, 0, 0.22)";
      panel.innerHTML =
        '<p style="margin:0 0 8px;font:700 18px Quicksand,sans-serif;color:#7f4563;">Premium blog</p>' +
        '<p style="margin:0 0 10px;font:700 13px Quicksand,sans-serif;color:#8f5b75;">Nhập mã truy cập để tiếp tục.</p>';

      const input = document.createElement("input");
      input.type = "password";
      input.placeholder = "Nhập mã Premium";
      input.autocomplete = "off";
      input.style.width = "100%";
      input.style.minHeight = "42px";
      input.style.border = "1px solid rgba(236, 127, 181, 0.34)";
      input.style.borderRadius = "12px";
      input.style.padding = "8px 10px";
      input.style.font = '700 15px "Quicksand", sans-serif';
      input.style.color = "#5d3551";
      input.style.marginBottom = "10px";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Hủy";
      cancelBtn.style.border = "1px solid rgba(236, 127, 181, 0.34)";
      cancelBtn.style.background = "#fff";
      cancelBtn.style.color = "#ff5aa7";
      cancelBtn.style.borderRadius = "10px";
      cancelBtn.style.minHeight = "36px";
      cancelBtn.style.padding = "6px 10px";
      cancelBtn.style.font = '700 13px "Quicksand", sans-serif';

      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.textContent = "Mở blog";
      okBtn.style.border = "0";
      okBtn.style.background = "linear-gradient(135deg, #ff76b6, #ff9fcb)";
      okBtn.style.color = "#fff";
      okBtn.style.borderRadius = "10px";
      okBtn.style.minHeight = "36px";
      okBtn.style.padding = "6px 10px";
      okBtn.style.font = '700 13px "Quicksand", sans-serif';

      actions.append(cancelBtn, okBtn);
      panel.append(input, actions);
      backdrop.append(panel);
      document.body.append(backdrop);

      const close = (value) => {
        document.removeEventListener("keydown", onKeydown);
        backdrop.remove();
        resolve(value);
      };

      const onKeydown = (event) => {
        if (event.key === "Escape") close(null);
        if (event.key === "Enter") close(input.value.trim());
      };

      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) close(null);
      });
      cancelBtn.addEventListener("click", () => close(null));
      okBtn.addEventListener("click", () => close(input.value.trim()));
      document.addEventListener("keydown", onKeydown);
      setTimeout(() => input.focus(), 0);
    });
  }

  async function requestPremiumUnlock() {
    if (hasValidPremiumUnlock()) return true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const trimmed = await requestPremiumCodeViaModal();
      if (trimmed == null) return false;
      if (!trimmed) continue;
      if (trimmed === PREMIUM_CODE) {
        sessionStorage.setItem(PREMIUM_UNLOCK_KEY, String(Date.now()));
        return true;
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
