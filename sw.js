/* Smart Start - Service Worker (v3) */
// Bump this when you ship; the page can read it and show it.
const VERSION = "5.0"; // <-- edit manually when you update
const CACHE = `smart-start-${VERSION}`;
const PRECACHE = ["./", "./index.html", "./style.css", "./worker.js"];

// Allow clients to query the current SW version/cache name
self.addEventListener("message", (event) => {
  const data = event.data || {};
  const t = (data.type || "").toString();
  if (t === "GET_VERSION" || t === "getVersion") {
    event.source &&
      event.source.postMessage({
        type: "version",
        version: VERSION,
        cache: CACHE,
      });
  } else if (t === "SKIP_WAITING" || t === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/favicon.ico",
        // add any local fonts/images if you have them
      ])
    )
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("smart-start-") && name !== CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
      // Broadcast version to all controlled clients
      const all = await self.clients.matchAll({ type: "window" });
      for (const client of all) {
        client.postMessage({
          type: "version",
          version: VERSION,
          cache: CACHE,
          event: "activate",
        });
      }
    })()
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1) Skip non-GET and the ML endpoint completely
  if (event.request.method !== "GET" || url.pathname === "/classify") {
    return; // let it go to the network
  }

  // 2) Cache-first for static assets
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(event.request);
      if (hit) return hit;

      const res = await fetch(event.request);
      // Only cache successful, basic (same-origin) responses
      if (res.ok && res.type === "basic") {
        cache.put(event.request, res.clone());
      }
      return res;
    })()
  );
});
