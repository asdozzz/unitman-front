<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { GhButton, GhKbd, GhSideNav } from "@/components/ui";
import type { GhSideNavGroup, GhSideNavItem } from "@/components/ui";
import { useAuthStore } from "@/modules/account/store/auth";

const props = withDefaults(
    defineProps<{
        /** Свёрнут ли сайдбар до иконок. */
        collapsed?: boolean;
    }>(),
    {
        collapsed: false,
    },
);

const emit = defineEmits<{
    (e: "toggle-collapse"): void;
    (e: "navigate"): void;
}>();

const { t } = useI18n();
const route = useRoute();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

/** Пункты основной группы — доступны всем авторизованным. */
const osnovniePunkty = computed<GhSideNavItem[]>(() => [
    {
        id: "home",
        label: t("app.sidebar.items.home"),
        icon: "home",
        to: "/",
    },
    {
        id: "units",
        label: t("app.sidebar.items.units"),
        icon: "rocket",
        to: "/unit/list",
    },
    {
        id: "sessions",
        label: t("app.sidebar.items.sessions"),
        icon: "cpu",
        to: "/opencode/sessions",
    },
    {
        id: "workspaces",
        label: t("app.sidebar.items.workspaces"),
        icon: "project",
        to: "/opencode/workspaces",
    },
    {
        id: "settings",
        label: t("app.sidebar.items.settings"),
        icon: "gear",
        to: "/account/settings",
    },
]);

/** Пункты группы администрирования — только для ROLE_ADMIN. */
const administrativniePunkty = computed<GhSideNavItem[]>(() => [
    {
        id: "accounts",
        label: t("app.sidebar.items.accounts"),
        icon: "people",
        to: "/account/list",
    },
    {
        id: "repositories",
        label: t("app.sidebar.items.repositories"),
        icon: "inbox",
        to: "/unit/repositories",
    },
    {
        id: "projects",
        label: t("app.sidebar.items.projects"),
        icon: "project",
        to: "/unit/projects",
    },
    {
        id: "initialization",
        label: t("app.sidebar.items.initialization"),
        icon: "gear",
        to: "/init",
    },
    {
        id: "runners",
        label: t("app.sidebar.items.runners"),
        icon: "server",
        to: "/runner/list",
    },
]);

const gruppy = computed<GhSideNavGroup[]>(() => {
    const result: GhSideNavGroup[] = [
        {
            id: "main",
            label: t("app.sidebar.groups.main"),
            items: osnovniePunkty.value,
        },
    ];

    if (isAdmin.value) {
        result.push({
            id: "administration",
            label: t("app.sidebar.groups.administration"),
            items: administrativniePunkty.value,
        });
    }

    return result;
});

/**
 * Определяет идентификатор активного пункта по текущему маршруту.
 *
 * Для вложенных адресов выбирается самый длинный совпавший префикс, поэтому
 * `/unit/projects/123` подсвечивает «Проекты», а не «Юниты». Редактирование
 * аккаунта (`/account/:id`) не имеет собственного пункта — подсвечиваем
 * «Аккаунты».
 */
function opredelitAktivniy(put: string, gruppySpiska: GhSideNavGroup[]): string {
    let luchshiyId = "";
    let luchshayaDlina = -1;

    gruppySpiska.forEach((gruppa: GhSideNavGroup) => {
        gruppa.items.forEach((punkt: GhSideNavItem) => {
            if (!punkt.to) {
                return;
            }

            const sovpadenie =
                punkt.to === "/"
                    ? put === "/" || put === "/home"
                    : put === punkt.to || put.startsWith(`${punkt.to}/`);

            if (sovpadenie && punkt.to.length > luchshayaDlina) {
                luchshiyId = punkt.id;
                luchshayaDlina = punkt.to.length;
            }
        });
    });

    if (luchshiyId === "" && isAdmin.value && put.startsWith("/account/")) {
        return "accounts";
    }

    return luchshiyId;
}

const aktivniyId = computed<string>({
    get: () => opredelitAktivniy(route.path, gruppy.value),
    set: () => {
        // Навигацию выполняет сам `to`-пункт GhSideNav; запись v-model
        // не должна подменять вычисленный активный маршрут.
    },
});

const podpisSvorachivaniya = computed<string>(() =>
    props.collapsed ? t("app.sidebar.expand") : t("app.sidebar.collapse"),
);

function pereklyuchitSvorachivanie(): void {
    emit("toggle-collapse");
}

function soobshchitONavigacii(): void {
    emit("navigate");
}
</script>

<template>
    <div class="app-sidebar" :class="{ 'app-sidebar--collapsed': collapsed }">
        <div class="app-sidebar__nav">
            <GhSideNav
                v-model="aktivniyId"
                :groups="gruppy"
                :collapsed="collapsed"
                :aria-label="t('app.sidebar.navigation')"
                @select="soobshchitONavigacii"
            />
        </div>

        <div class="app-sidebar__footer">
            <GhButton
                variant="invisible"
                block
                :icon="collapsed ? 'sidebar-expand' : 'sidebar-collapse'"
                :aria-label="podpisSvorachivaniya"
                :aria-expanded="!collapsed"
                @click="pereklyuchitSvorachivanie"
            >
                <template v-if="!collapsed">
                    <span>{{ podpisSvorachivaniya }}</span>
                    <GhKbd>\</GhKbd>
                </template>
            </GhButton>
        </div>
    </div>
</template>

<style scoped>
.app-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 8px;
    background-color: var(--bgColor-default);
    border-right: 1px solid var(--borderColor-muted);
}

.app-sidebar__nav {
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
}

.app-sidebar__footer {
    flex-shrink: 0;
    padding-top: 8px;
    border-top: 1px solid var(--borderColor-muted);
}

.app-sidebar__footer :deep(.gh-button) {
    justify-content: flex-start;
    color: var(--fgColor-muted);
}

.app-sidebar--collapsed .app-sidebar__footer :deep(.gh-button) {
    justify-content: center;
}

.app-sidebar__footer :deep(.gh-button__label) {
    gap: 6px;
}
</style>
