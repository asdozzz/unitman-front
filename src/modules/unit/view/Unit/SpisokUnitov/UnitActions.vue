<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type { UnitCommand, UnitUiState } from "@/modules/unit/utils/unitStatus";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
import { useAuthStore } from "@/modules/account/store/auth";
import { useStorFormiSozdaniyaSessii } from "@/modules/opencode/store/StorFormiSozdaniyaSessii";
import { sozdatReestrKomand, type KnopkaKomandi } from "@/modules/unit/utils/unitCommands";
import { GhButton } from "@/components/ui";
import type { OcticonName } from "@/components/ui";

const props = defineProps<{
  item: Unit;
  state: UnitUiState;
}>();

const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const { getUnitLoader, getUserRoleByProjectIdAndUserId } = storeToRefs(unitiStore);

const formaSessiiStore = useStorFormiSozdaniyaSessii();

const authStore = useAuthStore();
const { userId } = storeToRefs(authStore);

/** Те же права, что были у действий до рефакторинга. */
const mozhetUpravlyat = computed<boolean>(() => {
  return (
    props.item.unitSozdanSystemoi ||
    userId.value === props.item.authorId ||
    getUserRoleByProjectIdAndUserId.value(
      props.item.projectId,
      userId.value as string,
    ) === "ADMIN"
  );
});

/** Единый реестр команд: подпись и выполнение не дублируются в меню. */
const reestrKomand = computed<Partial<Record<UnitCommand, KnopkaKomandi>>>(() => {
  return sozdatReestrKomand(unitiStore, props.item.id);
});

const osnovnayaKnopka = computed<KnopkaKomandi | null>(() => {
  const command = props.state.primaryCommand;

  return command ? reestrKomand.value[command] ?? null : null;
});

/** Material-имена из реестра команд → Octicon (P6). */
const KARTA_IKONOK: Record<string, OcticonName> = {
  build: "tools",
  update: "sync",
  done_all: "check-circle",
  remove_done: "x-circle",
  play_arrow: "play",
  stop: "square",
  sync: "sync",
};

function perevodIkonki(icon: string): OcticonName {
  return KARTA_IKONOK[icon] ?? "gear";
}

function otkritOknoSZadachamiRunnera() {
  router.push({ name: "unit_jobs", params: { id: props.item.id } });
}

/** Диалог общий с модулем OpenCode: здесь достаточно открыть его с юнитом. */
function sozdatSessiyuSUnitom() {
  formaSessiiStore.otkrit([props.item.id]);
}
</script>

<template>
  <div v-if="mozhetUpravlyat" class="unit-actions">
    <GhButton
      v-if="osnovnayaKnopka"
      variant="primary"
      size="sm"
      :icon="perevodIkonki(osnovnayaKnopka.icon)"
      :label="$t(osnovnayaKnopka.labelKey)"
      :loading="getUnitLoader(item.id)"
      @click="osnovnayaKnopka.run()"
    />

    <GhButton
      variant="invisible"
      size="sm"
      icon="info"
      :label="$t('unit.spisok_unitov.card.buttons.jobs')"
      @click="otkritOknoSZadachamiRunnera"
    />

    <GhButton
      variant="invisible"
      size="sm"
      icon="comment-discussion"
      :label="$t('unit.spisok_unitov.card.buttons.session')"
      @click="sozdatSessiyuSUnitom"
    />
  </div>
</template>

<style scoped>
.unit-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
