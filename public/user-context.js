(function initUserContext() {
  const STORAGE_KEY = "hdha.user.id.v1";
  const SHARED_USER_ID = "hdha-shared";

  function readUserId() {
    try {
      localStorage.setItem(STORAGE_KEY, SHARED_USER_ID);
      return SHARED_USER_ID;
    } catch (_err) {
      return SHARED_USER_ID;
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
