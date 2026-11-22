<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { GhBox, GhButton, GhEmptyState } from "@/components/ui";

const { t } = useI18n();
const router = useRouter();

function naGlavnuyu(): void {
  void router.push("/");
}

function kSpiskuUnitov(): void {
  void router.push("/unit/list");
}
</script>

<template>
  <div class="app-state-page primer">
    <h1 class="app-state-page__sr-title">{{ t("app.unauthorized.caption") }}</h1>

    <GhBox class="app-state-page__card">
      <GhEmptyState
        icon="shield"
        :title="t('app.unauthorized.caption')"
        :description="t('app.unauthorized.description')"
      >
        <template #actions>
          <GhButton
            variant="primary"
            icon="home"
            :label="t('app.unauthorized.home')"
            @click="naGlavnuyu"
          />
          <GhButton
            icon="rocket"
            :label="t('app.unauthorized.units')"
            @click="kSpiskuUnitov"
          />
        </template>
      </GhEmptyState>
    </GhBox>
  </div>
</template>

<style scoped>
.app-state-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.app-state-page__card {
  width: 100%;
  max-width: 520px;
}

.app-state-page__sr-title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
