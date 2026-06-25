const CACHE = "currency-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - exchange-rate API calls: network-first (always try for fresh rates, the app
//   falls back to its own localStorage cache if offline)
// - everything else (the app shell): cache-first
self.addEventListener("fetch", e => {
  const url = e.request.url;
  const isRates =
    url.includes("currency-api") ||
    url.includes("er-api.com") ||
    url.includes("currency-api.pages.dev");

  if (isRates) {
    e.respondWith(fetch(e.request).catch(() => new Response("{}", { headers: { "Content-Type": "application/json" } })));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      // cache same-origin GETs as we see them
      if (e.request.method === "GET" && resp.ok && new URL(url).origin === self.location.origin) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match("./index.html")))
  );
});
