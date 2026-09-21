// Ax.Q4 service worker — network-first for the app, cache-first for assets.
// Bump CACHE whenever this file changes; activate() purges every older cache.
const CACHE = "axq4block-v2";
const ASSETS = ["./", "./index.html", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isDoc =
    e.request.mode === "navigate" ||
    (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));

  // The app itself: always try the network so a new upload lands immediately.
  if (isDoc) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((h) => h || caches.match("./")))
    );
    return;
  }

  // Icons and fonts: cache-first, they don't change.
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const cacheable =
          url.origin === location.origin ||
          url.hostname === "fonts.googleapis.com" ||
          url.hostname === "fonts.gstatic.com";
        if (cacheable && res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
    )
  );
});
