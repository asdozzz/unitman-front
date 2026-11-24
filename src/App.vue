<template>
    <div
        id="app"
        class="primer-theme app-shell"
        :data-color-mode="$q.dark.isActive ? 'dark' : 'light'"
    >
        <a
            href="#main-content"
            class="gh-visually-hidden app-shell__skip-link"
            @click.prevent="pereytiKKontentu"
        >
            {{ t("app.skip_to_content") }}
        </a>

        <q-layout view="hHh Lpr lff" class="app-shell__layout">
            <template v-if="pokazatKarkas">
                <q-header class="app-shell__header">
                    <AppHeader
                        @toggle-sidebar="otkrytSaidbar"
                        @open-help="otkrytShpargalku"
                    />
                </q-header>

                <q-drawer
                    v-model="leftDrawerOpen"
                    side="left"
                    :width="shirinaSaidbara"
                    :breakpoint="767"
                    :show-if-above="true"
                    :bordered="false"
                    class="app-shell__drawer"
                >
                    <AppSidebar
                        :collapsed="svernutSaidbar && !$q.screen.lt.md"
                        @toggle-collapse="pereklyuchitSaidbar"
                        @navigate="zakritSaidbarNaMobilnom"
                    />
                </q-drawer>
            </template>

            <q-page-container class="app-shell__page">
                <main
                    id="main-content"
                    ref="konteynerKontenta"
                    tabindex="-1"
                    class="gh-page app-shell__main"
                >
                    <router-view />
                </main>

                <UvedomleniyaOpenCode />

                <div v-if="pokazatNaverh" class="app-shell__back-to-top">
                    <GhButton
                        variant="default"
                        size="sm"
                        icon="arrow-up"
                        :aria-label="t('app.back_to_top')"
                        @click="naverh"
                    />
                </div>

                <HotkeysDialog v-model="shpargalkaOtkryta" />
            </q-page-container>
        </q-layout>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import "dayjs/locale/ru";
import "dayjs/locale/en";
import dayjs from "dayjs";
import { GhButton } from "@/components/ui";
import AppHeader from "@/modules/app/view/AppHeader.vue";
import AppSidebar from "@/modules/app/view/AppSidebar.vue";
import HotkeysDialog from "@/modules/app/view/HotkeysDialog.vue";
import UvedomleniyaOpenCode from "@/modules/opencode/view/UvedomleniyaOpenCode.vue";
import { useAuthStore } from "@/modules/account/store/auth";
import { useHotkeys } from "@/utils/useHotkeys";
import { loadAppSettings, saveAppSettings } from "@/utils/appSettings";

const { t } = useI18n();
const $q = useQuasar();
const router = useRouter();

const nastroiki = loadAppSettings();

const authStore = useAuthStore();
const { isAuth, isAdmin, getLocale } = storeToRefs(authStore);

const svernutSaidbar = ref<boolean>(nastroiki.sidebarCollapsed);
const leftDrawerOpen = ref<boolean>(nastroiki.leftDrawerOpen);
const shpargalkaOtkryta = ref<boolean>(false);
const pokazatNaverh = ref<boolean>(false);

const konteynerKontenta = ref<HTMLElement | null>(null);

/**
 * Ширина сайдбара: 232px в развёрнутом виде, 48px в свёрнутом.
 * На мобильной ширине drawer всегда полноразмерный — свёрнутые иконки
 * внутри 48px нечитаемы.
 */
const shirinaSaidbara = computed<number>(() =>
    $q.screen.lt.md ? 232 : svernutSaidbar.value ? 48 : 232,
);

/**
 * Каркас (хедер и сайдбар) показывается авторизованным пользователям.
 */
const pokazatKarkas = computed<boolean>(() => isAuth.value);

