(function initUserContext() {
  const STORAGE_KEY = "hdha.user.id.v1";

  function createId() {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `u-${seed}`.toLowerCase();
  }

  function readUserId() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const clean = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
      if (clean) return clean;
      const created = createId();
      localStorage.setItem(STORAGE_KEY, created);
      return created;
    } catch (_err) {
      return "default";
    }
  }

  const userId = readUserId();
  window.HDHA_USER_ID = userId;

  if (window.__hdhaFetchPatched) return;
  window.__hdhaFetchPatched = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    try {
      const requestUrl = typeof input === "string" ? input : String(input?.url || "");
      if (!requestUrl.startsWith("/api/")) {
        return nativeFetch(input, init);
      }
      const nextInit = { ...(init || {}) };
      const headers = new Headers(nextInit.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("x-user-id")) {
        headers.set("x-user-id", userId);
      }
      nextInit.headers = headers;
      return nativeFetch(input, nextInit);
    } catch (_err) {
      return nativeFetch(input, init);
    }
  };
})();
