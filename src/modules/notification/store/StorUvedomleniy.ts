import { defineStore } from "pinia";
import i18n from "@/bootstrap/translator";
import NotificationService from "@/modules/notification/services/NotificationService";
import {
  pohozheNaSpisok,
  type Uvedomlenie,
} from "@/modules/notification/model/Uvedomlenie";

/** Период опроса счётчика непрочитанных. */
const PERIOD_OPROSA_MS = 30_000;

type StorUvedomleniyState = {
  items: Uvedomlenie[];
  unreadCount: number;
  loading: boolean;
  loaded: boolean;
  error: string;
  pause: boolean;
};

let tajmer: ReturnType<typeof setTimeout> | null = null;
let pokolenie = 0;

function ochistitTajmer(): void {
  if (tajmer !== null) {
    clearTimeout(tajmer);
    tajmer = null;
  }
}

export const useStorUvedomleniy = defineStore("StorUvedomleniy", {
  state: (): StorUvedomleniyState => ({
    items: [],
    unreadCount: 0,
    loading: false,
    loaded: false,
    error: "",
    pause: false,
  }),

  getters: {
    estNeprochitannie: (state): boolean => state.unreadCount > 0,
    neprochitannie: (state): number => state.unreadCount,
    poId: (state) => (id: string): Uvedomlenie | null =>
      state.items.find((item) => item.id === id) ?? null,
  },

  actions: {
    async zagruzit(onlyActionable = false): Promise<void> {
      this.loading = true;

      const response = await NotificationService.list({
        limit: 50,
        onlyActionable,
      });

      if (response.status === "success" && pohozheNaSpisok(response.data)) {
        this.items = response.data.items;
        this.unreadCount = response.data.unreadCount;
        this.loaded = true;
        this.error = "";
      } else if (response.status === "success") {
        this.error = i18n.global.t("notifications.errors.invalid_response");
      } else if (response.status === "fail") {
        this.error = response.data.message;
      } else {
        this.error = response.message;
      }

      this.loading = false;
    },

    async obnovitKolichestvo(): Promise<void> {
      const response = await NotificationService.unreadCount();

      if (response.status === "success" && typeof response.data.count === "number") {
        this.unreadCount = response.data.count;
      }
    },

    async otmetitProchitannim(id: string): Promise<void> {
      const item = this.items.find((uvedomlenie) => uvedomlenie.id === id);

      if (!item || !item.requiresRead || item.read) {
        return;
      }

      const response = await NotificationService.markRead(id);

      if (response.status === "success") {
        item.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    },

    async otmetitVseProchitannimi(): Promise<void> {
      const response = await NotificationService.markAllRead();

      if (response.status === "success") {
        this.items.forEach((item) => {
          if (item.requiresRead) {
            item.read = true;
          }
        });
        this.unreadCount = 0;
      }
    },

    zapustitOpros(): void {
      this.pause = false;
      ochistitTajmer();
      const nomer = ++pokolenie;

      const vypolnit = async (): Promise<void> => {
        if (nomer !== pokolenie) {
          return;
        }

        await this.obnovitKolichestvo();

        if (nomer !== pokolenie) {
          return;
        }

        tajmer = setTimeout(() => {
          void this.zapustitOpros();
        }, PERIOD_OPROSA_MS);
      };

      void vypolnit();
    },

    ostanovitOpros(): void {
      this.pause = true;
      pokolenie += 1;
      ochistitTajmer();
    },

    vozobnovitOpros(): void {
      this.pause = false;
      this.zapustitOpros();
    },
  },
});
