<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
    GhAvatar,
    GhButton,
    GhCounter,
    GhIcon,
    GhKbd,
    GhLabel,
    GhSegmentedControl,
} from "@/components/ui";
import type { GhSegmentedOption } from "@/components/ui";
import { useAuthStore } from "@/modules/account/store/auth";
import { saveAppSettings } from "@/utils/appSettings";

const emit = defineEmits<{
    (e: "toggle-sidebar"): void;
    (e: "open-help"): void;
}>();

const { t } = useI18n();
const router = useRouter();
const $q = useQuasar();

const authStore = useAuthStore();
const { email, getLocale, isAdmin, loaderIzmemeniyaYazika } =
    storeToRefs(authStore);

/** Идентификатор поля поиска; на него переводит фокус глобальный хоткей `/`. */
const IDENTIFIKATOR_POISKA = "app-header-search";

const poisk = ref<string>("");

const temnayaTema = computed<boolean>(() => $q.dark.isActive);

const temaIkona = computed<"sun" | "moon">(() =>
    temnayaTema.value ? "sun" : "moon",
);

const temaPodpis = computed<string>(() =>
    temnayaTema.value
        ? t("app.header.theme_light")
        : t("app.header.theme_dark"),
);

const yazyki = computed<GhSegmentedOption[]>(() => [
    { value: "ru", label: "RU" },
    { value: "en", label: "EN" },
]);

const rolPodpis = computed<string>(() =>
    isAdmin.value
        ? t("app.header.role_admin")
        : t("app.header.role_user"),
);

const imyaPolzovatelya = computed<string>(() => email.value ?? "");

/** Количество непрочитанных уведомлений (счётчик появится на этапе 2). */
const neprochitannie = ref<number>(0);

const podpisUvedomleniy = computed<string>(() =>
    neprochitannie.value > 0
        ? t("app.header.notifications_unread")
        : t("app.header.notifications"),
);

/** Переход на список юнитов с поисковым запросом из хедера. */
function otpravitPoisk(): void {
    const tekst = poisk.value.trim();

    void router.push({
        path: "/unit/list",
        query: tekst === "" ? {} : { search: tekst },
    });

    poisk.value = "";
}

/** Мгновенное переключение темы с сохранением в настройках устройства. */
function pereklyuchitTemu(): void {
    const novoeZnachenie = !$q.dark.isActive;

    $q.dark.set(novoeZnachenie);
    saveAppSettings({ darkMode: novoeZnachenie });
}

/** Мгновенное применение языка через существующий механизм auth-стора. */
function izmenitYazik(yazik: string): void {
    if (yazik === getLocale.value) {
        return;
    }

    document.documentElement.lang = yazik;
    void authStore.izmeniyYazik(yazik);
}

function otkrytNastroiki(): void {
    void router.push("/account/settings");
}

function otkrytProfil(): void {
    void router.push("/account/settings");
}

function vyiti(): void {
    authStore.logout();
    void router.push("/login");
}
</script>