onMounted(() => {
    authStore.updateLocale(getLocale.value);
    dayjs.locale(getLocale.value);
    document.documentElement.lang = getLocale.value;

    // Повторно применяем тему на случай, если main.ts не успел выставить её
    // до монтирования (например, значение изменили в другой вкладке).
    $q.dark.set(nastroiki.darkMode);

    window.addEventListener("scroll", obrabotatProkrutku, { passive: true });
});

onUnmounted(() => {
    window.removeEventListener("scroll", obrabotatProkrutku);
});

/** Сворачивает/разворачивает сайдбар и сохраняет выбор устройства. */
function pereklyuchitSaidbar(): void {
    svernutSaidbar.value = !svernutSaidbar.value;
    saveAppSettings({ sidebarCollapsed: svernutSaidbar.value });
}

/** Открывает сайдбар на мобильной ширине (бургер в хедере). */
function otkrytSaidbar(): void {
    leftDrawerOpen.value = true;
    saveAppSettings({ leftDrawerOpen: leftDrawerOpen.value });
}

/** Закрывает мобильный drawer после перехода по пункту меню. */
function zakritSaidbarNaMobilnom(): void {
    if ($q.screen.lt.md) {
        leftDrawerOpen.value = false;
    }
}

/** Открывает диалог-шпаргалку горячих клавиш. */
function otkrytShpargalku(): void {
    shpargalkaOtkryta.value = true;
}

/** Переводит фокус в поле глобального поиска в хедере. */
function fokusNaPoisk(): void {
    const pole = document.getElementById(
        "app-header-search",
    ) as HTMLInputElement | null;

    pole?.focus();
    pole?.select();
}

/** Переход к содержимому по skip-link с установкой фокуса. */
function pereytiKKontentu(): void {
    konteynerKontenta.value?.focus();
    konteynerKontenta.value?.scrollIntoView({ block: "start" });
}

/** Возврат наверх страницы. */
function naverh(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Показывает кнопку «Наверх» после прокрутки содержимого. */
function obrabotatProkrutku(): void {
    const prokrutka =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop;

    pokazatNaverh.value = prokrutka > 150;
}

useHotkeys(
    {
        poisk: fokusNaPoisk,
        pereytiNaGlavnuyu: () => {
            void router.push("/");
        },
        pereytiKUnitam: () => {
            void router.push("/unit/list");
        },
        pereytiKProektam: () => {
            if (isAdmin.value) {
                void router.push("/unit/projects");
            }
        },
        pereytiKAkkauntam: () => {
            if (isAdmin.value) {
                void router.push("/account/list");
            }
        },
        pereytiKRepozitoriyam: () => {
            if (isAdmin.value) {
                void router.push("/unit/repositories");
            }
        },
        pereytiKNastroikam: () => {
            void router.push("/account/settings");
        },
        pereklyuchitSaidbar,
        otkrytShpargalku,
    },
    {
        kogdaAktivno: () => pokazatKarkas.value,
    },
);
</script>

<style scoped>
.app-shell {
    min-height: 100vh;
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
}

.app-shell__skip-link {
    top: 8px;
    left: 8px;
    z-index: 3000;
    border-radius: var(--borderRadius-medium);
    background-color: var(--bgColor-default);
    color: var(--fgColor-accent);
    font-family: var(--fontStack-system);
    font-size: var(--fontSize-body);
    text-decoration: none;
}

.app-shell__skip-link:focus,
.app-shell__skip-link:focus-visible {
    border: 1px solid var(--borderColor-default);
}

.app-shell__header {
    height: 48px;
    background-color: var(--bgColor-default);
    border-bottom: 1px solid var(--borderColor-muted);
    box-shadow: none;
    color: var(--fgColor-default);
}

.app-shell__drawer {
    background-color: var(--bgColor-default);
}

.app-shell__page {
    background-color: var(--bgColor-default);
}

.app-shell__main {
    min-height: calc(100vh - 48px);
    outline: none;
}

.app-shell__main:focus,
.app-shell__main:focus-visible {
    outline: none;
}

.app-shell__back-to-top {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 1000;
}
</style>
