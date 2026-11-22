<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { SvyazUnita, Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { useAuthStore } from "@/modules/account/store/auth";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
import { useUnitUiState } from "@/modules/unit/utils/useUnitUiState";
import { GhBox, GhButton, GhDialog } from "@/components/ui";
import UnitCardMenu from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardMenu.vue";
import UnitCardHeader from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardHeader.vue";
import UnitCardAlert from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardAlert.vue";
import UnitCardLinks from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardLinks.vue";
import UnitCardRelated from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardRelated.vue";
import UnitCardStats from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardStats.vue";
import UnitCardDetails from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardDetails.vue";
import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
import OknoRedaktorovUnita from "@/modules/unit/view/Unit/SpisokUnitov/OknoRedaktorovUnita.vue";

const props = withDefaults(
  defineProps<{
    item: Unit;
    variant?: "grid" | "detail";
  }>(),
  {
    variant: "grid",
  },
);

const unitiStore = useSpisokUnitovStore();
const {
  showForceRemove,
  getUnitLoader,
  svyazannieUniti,
  nazvanieUnitaPoId,
  vibranLiUnitVFiltreSvyazei,
} = storeToRefs(unitiStore);

const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

const state = useUnitUiState(() => props.item);

/** Уникальные связанные юниты: связь описана на уровне переменной. */
const spisokSvyazei = computed<SvyazUnita[]>(() => {
  return svyazannieUniti.value(props.item);
});

/**
 * Подпись бейджа: имя юнита из кеша, иначе сервис из помощника,
 * иначе укороченный идентификатор — чтобы бейдж не оставался пустым.
 */
function podpisSvyazi(svyaz: SvyazUnita): string {
  return (
    nazvanieUnitaPoId.value(svyaz.targetUnitId) ??
    svyaz.service ??
    `${svyaz.targetUnitId.slice(0, 8)}…`
  );
}

async function perekluchitSvyaz(targetUnitId: string) {
  await unitiStore.perekluchitSvyazUnita(targetUnitId);
}

const isShowRemoveBtn = computed<boolean>(() => {
  return showForceRemove.value(props.item) || isAdmin.value;
});

const prompt = ref(false);

function showRemovePrompt() {
  prompt.value = true;
}

function zakritPrompt() {
  prompt.value = false;
}

async function udalit() {
  await unitiStore.udalit(props.item);
  prompt.value = false;
}

async function rebuildModel() {
  await unitiStore.rebuildModel(props.item.id);
}

async function pometitKakSlomanii() {
  await unitiStore.pometitKakSlomanii(props.item.id);
}
</script>

<template>
  <GhDialog
    v-model="prompt"
    persistent
    width="420px"
    :title="$t('unit.spisok_unitov.card.delete_confirm.title')"
  >
    <p class="unit-card__confirm-text">
      {{ $t("unit.spisok_unitov.card.delete_confirm.message", { name: item.name }) }}
    </p>

    <div class="unit-card__confirm-actions">
      <GhButton
        :label="$t('unit.spisok_unitov.card.delete_confirm.no')"
        @click="zakritPrompt"
      />
      <GhButton
        variant="danger"
        :label="$t('unit.spisok_unitov.card.delete_confirm.yes')"
        :loading="getUnitLoader(item.id)"
        @click="udalit"
      />
    </div>
  </GhDialog>

  <OknoRedaktorovUnita :unit="item" />

  <GhBox
    padding="none"
    class="unit-card"
    :class="[`unit-card--${variant}`, { 'unit-card--error': item.error }]"
  >
    <UnitCardHeader :item="item" :state="state">
      <!-- Единственный кебаб карточки живёт в шапке-тулбаре. -->
      <template #actions>
        <UnitCardMenu
          :item="item"
          :state="state"
          :is-admin="isAdmin"
          :can-remove="isShowRemoveBtn"
          @mark-broken="pometitKakSlomanii"
          @rebuild="rebuildModel"
          @remove="showRemovePrompt"
        />
      </template>
    </UnitCardHeader>

    <div class="unit-card__body">
      <UnitCardAlert :unit="item" :error="item.error" />

      <UnitActions :item="item" :state="state" />

      <UnitCardLinks :links="item.links" :can-open="state.canOpenLinks" />

      <UnitCardRelated
        :svyazi="spisokSvyazei"
        :label-for="podpisSvyazi"
        :is-selected="vibranLiUnitVFiltreSvyazei"
        @toggle="perekluchitSvyaz"
      />

      <UnitCardStats :stats="item.statistikaKonteinera ?? null" />
    </div>

    <div class="unit-card__details">
      <UnitCardDetails :item="item" />
    </div>
  </GhBox>
</template>

<style scoped>
.unit-card {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  transition: box-shadow 120ms ease-out;
}

/* Border-first: тень появляется только на hover. */
.unit-card:hover {
  box-shadow: var(--shadow-floating-small);
}

/* Ошибка читается левым акцентом, а не красной рамкой по всему периметру. */
.unit-card--error {
  border-left: 3px solid var(--fgColor-danger);
}

.unit-card--detail,
.unit-card--detail:hover {
  box-shadow: none;
}

.unit-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
}

.unit-card--detail .unit-card__body {
  gap: 16px;
}

.unit-card__details {
  padding: 0 16px 8px;
  border-top: 1px solid var(--borderColor-default);
}

.unit-card__confirm-text {
  margin: 0 0 12px;
  color: var(--fgColor-default);
}

.unit-card__confirm-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
