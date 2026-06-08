/*
 * Bloom Garden Ultimate — service worker (dependency-free).
 *
 * Makes the game installable and playable offline after the first visit:
 *  • navigations use network-first (so new deploys land), falling back to the
 *    cached app shell when offline;
 *  • hashed assets (JS/CSS/icons) use cache-first — they are immutable, so once
 *    cached they load instantly and work without a connection.
 *
 * Cross-origin requests (e.g. Google Fonts) bypass the worker entirely.
 */
const VERSION = "bloom-garden-v1";
const BASE = new URL("./", self.location).pathname; // e.g. /JAOG1V1-BloomGardenUltimate/
const SHELL = [BASE, BASE + "favicon.svg", BASE + "site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle CDNs

  // Navigations: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match(BASE)))
    );
    return;
  }

  // Static assets: cache-first, then fill the cache on a miss.
  event.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => { cachePut(req, res.clone()); return res; })
    )
  );
});

function cachePut(req, res) {
  if (!res || res.status !== 200 || res.type === "opaque") return;
  caches.open(VERSION).then((cache) => cache.put(req, res)).catch(() => {});
}
