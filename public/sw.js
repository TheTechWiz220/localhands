/* LocalHands service worker — cache + web push */
const CACHE = "localhands-v10";
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon",
  "/privacy",
  "/jobs",
  "/icons/notification-192.png",
  "/icons/badge-96.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Network-first for icons so push always gets fresh static PNGs
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {
    title: "LocalHands",
    body: "You have an update",
    url: "/jobs",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {
    try {
      data.body = event.data ? event.data.text() : data.body;
    } catch (_) {}
  }

  // LEFT circle = static PNG of real logo (Android push cannot reliably load dynamic /icon).
  // RIGHT green hand is separate (system/app chrome) — do not touch.
  const origin = self.location.origin;
  event.waitUntil(
    self.registration.showNotification(data.title || "LocalHands", {
      body: data.body || "",
      icon: origin + "/icons/notification-192.png",
      badge: origin + "/icons/badge-96.png",
      data: { url: data.url || "/jobs" },
      tag: data.tag || "localhands",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/jobs";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
