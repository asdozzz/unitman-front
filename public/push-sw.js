/* Service worker для браузерных Web Push уведомлений Unitman. */

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "Unitman",
      body: event.data ? event.data.text() : "",
    };
  }

  const data = payload.data || {};
  const title = payload.title || "Unitman";
  const notificationId = data.notificationId;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: notificationId || undefined,
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const notificationId = data.notificationId;
  const url =
    data.url ||
    (notificationId
      ? `/notifications?open=${encodeURIComponent(notificationId)}`
      : "/notifications");

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();

          if (notificationId) {
            client.postMessage({
              type: "open-notification",
              id: notificationId,
            });
          }

          return;
        }
      }

      await self.clients.openWindow(url);
    })(),
  );
});
