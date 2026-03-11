const CACHE_NAME = "hai-anh-pwa-v1";
const CACHE_NAME = "hai-anh-pwa-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/login.js",
  "/auth-guard.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/ai-widget.css",
  "/ai-widget.js",
  "/mood-map-summary.js",
  "/user-context.js",
  "/hai-anh.jpg",
  "/romantic-letter.html",
  "/romantic-letter.css",
  "/romantic-letter.js",
  "/create.html",
  "/journal.html",
  "/counter.html",
  "/mood-map.html",
  "/period.html",
  "/weather-dual.html",
  "/flight-suwon-noibai.html",
  "/hanh-trinh-toi-2-dua.html",
  "/owner-data.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isMedia =
    url.pathname.startsWith("/uploads/") ||
    request.destination === "video" ||
    request.headers.has("range");
  if (isMedia) {
    event.respondWith(fetch(request));
    return;
  }

  const isNavigate = request.mode === "navigate";
  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
    )
  );
});
