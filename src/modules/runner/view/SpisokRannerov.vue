<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhIcon,
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

/**
 * Инструкция развёрнута по умолчанию при пустом реестре. Если пользователь
 * свернул её вручную, опрос списка не должен разворачивать блок обратно.
 */
const raskrytaInstrukciya = ref<boolean>(false);
const svernutaPolzovatelem = ref<boolean>(false);

watch(
  netRannerov,
  (est) => {
    if (est) {
      if (!svernutaPolzovatelem.value) {
        raskrytaInstrukciya.value = true;
      }
    } else {
      svernutaPolzovatelem.value = false;
    }
  },
  { immediate: true },
);

function pereklyuchitInstrukciyu(): void {
  raskrytaInstrukciya.value = !raskrytaInstrukciya.value;
  svernutaPolzovatelem.value = !raskrytaInstrukciya.value;
}

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
      v-if="netRannerov"
      variant="attention"
      :title="t('runner.runners_page.empty_title')"
      class="runners__banner"
    >
      {{ t("runner.runners_page.empty_description") }}
    </GhBanner>

    <GhBox padding="none" class="runners__instructions">
      <template #header>
        <GhIcon name="book" />
        <span>{{ t("runner.runners_page.registration.title") }}</span>
        <GhButton
          class="runners__instructions-toggle"
          variant="invisible"
          :icon="raskrytaInstrukciya ? 'chevron-up' : 'chevron-down'"
          :aria-label="
            t(
              raskrytaInstrukciya
                ? 'runner.runners_page.registration.collapse'
                : 'runner.runners_page.registration.expand',
            )
          "
          :aria-expanded="raskrytaInstrukciya"
          aria-controls="runner-registration-instructions"
          @click="pereklyuchitInstrukciyu"
        />
      </template>

      <div
        v-show="raskrytaInstrukciya"
        id="runner-registration-instructions"
        class="runners__instructions-body"
      >
        <p class="runners__instructions-intro">
          {{ t("runner.runners_page.registration.intro") }}
        </p>

        <ol class="runners__steps">
          <li>
            <p class="runners__step-title">
              {{ t("runner.runners_page.registration.steps.backend.title") }}
            </p>
            <p class="runners__step-text">
              {{ t("runner.runners_page.registration.steps.backend.description") }}
            </p>
            <pre class="runners__code"><code class="gh-mono">{{ t("runner.runners_page.registration.steps.backend.code") }}</code></pre>
          </li>

          <li>
            <p class="runners__step-title">
              {{ t("runner.runners_page.registration.steps.init.title") }}
            </p>
            <p class="runners__step-text">
              {{ t("runner.runners_page.registration.steps.init.description") }}
            </p>
            <pre class="runners__code"><code class="gh-mono">{{ t("runner.runners_page.registration.steps.init.code") }}</code></pre>
          </li>

          <li>
            <p class="runners__step-title">
              {{ t("runner.runners_page.registration.steps.restart.title") }}
            </p>
            <p class="runners__step-text">
              {{ t("runner.runners_page.registration.steps.restart.description") }}
            </p>
          </li>

          <li>
            <p class="runners__step-title">
              {{ t("runner.runners_page.registration.steps.public_address.title") }}
            </p>
            <p class="runners__step-text">
              {{ t("runner.runners_page.registration.steps.public_address.description") }}
            </p>
          </li>
        </ol>

        <p class="runners__instructions-note">
          <strong>{{ t("runner.runners_page.registration.steps.lost_secret.title") }}:</strong>
          {{ t("runner.runners_page.registration.steps.lost_secret.description") }}
        </p>
      </div>
    </GhBox>

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

    <div v-else-if="!netRannerov" class="runners__grid">
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

.runners__instructions {
  margin-bottom: 16px;
}

.runners__instructions-toggle {
  margin-left: auto;
}

.runners__instructions-body {
  padding: 16px;
}

.runners__instructions-intro {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  line-height: var(--lineHeight-normal);
}

.runners__steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding-left: 20px;
}

.runners__step-title {
  margin: 0;
  font-weight: var(--fontWeight-semibold);
}

.runners__step-text {
  margin: 2px 0 0;
  color: var(--fgColor-muted);
  line-height: var(--lineHeight-normal);
}

.runners__code {
  margin: 8px 0 0;
  padding: 8px 12px;
  overflow-x: auto;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-inset);
  font-size: var(--fontSize-caption);
}

.runners__instructions-note {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-left: 3px solid var(--fgColor-attention);
  background-color: var(--bgColor-attention-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
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
