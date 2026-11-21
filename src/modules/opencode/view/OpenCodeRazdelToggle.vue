<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Переключатель разделов OpenCode: обычные сессии и workspace.
 *
 * Оба списка живут на разных маршрутах, но это один раздел приложения:
 * переключатель ведёт себя как segmented control, а не как отдельная навигация.
 * Компонент не хранит состояние — текущий раздел выводится из маршрута.
 */
type RazdelOpenCode = "sessions" | "workspace";

const route = useRoute();
const router = useRouter();

const tekushchiy = computed<RazdelOpenCode>(() => {
    return route.name === "opencode_workspaces" ? "workspace" : "sessions";
});

function perekluchit(razdel: RazdelOpenCode) {
    if (razdel === tekushchiy.value) {
        return;
    }

    void router.push({
        name: razdel === "workspace" ? "opencode_workspaces" : "opencode_sessions",
    });
}
</script>

<template>
  <q-btn-toggle
      :model-value="tekushchiy"
      dense
      no-caps
      unelevated
      color="primary"
      text-color="white"
      toggle-color="white"
      toggle-text-color="primary"
      :options="[
        { label: $t('opencode.nav.sessions'), value: 'sessions', icon: 'forum' },
        { label: $t('opencode.nav.workspace'), value: 'workspace', icon: 'space_dashboard' },
      ]"
      @update:model-value="perekluchit($event as RazdelOpenCode)"
  />
</template>
