<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhLabel,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import { storeSostoyaniyaDefoltnogoRunnera } from "@/modules/runner/store/StoreSostoyaniyaDefoltnogoRunnera";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";

const { t } = useI18n();

const store = storeSostoyaniyaDefoltnogoRunnera();
const { active, oshibkaBackenda, init, loader } = storeToRefs(store);

/** Скелетон — только на первичной загрузке, до первого ответа стора. */
const pokazatSkeletony = computed<boolean>(() => loader.value && !init.value);

/** Статус ещё не получен и ошибки нет — пустое/неизвестное состояние. */
const sostoyanieNeizvestno = computed<boolean>(
  () => !loader.value && !oshibkaBackenda.value && !init.value,
);

const variantBadzha = computed<GhLabelVariant>(() =>
  active.value ? "success" : "danger",
);
const ikonkaBadzha = computed<OcticonName>(() =>
  active.value ? "play" : "x-circle",
);
const podpisBadzha = computed<string>(() =>
  t(active.value ? "runner.status_active" : "runner.status_non_active"),
);
const opisanieStatusa = computed<string>(() =>
  t(active.value ? "runner.description_active" : "runner.non_active"),
);

/** Ручной повторный запрос существующим методом стора; polling не меняется. */
function povtoritProverku(): void {
  void store.getDefaultRunnerActive();
}

/** Селекторы, внутри которых страничные хоткеи не перехватываются. */
function ignorirovatVvod(event: KeyboardEvent): boolean {
  const cel = event.target;

  if (!(cel instanceof HTMLElement)) {
    return false;
  }

  if (cel.isContentEditable) {
    return true;
  }

  return (
    cel.closest(
      'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], .q-dialog, .q-menu',
    ) !== null
  );
}

/** `R` — обновить статус, не перехватывая `g`-последовательности. */
function obrabotatKlavishu(event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    ignorirovatVvod(event) ||
    ozhidaetsyaVtorayaKlavishaPosledovatelnosti()
  ) {
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    povtoritProverku();
  }
}

onMounted(async () => {
  if (!init.value) {
    store.zapustitOprosStatusaRunnera();
  } else {
    store.vostanovitOprosStatus();
  }

  window.addEventListener("keydown", obrabotatKlavishu);
});

onBeforeUnmount(() => {
  store.ostanovitOprosStatusaRunnera();
  window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <div class="runner-status primer">
    <GhPageHeader
      :title="t('runner.title')"
      :description="t('runner.subtitle')"
    >
      <template #actions>
        <GhButton
          icon="sync"
          :label="t('common.buttons.refresh')"
          :loading="loader"
          :disabled="loader"
          @click="povtoritProverku"
        />
      </template>
    </GhPageHeader>

    <GhBanner
      v-if="oshibkaBackenda"
      variant="danger"
      :title="t('runner.error_title')"
      class="runner-status__banner"
    >
      {{ oshibkaBackenda }}
      <template #actions>
        <GhButton
          size="sm"
          icon="sync"
          :label="t('common.buttons.retry')"
          :loading="loader"
          @click="povtoritProverku"
        />
      </template>
    </GhBanner>

    <GhBox
      v-else-if="pokazatSkeletony"
      padding="md"
      aria-busy="true"
      class="runner-status__card"
    >
      <div class="runner-status__skeleton">
        <GhSkeleton variant="text" width="35%" height="12" />
        <GhSkeleton variant="rect" width="140px" height="20" />
        <GhSkeleton variant="text" width="60%" height="12" />
      </div>
    </GhBox>

    <GhBox
      v-else-if="sostoyanieNeizvestno"
      padding="none"
      class="runner-status__card"
    >
      <GhEmptyState
        icon="question"
        :title="t('runner.unknown_title')"
        :description="t('runner.unknown_description')"
      />
    </GhBox>

    <GhBox v-else padding="md" class="runner-status__card">
      <GhLabel
        :variant="variantBadzha"
        :icon="ikonkaBadzha"
        :label="podpisBadzha"
        role="status"
        class="runner-status__badge"
      />
      <p class="runner-status__description">{{ opisanieStatusa }}</p>
    </GhBox>
  </div>
</template>

<style scoped>
.runner-status {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.runner-status__banner {
  max-width: 640px;
  margin-bottom: 16px;
}

.runner-status__card {
  max-width: 640px;
}

.runner-status__badge {
  height: auto;
}

.runner-status__description {
  margin: 8px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.runner-status__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
