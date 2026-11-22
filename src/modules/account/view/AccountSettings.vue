<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhPageHeader,
  GhSkeleton,
  GhUnderlineNav,
} from "@/components/ui";
import type { GhNavItem } from "@/components/ui";
import { storNastroekPolzovatelya } from "@/modules/account/store/StorNastroekPolzovatelya";
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import TabProfil from "@/modules/account/view/AccountSettings/TabProfil.vue";
import TabBezopasnost from "@/modules/account/view/AccountSettings/TabBezopasnost.vue";
import TabVneshniyVid from "@/modules/account/view/AccountSettings/TabVneshniyVid.vue";
import SpisokLichnihTokenov from "@/modules/account/view/AccountSettings/SpisokLichnihTokenov.vue";
import SpisokRekvizitovOpenCode from "@/modules/account/view/AccountSettings/SpisokRekvizitovOpenCode.vue";

/** Допустимые значения query-параметра `?tab=`. */
const TABI = ["profile", "security", "tokens", "opencode", "appearance"] as const;

type TabId = (typeof TABI)[number];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const nastroikiStore = storNastroekPolzovatelya();
const formaTokena = useStorFormiLichnogoTokena();
const formaOpenCode = useFormaRekvizitovOpenCodeStore();

/** Активный таб; источник правды — query `?tab=`. */
const aktivniyTab = ref<TabId>(normalizovatTab(route.query.tab));

/** Исходное значение ника: с ним сравнивается форма для dirty-трекинга. */
const bazoviyNickname = ref<string>("");

const zagruzkaNastroek = ref<boolean>(true);
const oshibkaZagruzkiNastroek = ref<string | null>(null);

/** Диалог подтверждения ухода с несохранёнными правками. */
const dialogUhoda = ref<boolean>(false);
const deystviePoslePodtverzhdeniya = ref<(() => void) | null>(null);

/** Флаг разового пропуска guard после подтверждённого ухода. */
let razreshenUhod = false;

const taby = computed<GhNavItem[]>(() => [
  { name: "profile", label: t("settings.tabs.profile"), icon: "person" },
  { name: "security", label: t("settings.tabs.security"), icon: "shield" },
  { name: "tokens", label: t("settings.tabs.tokens"), icon: "key" },
  { name: "opencode", label: t("settings.tabs.opencode"), icon: "cpu" },
  { name: "appearance", label: t("settings.tabs.appearance"), icon: "paintbrush" },
]);

/** Настройки нужны только профилю и безопасности — остальные табы грузят свои данные. */
const nuzhnyNastroiki = computed<boolean>(
  () => aktivniyTab.value === "profile" || aktivniyTab.value === "security",
);

/** Есть ли хотя бы одна несохранённая правка в любой форме. */
const estNesohranennie = computed<boolean>(() => {
  const profil =
    nastroikiStore.formNickname.newNickname.trim() !== bazoviyNickname.value;

  const parol = nastroikiStore.formPassword.newPassword.trim() !== "";

  const token =
    formaTokena.otkryta &&
    (formaTokena.repoId !== "" ||
      formaTokena.nazvanie.trim() !== "" ||
      formaTokena.token.trim() !== "");

  const opencode = formaOpenCode.redaktiruemiId !== null;

  return profil || parol || token || opencode;
});

/** Приводит произвольное query-значение к допустимому идентификатору таба. */
function normalizovatTab(znachenie: unknown): TabId {
  const syroe = Array.isArray(znachenie) ? znachenie[0] : znachenie;

  if (typeof syroe === "string" && (TABI as readonly string[]).includes(syroe)) {
    return syroe as TabId;
  }

  return "profile";
}

/** Отражает активный таб в query без добавления записи в историю. */
function primenitTab(tab: TabId): void {
  aktivniyTab.value = tab;

  if (route.query.tab === tab) {
    return;
  }

  void router.replace({ query: { ...route.query, tab } });
}

/** Переключение таба с защитой от потери несохранённых правок. */
function vybratTab(znachenie: string): void {
  const sleduyushiy = normalizovatTab(znachenie);

  if (sleduyushiy === aktivniyTab.value) {
    return;
  }

  if (estNesohranennie.value) {
    poprositPodtverzhdenie(() => primenitTab(sleduyushiy));
    return;
  }

  primenitTab(sleduyushiy);
}

/** Сбрасывает все формы к исходным значениям (используется при подтверждении ухода). */
function sbrositFormi(): void {
  nastroikiStore.formNickname.newNickname = bazoviyNickname.value;
  nastroikiStore.formPassword.newPassword = "";
  nastroikiStore.oshibkaOtBackenda = null;
  nastroikiStore.oshibkaOtBackendaNick = null;
  formaTokena.zakryt();
  formaOpenCode.zakrit();
}

function poprositPodtverzhdenie(deystvie: () => void): void {
  deystviePoslePodtverzhdeniya.value = deystvie;
  dialogUhoda.value = true;
}

function otmenitUhod(): void {
  dialogUhoda.value = false;
  deystviePoslePodtverzhdeniya.value = null;
}

