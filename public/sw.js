// App-Shell-Cache: nur unveränderliche Build-Dateien (/_next/static) und Icons.
// Seiten und Daten kommen immer frisch vom Server (kein Offline-Lernen in Phase 1).
const CACHE = "levelup10-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Erinnerung (lib/data/reminders.ts): Payload { title, body, badge }. iOS verlangt, dass jeder Push sichtbar angezeigt wird.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const tasks = [
    self.registration.showNotification(data.title || "LevelUp10", {
      body: data.body || "",
      icon: "/icons/192.png",
      tag: "reminder",
      data: { url: "/" },
    }),
  ];
  if (typeof data.badge === "number" && self.navigator.setAppBadge) {
    tasks.push((data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge()).catch(() => {}));
  }
  event.waitUntil(Promise.all(tasks));
});

// Tippen auf die Erinnerung öffnet die App (oder holt das offene Fenster nach vorn).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/_next/static/") && !url.pathname.startsWith("/icons/")) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    }),
  );
});
