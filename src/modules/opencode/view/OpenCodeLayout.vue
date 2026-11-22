<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { GhPageHeader } from "@/components/ui";
import OpenCodeRazdelToggle from "@/modules/opencode/view/OpenCodeRazdelToggle.vue";

/**
 * Каркас раздела ИИ-помощника.
 *
 * Шапка и переключатель разделов показываются на страницах списков. Экран
 * чата занимает всю высоту и имеет собственный заголовок с кнопкой возврата,
 * поэтому общий каркас там скрыт.
 */
const route = useRoute();
const { t } = useI18n();

const vChate = computed<boolean>(() => {
  return route.name === "opencode_unit_session_chat"
    || route.name === "opencode_workspace_chat";
});
</script>

<template>
  <div class="opencode-layout primer" :class="{ 'opencode-layout--chat': vChate }">
    <template v-if="!vChate">
      <GhPageHeader
          :title="t('opencode.layout.title')"
          :description="t('opencode.layout.description')"
      />

      <div class="opencode-layout__nav">
        <OpenCodeRazdelToggle />
      </div>
    </template>

    <router-view />
  </div>
</template>

<style scoped>
.opencode-layout {
  padding: 24px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.opencode-layout--chat {
  padding: 0;
}

.opencode-layout__nav {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--borderColor-default);
}

@media (max-width: 768px) {
  .opencode-layout {
    padding: 16px;
  }
}
</style>
