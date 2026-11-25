import { defineStore } from "pinia";
import i18n from "@/bootstrap/translator";
import { useAuthStore } from "@/modules/account/store/auth";
import NotificationService from "@/modules/notification/services/NotificationService";
import {
  podderzhkaPush,
  tekushchayaPodpiska,
  urlBase64ToUint8Array,
  zaregistrirovatServiceWorker,
} from "@/modules/notification/utils/push";

type RazresheniePush = NotificationPermission | "unsupported";

type StorPushState = {
  podderzhka: boolean;
  razreshenie: RazresheniePush;
  podpisan: boolean;
  loading: boolean;
  error: string;
};

export const useStorPushUvedomleniy = defineStore("StorPushUvedomleniy", {
  state: (): StorPushState => ({
    podderzhka: true,
    razreshenie: "default",
    podpisan: false,
    loading: false,
    error: "",
  }),

  getters: {
    mozhnoVklyuchit: (state): boolean =>
      state.podderzhka && state.razreshenie !== "denied",
  },

  actions: {
    async proverit(): Promise<void> {
      if (!podderzhkaPush()) {
        this.podderzhka = false;
        this.razreshenie = "unsupported";
        this.podpisan = false;

        return;
      }

      this.podderzhka = true;
      this.razreshenie = Notification.permission;
      const subscription = await tekushchayaPodpiska();
      this.podpisan = subscription !== null;
    },

    async vklyuchit(): Promise<void> {
      if (!podderzhkaPush()) {
        this.error = i18n.global.t("notifications.push.unsupported");

        return;
      }

      this.loading = true;
      this.error = "";

      try {
        const permission = await Notification.requestPermission();
        this.razreshenie = permission;

        if (permission !== "granted") {
          this.error = i18n.global.t("notifications.push.permission_denied");

          return;
        }

        const registration = await zaregistrirovatServiceWorker();

        if (!registration) {
          this.error = i18n.global.t("notifications.push.registration_failed");

          return;
        }

        const keyResponse = await NotificationService.pushPublicKey();

        if (
          keyResponse.status !== "success" ||
          typeof keyResponse.data.publicKey !== "string" ||
          keyResponse.data.publicKey === ""
        ) {
          this.error = i18n.global.t("notifications.push.key_unavailable");

          return;
        }

        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              keyResponse.data.publicKey,
            ),
          }));

        const json = subscription.toJSON();
        const endpoint = subscription.endpoint;
        const keys = json.keys ?? {};
        const authStore = useAuthStore();

        const response = await NotificationService.subscribePush({
          endpoint,
          keys: {
            p256dh: keys.p256dh ?? "",
            auth: keys.auth ?? "",
          },
          locale: authStore.getLocale,
        });

        if (response.status !== "success") {
          this.error =
            response.status === "fail" ? response.data.message : response.message;

          return;
        }

        this.podpisan = true;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : i18n.global.t("notifications.push.subscribe_failed");
      } finally {
        this.loading = false;
      }
    },

    async vykluchit(): Promise<void> {
      this.loading = true;
      this.error = "";

      try {
        const subscription = await tekushchayaPodpiska();

        if (subscription) {
          await NotificationService.unsubscribePush(subscription.endpoint);
          await subscription.unsubscribe();
        }

        this.podpisan = false;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : i18n.global.t("notifications.push.unsubscribe_failed");
      } finally {
        this.loading = false;
      }
    },
  },
});
