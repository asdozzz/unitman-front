import { defineStore } from "pinia";
import i18n from "@/bootstrap/translator";
import NotificationService from "@/modules/notification/services/NotificationService";
import {
  pohozheNaNastroiku,
  type NastroikaUvedomleniya,
} from "@/modules/notification/model/Uvedomlenie";

type StorNastroekState = {
  items: NastroikaUvedomleniya[];
  loading: boolean;
  error: string;
  savingType: string | null;
};

export const useStorNastroekUvedomleniy = defineStore(
  "StorNastroekUvedomleniy",
  {
    state: (): StorNastroekState => ({
      items: [],
      loading: false,
      error: "",
      savingType: null,
    }),

    actions: {
      async zagruzit(): Promise<void> {
        this.loading = true;
        const response = await NotificationService.preferences();

        if (
          response.status === "success" &&
          Array.isArray(response.data) &&
          response.data.every(pohozheNaNastroiku)
        ) {
          this.items = response.data;
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

      async izmenit(type: string, enabled: boolean): Promise<void> {
        const item = this.items.find((nastroika) => nastroika.type === type);

        if (!item || !item.canDisable) {
          return;
        }

        this.savingType = type;
        const previous = item.enabled;
        item.enabled = enabled;

        const response = await NotificationService.updatePreference(
          type,
          enabled,
        );

        if (response.status !== "success") {
          item.enabled = previous;
          this.error =
            response.status === "fail" ? response.data.message : response.message;
        } else {
          this.error = "";
        }

        this.savingType = null;
      },
    },
  },
);
