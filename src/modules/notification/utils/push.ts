/** Поддерживает ли браузер Web Push и service worker. */
export function podderzhkaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** VAPID public key из base64url в Uint8Array для PushManager.subscribe. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

/** Регистрирует service worker и дожидается его готовности. */
export async function zaregistrirovatServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!podderzhkaPush()) {
    return null;
  }

  try {
    await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });

    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Текущая подписка браузера, если она есть. */
export async function tekushchayaPodpiska(): Promise<PushSubscription | null> {
  if (!podderzhkaPush()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}
