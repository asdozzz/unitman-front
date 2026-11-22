<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { GhUnderlineNav } from "@/components/ui";
import type { GhNavItem } from "@/components/ui";

/**
 * Переключатель разделов OpenCode: обычные сессии и workspace.
 *
 * Оба списка живут на разных маршрутах, но это один раздел приложения:
 * переключатель ведёт себя как навигационные вкладки, а не как отдельная
 * навигация. Компонент не хранит состояние — текущий раздел выводится из
 * маршрута.
 */
type RazdelOpenCode = "sessions" | "workspace";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const tekushchiy = computed<RazdelOpenCode>(() => {
    return route.name === "opencode_workspaces" ? "workspace" : "sessions";
});

const punkty = computed<GhNavItem[]>(() => [
    {
        name: "sessions",
        label: t("opencode.nav.sessions"),
        icon: "comment-discussion",
    },
    {
        name: "workspace",
        label: t("opencode.nav.workspace"),
        icon: "rows",
    },
]);

function perekluchit(razdel: string) {
    if (razdel !== "sessions" && razdel !== "workspace") {
        return;
    }

    if (razdel === tekushchiy.value) {
        return;
    }

    void router.push({
        name: razdel === "workspace" ? "opencode_workspaces" : "opencode_sessions",
    });
}
</script>

<template>
  <GhUnderlineNav
      :model-value="tekushchiy"
      :items="punkty"
      :aria-label="t('opencode.layout.title')"
      @update:model-value="perekluchit"
  />
</template>
