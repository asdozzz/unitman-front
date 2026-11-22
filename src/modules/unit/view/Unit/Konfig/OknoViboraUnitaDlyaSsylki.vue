<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import type { PomoschnikSsylki, Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {
  normalizovatSuffiks,
  pomoschnikZapolnen,
  useStorPomoschnikaSsylki,
} from "@/modules/unit/store/SpisokUnitov/StorPomoschnikaSsylki";
import {
  GhBanner,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhIcon,
  GhInput,
  GhSkeleton,
} from "@/components/ui";

const props = defineProps<{
  modelValue: boolean;
  helper: PomoschnikSsylki | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /**
   * Ссылка вместе с юнитом, который её дал.
   *
   * `targetUnitId` уходит на бэкенд в `ZnacheniePeremenoi.targetUnitId`:
   * бэкенд строит по нему связи юнитов в read-модели списка.
   */
  ssylkaPoluchena: [link: string, targetUnitId: string, targetUnitName: string];
}>();

const storPomoschnika = useStorPomoschnikaSsylki();
const { spisok, loaderSpiska, loaderSsylki, oshibka } = storeToRefs(storPomoschnika);

const zapros = ref<string>("");
const vibraliUnitId = ref<string | null>(null);

/** Суффикс из помощника; `null`, если он не задан или пуст. */
const suffiks = computed<string | null>(() => normalizovatSuffiks(props.helper?.suffix));

const spisokSFiltrom = computed<Unit[]>(() => {
  const zaprosNizhniy = zapros.value.trim().toLowerCase();

  if (!zaprosNizhniy) {
    return spisok.value;
  }

  return spisok.value.filter((unit: Unit) => {
    return (
      unit.name.toLowerCase().includes(zaprosNizhniy) ||
      unit.branch.toLowerCase().includes(zaprosNizhniy)
    );
  });
});

watch(
  () => props.modelValue,
  async (otkrito: boolean) => {
    if (!otkrito) {
      return;
    }

    zapros.value = "";
    vibraliUnitId.value = null;
    storPomoschnika.ochistitOshibku();

    if (pomoschnikZapolnen(props.helper)) {
      await storPomoschnika.poluchitSpisokUnitovProekta(props.helper.projectId);
    }
  },
  { immediate: true },
);

function izmenitZapros(znachenie: string | number | null): void {
  zapros.value = znachenie === null ? "" : String(znachenie);
}

function zakrit() {
  emit("update:modelValue", false);
}

function obnovitSpisok() {
  if (pomoschnikZapolnen(props.helper)) {
    storPomoschnika.obnovitSpisokUnitovProekta(props.helper.projectId);
  }
}

async function vibratUnit(unit: Unit) {
  if (!props.helper) {
    return;
  }

  vibraliUnitId.value = unit.id;

  const ssylka = await storPomoschnika.poluchitSsylku(props.helper, unit.id);

  vibraliUnitId.value = null;

  if (ssylka) {
    // Юнит запоминается вместе со ссылкой: форма отправит его на бэкенд
    // как `targetUnitId`, чтобы связать переменную с этим юнитом.
    emit("ssylkaPoluchena", ssylka, unit.id, unit.name);
    zakrit();
  }
}
</script>

<template>
  <GhDialog
    :model-value="modelValue"
    persistent
    width="700px"
    :title="$t('unit.pomoschnik_ssylki.title')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="link-picker">
      <p class="link-picker__hint">
        {{
          $t("unit.pomoschnik_ssylki.podskazka", {
            service: helper?.service ?? "-",
            port: helper?.port ?? "-",
          })
        }}
      </p>

      <p v-if="suffiks" class="link-picker__hint">
        {{ $t("unit.pomoschnik_ssylki.podskazka_suffiks", { suffix: suffiks }) }}
      </p>

      <GhInput
        icon="search"
        clearable
        :model-value="zapros"
        :placeholder="$t('unit.pomoschnik_ssylki.poisk')"
        :aria-label="$t('unit.pomoschnik_ssylki.poisk')"
        @update:model-value="izmenitZapros"
      />

      <div v-if="loaderSpiska" class="link-picker__skeleton" aria-busy="true">
        <GhSkeleton v-for="n in 4" :key="`pick-${n}`" variant="rect" width="100%" height="40" />
      </div>

      <GhEmptyState
        v-else-if="spisokSFiltrom.length === 0"
        icon="search"
        :title="$t('unit.pomoschnik_ssylki.empty_result')"
      />

      <ul v-else class="link-picker__list">
        <li
          v-for="unit in spisokSFiltrom"
          :key="unit.id"
        >
          <button
            type="button"
            class="link-picker__row"
            :disabled="loaderSsylki"
            @click="vibratUnit(unit)"
          >
            <span class="link-picker__main">
              <span class="link-picker__name">{{ unit.name }}</span>
              <span class="link-picker__meta">
                <span class="gh-mono">{{ unit.branch }}</span>
                <span>·</span>
                <span>{{ unit.projectName }}</span>
              </span>
            </span>

            <GhSkeleton
              v-if="loaderSsylki && vibraliUnitId === unit.id"
              variant="circle"
              width="16px"
              height="16px"
            />
            <GhIcon v-else name="link" />
          </button>
        </li>
      </ul>

      <GhBanner v-if="oshibka" variant="danger">
        {{ oshibka }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
        icon="sync"
        size="sm"
        :loading="loaderSpiska"
        :disabled="loaderSsylki"
        :aria-label="$t('unit.pomoschnik_ssylki.buttons.refresh')"
        @click="obnovitSpisok"
      >
        <q-tooltip>{{ $t("unit.pomoschnik_ssylki.buttons.refresh") }}</q-tooltip>
      </GhButton>

      <GhButton
        variant="default"
        :label="$t('unit.pomoschnik_ssylki.buttons.close')"
        :disabled="loaderSsylki"
        @click="zakrit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.link-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.link-picker__hint {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.link-picker__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-picker__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.link-picker__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
  text-align: left;
  cursor: pointer;
}

.link-picker__row:hover {
  background-color: var(--bgColor-muted);
}

.link-picker__row:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
}

.link-picker__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.link-picker__name {
  overflow: hidden;
  font-weight: var(--fontWeight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-picker__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
