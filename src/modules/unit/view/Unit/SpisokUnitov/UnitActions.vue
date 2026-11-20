<script setup lang="ts">
import {computed} from "vue";
import {useRouter} from "vue-router";
import {storeToRefs} from "pinia";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {UnitCommand, UnitUiState} from "@/modules/unit/utils/unitStatus";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {useAuthStore} from "@/modules/account/store/auth";
import {useStorFormiSozdaniyaSessii} from "@/modules/opencode/store/StorFormiSozdaniyaSessii";
import {sozdatReestrKomand, type KnopkaKomandi} from "@/modules/unit/utils/unitCommands";

const props = defineProps<{
  item: Unit;
  state: UnitUiState;
}>();

const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const {getUnitLoader, getUserRoleByProjectIdAndUserId} = storeToRefs(unitiStore);

const formaSessiiStore = useStorFormiSozdaniyaSessii();

const authStore = useAuthStore();
const {userId} = storeToRefs(authStore);

/** Те же права, что были у действий до рефакторинга. */
const mozhetUpravlyat = computed<boolean>(() => {
  return props.item.unitSozdanSystemoi
      || userId.value === props.item.authorId
      || getUserRoleByProjectIdAndUserId.value(props.item.projectId, userId.value as string) === "ADMIN";
});

/** Единый реестр команд: подпись и выполнение не дублируются в меню. */
const reestrKomand = computed<Partial<Record<UnitCommand, KnopkaKomandi>>>(() => {
  return sozdatReestrKomand(unitiStore, props.item.id);
});

const osnovnayaKnopka = computed<KnopkaKomandi | null>(() => {
  const command = props.state.primaryCommand;

  return command ? reestrKomand.value[command] ?? null : null;
});

function otkritOknoSZadachamiRunnera() {
  router.push({name: "unit_jobs", params: {id: props.item.id}});
}

/** Диалог общий с модулем OpenCode: здесь достаточно открыть его с юнитом. */
function sozdatSessiyuSUnitom() {
  formaSessiiStore.otkrit([props.item.id]);
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
        class="unit-actions__ghost"
        flat
        no-caps
        size="sm"
        icon="info"
        :label="$t('unit.spisok_unitov.card.buttons.jobs')"
        @click="otkritOknoSZadachamiRunnera"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.jobs') }}</q-tooltip>
    </q-btn>

    <q-btn
        class="unit-actions__ghost"
        flat
        no-caps
        size="sm"
        icon="forum"
        :label="$t('unit.spisok_unitov.card.buttons.session')"
        @click="sozdatSessiyuSUnitom"
    >
      <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.create_session') }}</q-tooltip>
    </q-btn>
  </div>
</template>

<style scoped>
.unit-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-2);
}

.unit-actions .unit-actions__primary {
  padding-inline: var(--app-space-3);
}

/* Ghost-кнопки с подписью: компактные, но кликабельная площадь не меньше 28px. */
.unit-actions .unit-actions__ghost {
  min-height: 28px;
  padding-inline: var(--app-space-2);
  font-size: 13px;
  color: var(--app-text-secondary);
}
</style>
