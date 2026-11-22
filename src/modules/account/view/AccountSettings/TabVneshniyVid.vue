<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhSegmentedControl,
} from "@/components/ui";
import type { GhSegmentedOption } from "@/components/ui";
import { useAuthStore } from "@/modules/account/store/auth";
import AccountService from "@/modules/account/services/AccountService";
import { loadAppSettings, saveAppSettings } from "@/utils/appSettings";

type RezhimTemi = "light" | "dark" | "system";

const { t } = useI18n();
const $q = useQuasar();

const authStore = useAuthStore();
const { getLocale } = storeToRefs(authStore);

const nastroiki = loadAppSettings();

/** Текущий режим темы. «Системная» не персистится — сохраняется вычисленный результат. */
const rezhimTemi = ref<RezhimTemi>(nastroiki.darkMode ? "dark" : "light");

/** Язык применяется оптимистично; значение берётся из auth-стора. */
const rezhimYazika = ref<string>(getLocale.value);

const sohranenieYazika = ref<boolean>(false);
const oshibka = ref<string | null>(null);

// Язык мог измениться из хедера — отражаем актуальное значение в переключателе.
watch(getLocale, (znachenie: string) => {
  rezhimYazika.value = znachenie;
});

const opciiTemi = computed<GhSegmentedOption[]>(() => [
  { value: "light", label: t("settings.appearance.theme_light"), icon: "sun" },
  { value: "dark", label: t("settings.appearance.theme_dark"), icon: "moon" },
  {
    value: "system",
    label: t("settings.appearance.theme_system"),
    icon: "device-desktop",
  },
]);

const opciiYazika = computed<GhSegmentedOption[]>(() => [
  { value: "ru", label: t("settings.appearance.language_ru") },
  { value: "en", label: t("settings.appearance.language_en") },
]);

/** Системная тема разрешается через prefers-color-scheme. */
function razreshitTemnotu(rezhim: RezhimTemi): boolean {
  if (rezhim === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return rezhim === "dark";
}

/** Оптимистичное применение темы с откатом при ошибке записи настроек. */
function primenitTemu(znachenie: string): void {
  const noviy = znachenie as RezhimTemi;

  if (noviy === rezhimTemi.value) {
    return;
  }

  const predidushiy = rezhimTemi.value;
  const temno = razreshitTemnotu(noviy);

  rezhimTemi.value = noviy;
  $q.dark.set(temno);

  try {
    saveAppSettings({ darkMode: temno });
    oshibka.value = null;
  } catch {
    rezhimTemi.value = predidushiy;
    $q.dark.set(predidushiy === "dark");
    oshibka.value = t("settings.save_error");
  }
}

/** Оптимистичное применение языка с откатом при ошибке сохранения на бэкенде. */
async function primenitYazik(znachenie: string): Promise<void> {
  if (znachenie === rezhimYazika.value || sohranenieYazika.value) {
    return;
  }

  const predidushiy = rezhimYazika.value;

  rezhimYazika.value = znachenie;
  authStore.updateLocale(znachenie as "en" | "ru");

  sohranenieYazika.value = true;

  const otvet = await AccountService.izmenitYazik({ locale: znachenie });

  sohranenieYazika.value = false;

  if (otvet.status === "success") {
    oshibka.value = null;
    return;
  }

  rezhimYazika.value = predidushiy;
  authStore.updateLocale(predidushiy as "en" | "ru");
  oshibka.value = t("settings.save_error");
}
</script>

<template>
  <GhBox>
    <template #header>
      <span>{{ t("settings.appearance.title") }}</span>
    </template>

    <div class="tab-vid__body">
      <GhBanner
        v-if="oshibka"
        variant="danger"
        :title="t('settings.save_error')"
        dismissible
        @dismiss="oshibka = null"
      >
        {{ oshibka }}
      </GhBanner>

      <div class="tab-vid__row">
        <div class="tab-vid__label">{{ t("settings.appearance.theme") }}</div>
        <GhSegmentedControl
          :model-value="rezhimTemi"
          :options="opciiTemi"
          :aria-label="t('settings.appearance.theme')"
          @update:model-value="primenitTemu"
        />
        <p class="tab-vid__caption">
          {{ t("settings.appearance.theme_caption") }}
        </p>
      </div>

      <div class="tab-vid__row">
        <div class="tab-vid__label">{{ t("settings.appearance.language") }}</div>
        <GhSegmentedControl
          :model-value="rezhimYazika"
          :options="opciiYazika"
          :aria-label="t('settings.appearance.language')"
          @update:model-value="primenitYazik"
        />
        <p class="tab-vid__caption">
          {{ t("settings.appearance.language_caption") }}
        </p>
      </div>

      <p class="tab-vid__caption tab-vid__caption--common">
        {{ t("settings.appearance.caption") }}
      </p>
    </div>
  </GhBox>
</template>

<style scoped>
.tab-vid__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tab-vid__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-vid__label {
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.tab-vid__caption {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.tab-vid__caption--common {
  padding-top: 8px;
  border-top: 1px solid var(--borderColor-muted);
}
</style>
