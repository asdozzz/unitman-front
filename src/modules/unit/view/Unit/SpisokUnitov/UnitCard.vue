<script setup lang="ts">
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import type {SvyazUnita, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {useAuthStore} from "@/modules/account/store/auth";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {useUnitUiState} from "@/modules/unit/utils/useUnitUiState";
import UnitCardMenu from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardMenu.vue";
import UnitCardHeader from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardHeader.vue";
import UnitCardAlert from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardAlert.vue";
import UnitCardLinks from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardLinks.vue";
import UnitCardRelated from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardRelated.vue";
import UnitCardStats from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardStats.vue";
import UnitCardDetails from "@/modules/unit/view/Unit/SpisokUnitov/UnitCardDetails.vue";
import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
import OknoRedaktorovUnita from "@/modules/unit/view/Unit/SpisokUnitov/OknoRedaktorovUnita.vue";

const props = withDefaults(defineProps<{
  item: Unit;
  variant?: "grid" | "detail";
}>(), {
  variant: "grid",
});

const unitiStore = useSpisokUnitovStore();
const {
  showForceRemove,
  getUnitLoader,
  svyazannieUniti,
  nazvanieUnitaPoId,
  vibranLiUnitVFiltreSvyazei,
} = storeToRefs(unitiStore);

const authStore = useAuthStore();
const {isAdmin} = storeToRefs(authStore);

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
  return nazvanieUnitaPoId.value(svyaz.targetUnitId)
      ?? svyaz.service
      ?? `${svyaz.targetUnitId.slice(0, 8)}…`;
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
  <q-dialog v-model="prompt" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">{{ $t('unit.spisok_unitov.card.delete_confirm.title') }}</div>
        <div class="text-caption-muted q-mt-sm">
          {{ $t('unit.spisok_unitov.card.delete_confirm.message', {name: item.name}) }}
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat :label="$t('unit.spisok_unitov.card.delete_confirm.no')" v-close-popup />
        <q-btn
            flat
            color="negative"
            :label="$t('unit.spisok_unitov.card.delete_confirm.yes')"
            :loading="getUnitLoader(item.id)"
            @click="udalit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <OknoRedaktorovUnita :unit="item" />

  <article
      class="unit-card"
      :class="[`unit-card--${variant}`, {'unit-card--error': item.error}]"
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
  </article>
</template>

<style scoped>
.unit-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
  transition: box-shadow var(--app-duration-base) var(--app-easing);
}

/* Border-first: тень появляется только на hover. */
.unit-card:hover {
  box-shadow: var(--app-shadow-md);
}

/* Ошибка читается левым акцентом, а не красной рамкой по всему периметру. */
.unit-card--error {
  border-left: 3px solid var(--app-negative);
}

.unit-card--detail,
.unit-card--detail:hover {
  box-shadow: none;
}

.unit-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  padding: var(--app-space-3) var(--app-space-4);
}

.unit-card--detail .unit-card__body {
  gap: var(--app-space-4);
}

.unit-card__details {
  padding: 0 var(--app-space-4) var(--app-space-2);
  border-top: 1px solid var(--app-border);
}
</style>