<template>
    <div class="app-header__inner">
        <div class="app-header__left">
            <GhButton
                class="app-header__burger"
                variant="invisible"
                icon="three-bars"
                :aria-label="t('app.header.open_menu')"
                @click="emit('toggle-sidebar')"
            />

            <router-link
                to="/"
                class="app-header__brand"
                :aria-label="t('app.header.logo_aria')"
            >
                <GhIcon name="beaker" :size="16" />
                <span class="app-header__brand-text">Unitman</span>
            </router-link>
        </div>

        <label class="app-header__search">
            <GhIcon name="search" :size="14" />
            <input
                :id="IDENTIFIKATOR_POISKA"
                v-model="poisk"
                type="search"
                class="app-header__search-input"
                :placeholder="t('app.header.search_placeholder')"
                :aria-label="t('app.header.search')"
                autocomplete="off"
                @keydown.enter.prevent="otpravitPoisk"
            />
            <GhKbd>/</GhKbd>
        </label>

        <div class="app-header__actions">
            <div class="app-header__action">
                <GhButton
                    variant="invisible"
                    :icon="temaIkona"
                    :aria-label="temaPodpis"
                    @click="pereklyuchitTemu"
                />
                <q-tooltip anchor="bottom middle" self="top middle">
                    {{ temaPodpis }}
                </q-tooltip>
            </div>

            <div class="app-header__language">
                <q-spinner v-if="loaderIzmemeniyaYazika" size="18px" />
                <GhSegmentedControl
                    v-else
                    :model-value="getLocale"
                    :options="yazyki"
                    size="sm"
                    :aria-label="t('app.header.language')"
                    @update:model-value="izmenitYazik"
                />
            </div>

            <div class="app-header__action app-header__notifications">
                <GhButton
                    variant="invisible"
                    icon="bell"
                    :aria-label="podpisUvedomleniy"
                />
                <GhCounter
                    v-if="neprochitannie > 0"
                    class="app-header__notification-counter"
                    variant="primary"
                    :value="neprochitannie"
                    :label="podpisUvedomleniy"
                />
            </div>

            <q-btn
                flat
                no-caps
                class="app-header__account"
                :aria-label="t('app.header.account_menu')"
            >
                <GhAvatar :name="imyaPolzovatelya" :size="32" />
                <GhIcon name="triangle-down" :size="12" />

                <q-menu auto-close class="app-header__menu primer">
                    <div class="app-header__menu-header">
                        <span class="app-header__menu-email gh-mono">
                            {{ email }}
                        </span>
                        <GhLabel variant="accent" :label="rolPodpis" />
                    </div>

                    <q-separator />

                    <q-list dense class="app-header__menu-list">
                        <q-item clickable :ripple="false" @click="otkrytProfil">
                            <q-item-section avatar>
                                <GhIcon name="person" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("app.header.profile") }}
                            </q-item-section>
                        </q-item>

                        <q-item
                            clickable
                            :ripple="false"
                            @click="otkrytNastroiki"
                        >
                            <q-item-section avatar>
                                <GhIcon name="gear" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("app.header.settings") }}
                            </q-item-section>
                        </q-item>

                        <q-item
                            clickable
                            :ripple="false"
                            @click="emit('open-help')"
                        >
                            <q-item-section avatar>
                                <GhIcon name="question" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("app.header.help") }}
                            </q-item-section>
                        </q-item>

                        <q-separator />

                        <q-item clickable :ripple="false" @click="vyiti">
                            <q-item-section avatar>
                                <GhIcon name="sign-out" />
                            </q-item-section>
                            <q-item-section>
                                {{ t("app.header.sign_out") }}
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-menu>
            </q-btn>
        </div>
    </div>
</template>

<style scoped>
.app-header__inner {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 48px;
    padding: 0 16px;
}

.app-header__left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.app-header__burger {
    display: none;
}

.app-header__brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--fgColor-default);
    text-decoration: none;
    white-space: nowrap;
}

.app-header__brand-text {
    font-size: 16px;
    font-weight: var(--fontWeight-semibold);
    line-height: 1;
}

.app-header__search {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    max-width: 320px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--borderColor-default);
    border-radius: var(--borderRadius-medium);
    background-color: var(--bgColor-muted);
    color: var(--fgColor-muted);
    cursor: text;
}

.app-header__search:focus-within {
    border-color: var(--focus-outlineColor);
    box-shadow: 0 0 0 3px var(--focus-ring-color);
    background-color: var(--bgColor-default);
}

.app-header__search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    color: var(--fgColor-default);
    font-family: var(--fontStack-system);
    font-size: var(--fontSize-body);
    outline: none;
}

.app-header__search-input::placeholder {
    color: var(--fgColor-muted);
}

.app-header__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
}

.app-header__action {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.app-header__language {
    display: inline-flex;
    align-items: center;
}

.app-header__notification-counter {
    position: absolute;
    top: -4px;
    right: -4px;
    pointer-events: none;
}

.app-header__account {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 0 4px;
    color: var(--fgColor-muted);
}

.app-header__menu {
    min-width: 240px;
    padding: 4px;
    border: 1px solid var(--borderColor-default);
    border-radius: var(--borderRadius-large);
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
    box-shadow: var(--shadow-floating-small);
}

.app-header__menu-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
}

.app-header__menu-email {
    overflow: hidden;
    font-size: var(--fontSize-caption);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-header__menu-list :deep(.q-item) {
    min-height: 32px;
    border-radius: var(--borderRadius-medium);
    font-size: var(--fontSize-body);
}

.app-header__menu-list :deep(.q-item:hover) {
    background-color: var(--bgColor-neutral-muted);
}

@media (max-width: 767px) {
    .app-header__inner {
        gap: 8px;
        padding: 0 12px;
    }

    .app-header__burger {
        display: inline-flex;
    }

    .app-header__search {
        display: none;
    }
}

@media (max-width: 599px) {
    .app-header__brand-text {
        display: none;
    }

    .app-header__language,
    .app-header__notifications {
        display: none;
    }
}
</style>
