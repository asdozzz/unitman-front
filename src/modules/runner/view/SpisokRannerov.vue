<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import KartaRannera from "@/modules/runner/view/SpisokRannerov/KartaRannera.vue";
import { storeSpiskaRannerov } from "@/modules/runner/store/StoreSpiskaRannerov";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";

const { t } = useI18n();

const store = storeSpiskaRannerov();
const { loader, ranners, oshibka, init } = storeToRefs(store);

/** Скелетон — только на первичной загрузке, до первого ответа стора. */
const pokazatSkeletony = computed<boolean>(() => loader.value && !init.value);

/** Первый ответ получен, но раннеров нет. */
const netRannerov = computed<boolean>(
  () => init.value && !loader.value && !oshibka.value && ranners.value.length === 0,
);

function povtoritZagruzku(): void {
  void store.zagruzit();
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

/** `R` — обновить список раннеров. */
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
    povtoritZagruzku();
  }
}

onMounted(() => {
  if (!init.value) {
    store.zapustitOprosSpiska();
  } else {
    store.vostanovitOprosSpiska();
  }

  window.addEventListener("keydown", obrabotatKlavishu);
});

onBeforeUnmount(() => {
  store.ostanovitOprosSpiska();
  window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <div class="runners primer">
    <GhPageHeader
      :title="t('runner.runners_page.title')"
      :description="t('runner.runners_page.subtitle')"
    >
      <template #actions>
        <GhButton
          icon="sync"
          :label="t('common.buttons.refresh')"
          :loading="loader"
          :disabled="loader"
          @click="povtoritZagruzku"
        />
      </template>
    </GhPageHeader>

    <GhBanner
      v-if="oshibka"
      variant="danger"
      :title="t('runner.runners_page.error_title')"
      class="runners__banner"
    >
      {{ oshibka }}
      <template #actions>
        <GhButton
          size="sm"
          icon="sync"
          :label="t('common.buttons.retry')"
          :loading="loader"
          @click="povtoritZagruzku"
        />
      </template>
    </GhBanner>

    <div v-if="pokazatSkeletony" class="runners__grid">
      <GhBox v-for="index in 3" :key="index" padding="md" aria-busy="true">
        <div class="runners__skeleton">
          <GhSkeleton variant="text" width="45%" height="12" />
          <GhSkeleton variant="rect" width="100%" height="8" />
          <GhSkeleton variant="text" width="70%" height="12" />
        </div>
      </GhBox>
    </div>

    <GhBox v-else-if="netRannerov" padding="none">
      <GhEmptyState
        icon="server"
        :title="t('runner.runners_page.empty_title')"
        :description="t('runner.runners_page.empty_description')"
      />
    </GhBox>

    <div v-else class="runners__grid">
      <KartaRannera
        v-for="ranner in ranners"
        :key="ranner.id"
        :karta="ranner"
      />
    </div>
  </div>
</template>

<style scoped>
.runners {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.runners__banner {
  max-width: 900px;
  margin-bottom: 16px;
}

.runners__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  align-items: start;
  gap: 16px;
}

.runners__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
