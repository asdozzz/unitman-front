<script setup lang="ts">
import {computed} from "vue";
import {useRouter} from "vue-router";
import {storeToRefs} from "pinia";
import type {Deistviye, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {UnitCommand, UnitUiState} from "@/modules/unit/utils/unitStatus";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {useFormaZapolneniyaPeremenihUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import {useAuthStore} from "@/modules/account/store/auth";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import {useStorFormiSozdaniyaSessii} from "@/modules/opencode/store/StorFormiSozdaniyaSessii";

const props = defineProps<{
  item: Unit;
  state: UnitUiState;
}>();

const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const {
  getUnitLoader,
  getUserRoleByProjectIdAndUserId,
  esliJdemRunner,
  spisokDeistvii,
} = storeToRefs(unitiStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const storFormaDeistviy = storFormiDeistviyUnita();
const formaSessiiStore = useStorFormiSozdaniyaSessii();

const authStore = useAuthStore();
const {userId, isAdmin} = storeToRefs(authStore);

/** Те же права, что были у ряда кнопок до рефакторинга. */
const mozhetUpravlyat = computed<boolean>(() => {
  return props.item.unitSozdanSystemoi
      || userId.value === props.item.authorId
      || getUserRoleByProjectIdAndUserId.value(props.item.projectId, userId.value as string) === "ADMIN";
});

type KnopkaKomandi = {
  icon: string;
  labelKey: string;
  run: () => void | Promise<unknown>;
};

function sozdatKnopku(
    icon: string,
    labelKey: string,
    run: () => void | Promise<unknown>,
): KnopkaKomandi {
  return {icon, labelKey, run};
}

/**
 * Реестр поддерживаемых команд.
 *
 * Команды, которых здесь нет (`ustanovitResultat…`, `nachatUdalenie…`),
 * не показываются — ровно как в прежней реализации действий.
 */
const knopkiKomand: Partial<Record<UnitCommand, KnopkaKomandi>> = {
  nachatSborku: sozdatKnopku(
      "build",
      "unit.spisok_unitov.card.buttons.build",
      () => unitiStore.sobratMoiUnit(props.item.id),
  ),
  nachatObnovlenie: sozdatKnopku(
      "update",
      "unit.spisok_unitov.card.buttons.fetch_changes",
      () => unitiStore.obnovitKodMoegoUnita(props.item.id),
  ),
  nachatObnovleniePosleZapuska: sozdatKnopku(
      "update",
      "unit.spisok_unitov.card.buttons.fetch_changes",
      () => unitiStore.obnovitKodMoegoUnita(props.item.id),
  ),
  nachatPodgotovku: sozdatKnopku(
      "done_all",
      "unit.spisok_unitov.card.buttons.preparing",
      () => unitiStore.podgotovitMoiUnit(props.item.id),
  ),
  nachatSbrosPodgotovki: sozdatKnopku(
      "remove_done",
      "unit.spisok_unitov.card.buttons.remove_preparing",
      () => unitiStore.sbrositPodgotovkuMoegoUnita(props.item.id),
  ),
  nachatZapusk: sozdatKnopku(
      "play_arrow",
      "unit.spisok_unitov.card.buttons.up",
      () => unitiStore.zapustitMoiUnit(props.item.id),
  ),
  nachatOstanovku: sozdatKnopku(
      "stop",
      "unit.spisok_unitov.card.buttons.down",
      () => unitiStore.ostanovitMoiUnit(props.item.id),
  ),
  proveritKonteinerUnita: sozdatKnopku(
      "sync",
      "unit.spisok_unitov.card.buttons.check_container",
      () => unitiStore.proveritKonteinerUnita(props.item.id),
  ),
};

const osnovnayaKnopka = computed<KnopkaKomandi | null>(() => {
  const command = props.state.primaryCommand;

  return command ? knopkiKomand[command] ?? null : null;
});

const mozhnoZapolnit = computed<boolean>(() => {
  return props.item.commands.includes("zapolnitPeremenie") || props.state.canOpenLinks;
});

type ZapisMeni = {
  command: UnitCommand;
  knopka: KnopkaKomandi;
};

/** Всё, что не стало основной кнопкой, но поддерживается реестром. */
const meniKnopki = computed<ZapisMeni[]>(() => {
  const zapisi: ZapisMeni[] = [];

  props.state.menuCommands.forEach((command: UnitCommand) => {
    if (command === "zapolnitPeremenie") {
      return;
    }

    if (command === "proveritKonteinerUnita" && !isAdmin.value) {
      return;
    }

    const knopka = knopkiKomand[command];

    if (knopka) {
      zapisi.push({command, knopka});
    }
  });

  return zapisi;
});

const deistviyaSpiska = computed<Deistviye[]>(() => {
  if (!props.item.commands.includes("vipolnitDeistvie")) {
    return [];
  }

  return spisokDeistvii.value(props.item);
});

const estMeni = computed<boolean>(() => {
  return meniKnopki.value.length > 0 || deistviyaSpiska.value.length > 0;
});

async function obnovit() {
  await unitiStore.obnovitUnit(props.item.id);
}

function zapolnitPeremenie() {
  konfigFormStore.otkritFormu(props.item.id, props.item.projectId);
}

function otkritOknoSZadachamiRunnera() {
  router.push({name: "unit_jobs", params: {id: props.item.id}});
}

/** Диалог общий с модулем OpenCode: здесь достаточно открыть его с юнитом. */
function sozdatSessiyuSUnitom() {
  formaSessiiStore.otkrit([props.item.id]);
}

function pokazatFormuDeistviya(deistvie: Deistviye) {
  storFormaDeistviy.otkritFormu(props.item.id, deistvie);
}
</script>

<template>
  <div v-if="mozhetUpravlyat" class="unit-actions">
    <q-btn
        v-if="osnovnayaKnopka"
        class="unit-actions__primary"
        color="primary"
        size="sm"
        no-caps
        :icon="osnovnayaKnopka.icon"
        :label="$t(osnovnayaKnopka.labelKey)"
        :loading="getUnitLoader(item.id)"
        @click="osnovnayaKnopka.run()"
    >
      <q-tooltip>{{ $t(osnovnayaKnopka.labelKey) }}</q-tooltip>
    </q-btn>

    <q-btn
        v-if="mozhnoZapolnit"
        flat
        round
        size="sm"
        color="primary"
        icon="settings"
        :loading="getUnitLoader(item.id)"
        :aria-label="$t('unit.spisok_unitov.card.buttons.set_config')"
        @click="zapolnitPeremenie"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.set_config') }}</q-tooltip>
    </q-btn>

    <q-btn
        flat
        round
        size="sm"
        color="primary"
        icon="info"
        :aria-label="$t('unit.spisok_unitov.card.buttons.jobs')"
        @click="otkritOknoSZadachamiRunnera"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.jobs') }}</q-tooltip>
    </q-btn>

    <q-btn
        flat
        round
        size="sm"
        color="primary"
        icon="forum"
        :aria-label="$t('unit.spisok_unitov.card.buttons.create_session')"
        @click="sozdatSessiyuSUnitom"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.create_session') }}</q-tooltip>
    </q-btn>

    <q-btn
        v-if="esliJdemRunner(item)"
        flat
        round
        size="sm"
        color="primary"
        icon="refresh"
        :loading="getUnitLoader(item.id)"
        :aria-label="$t('unit.spisok_unitov.card.buttons.sync')"
        @click="obnovit"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.sync') }}</q-tooltip>
    </q-btn>

    <q-btn
        v-if="estMeni"
        flat
        round
        size="sm"
        icon="more_horiz"
        :aria-label="$t('unit.spisok_unitov.card.buttons.actions')"
    >
      <q-menu>
        <q-list dense style="min-width: 240px">
          <q-item
              v-for="zapis in meniKnopki"
              :key="zapis.command"
              clickable
              v-close-popup
              @click="zapis.knopka.run()"
          >
            <q-item-section avatar>
              <q-icon :name="zapis.knopka.icon" />
            </q-item-section>
            <q-item-section>{{ $t(zapis.knopka.labelKey) }}</q-item-section>
          </q-item>

          <template v-if="deistviyaSpiska.length > 0">
            <q-separator v-if="meniKnopki.length > 0" />

            <q-item-label header>
              {{ $t('unit.spisok_unitov.card.buttons.actions') }}
            </q-item-label>

            <q-item
                v-for="deistvie in deistviyaSpiska"
                :key="deistvie.id"
                clickable
                v-close-popup
                @click="pokazatFormuDeistviya(deistvie)"
            >
              <q-item-section avatar>
                <q-icon name="apps" />
              </q-item-section>
              <q-item-section>{{ deistvie.name }}</q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-menu>

      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.actions') }}</q-tooltip>
    </q-btn>
  </div>
</template>

<style scoped>
.unit-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-1);
}

.unit-actions :deep(.q-btn) {
  min-width: 36px;
  min-height: 36px;
}

.unit-actions .unit-actions__primary {
  min-width: auto;
  padding-inline: var(--app-space-3);
}
</style>