/** Подтверждённый уход: сбрасываем формы и выполняем отложенное действие. */
function podtverditUhod(): void {
  const deystvie = deystviePoslePodtverzhdeniya.value;

  dialogUhoda.value = false;
  deystviePoslePodtverzhdeniya.value = null;

  sbrositFormi();
  deystvie?.();
}

/** Загружает профиль (ник) и запоминает исходное значение для dirty-трекинга. */
async function zagruzitNastroiki(): Promise<void> {
  zagruzkaNastroek.value = true;
  oshibkaZagruzkiNastroek.value = null;

  const otvet = await nastroikiStore.poluchitNastroiki();

  if (otvet?.status === "success") {
    bazoviyNickname.value = nastroikiStore.formNickname.newNickname.trim();
  } else {
    oshibkaZagruzkiNastroek.value =
      nastroikiStore.oshibkaOtBackenda ?? t("settings.load_error");
  }

  zagruzkaNastroek.value = false;
}

function obnovitBazoviyNickname(nickname: string): void {
  bazoviyNickname.value = nickname.trim();
}

/** Кнопка «Повторить» в баннере ошибки загрузки. */
function povtoritZagruzku(): void {
  void zagruzitNastroiki();
}

/** Guard на уход со страницы настроек. */
onBeforeRouteLeave((to) => {
  if (razreshenUhod || !estNesohranennie.value) {
    razreshenUhod = false;
    return true;
  }

  poprositPodtverzhdenie(() => {
    razreshenUhod = true;
    void router.push(to.fullPath);
  });

  return false;
});

/** Браузерный запрос подтверждения при закрытии вкладки. */
function predupreditObUkhode(event: BeforeUnloadEvent): void {
  if (!estNesohranennie.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

/** Синхронизация активного таба при переходах Back/Forward и прямом заходе. */
watch(
  () => route.query.tab,
  (znachenie: unknown) => {
    const normalizovanniy = normalizovatTab(znachenie);

    if (normalizovanniy !== aktivniyTab.value) {
      aktivniyTab.value = normalizovanniy;
    }
  },
);

onMounted(() => {
  void zagruzitNastroiki();
  window.addEventListener("beforeunload", predupreditObUkhode);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", predupreditObUkhode);
});
</script>

<template>
  <div class="account-settings">
    <GhPageHeader
      :title="t('settings.title')"
      :description="t('settings.subtitle')"
    />

    <div class="account-settings__nav">
      <GhUnderlineNav
        :model-value="aktivniyTab"
        :items="taby"
        :aria-label="t('settings.title')"
        @update:model-value="vybratTab"
      />
    </div>

    <GhBanner
      v-if="oshibkaZagruzkiNastroek && nuzhnyNastroiki"
      variant="danger"
      :title="t('settings.load_error')"
      class="account-settings__gap"
    >
      {{ oshibkaZagruzkiNastroek }}
      <template #actions>
        <GhButton
          variant="default"
          icon="sync"
          :label="t('settings.retry')"
          :loading="zagruzkaNastroek"
          @click="povtoritZagruzku"
        />
      </template>
    </GhBanner>

    <div
      v-if="zagruzkaNastroek && nuzhnyNastroiki"
      class="account-settings__skeleton"
      aria-busy="true"
    >
      <GhBox padding="md">
        <div class="account-settings__skeleton-lines">
          <GhSkeleton variant="text" width="30%" height="14" />
          <GhSkeleton variant="rect" width="100%" height="32" />
          <GhSkeleton variant="text" width="45%" height="14" />
        </div>
      </GhBox>
    </div>

    <template v-else>
      <TabProfil
        v-if="aktivniyTab === 'profile'"
        :baseline="bazoviyNickname"
        @saved="obnovitBazoviyNickname"
      />
      <TabBezopasnost v-else-if="aktivniyTab === 'security'" />
      <SpisokLichnihTokenov v-else-if="aktivniyTab === 'tokens'" />
      <SpisokRekvizitovOpenCode v-else-if="aktivniyTab === 'opencode'" />
      <TabVneshniyVid v-else-if="aktivniyTab === 'appearance'" />
    </template>

    <GhDialog
      v-model="dialogUhoda"
      :title="t('settings.unsaved.title')"
      persistent
    >
      <p class="account-settings__dialog-text">
        {{ t("settings.unsaved.description") }}
      </p>

      <template #footer>
        <GhButton
          variant="default"
          :label="t('settings.unsaved.stay')"
          @click="otmenitUhod"
        />
        <GhButton
          variant="danger"
          icon="trash"
          :label="t('settings.unsaved.discard')"
          @click="podtverditUhod"
        />
      </template>
    </GhDialog>
  </div>
</template>

<style scoped>
.account-settings {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.account-settings__nav {
  margin-bottom: 16px;
  overflow-x: auto;
  border-bottom: 1px solid var(--borderColor-default);
}

.account-settings__gap {
  margin-bottom: 16px;
}

.account-settings__skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-settings__dialog-text {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}
</style>
