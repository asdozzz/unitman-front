/** Тело подписки браузера на Web Push. */
export type PushPodpiskaPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  locale: string;
};
