<script setup lang="ts">
import {computed} from "vue";
import {useRouter} from "vue-router";
import {storeToRefs} from "pinia";
import type {Deistviye, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {UnitCommand, UnitUiState} from "@/modules/unit/utils/unitStatus";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {useFormaZapolneniyaPeremenihUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import {useAuthStore} from "@/modules/account/store/auth";
import {useStorRedaktorovUnita} from "@/modules/unit/store/SpisokUnitov/StorRedaktorovUnita";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import {useStorFormiSozdaniyaSessii} from "@/modules/opencode/store/StorFormiSozdaniyaSessii";
import {
  POROZHDOK_KOMAND_ZHIZNENNOGO_CIKLA,
  sozdatReestrKomand,
  type KnopkaKomandi,
} from "@/modules/unit/utils/unitCommands";

const props = defineProps<{
  item: Unit;
  state: UnitUiState;
  isAdmin: boolean;
  canRemove: boolean;
}>();

const emit = defineEmits<{
  markBroken: [];
  rebuild: [];
  remove: [];
}>();

const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const {getUserRoleByProjectIdAndUserId, spisokDeistvii} = storeToRefs(unitiStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const storFormaDeistviy = storFormiDeistviyUnita();
const formaSessiiStore = useStorFormiSozdaniyaSessii();
const storRedaktorov = useStorRedaktorovUnita();

const authStore = useAuthStore();
const {userId} = storeToRefs(authStore);

/** Те же права, что были у действий карточки до рефакторинга. */
const mozhetUpravlyat = computed<boolean>(() => {
  return props.item.unitSozdanSystemoi
      || userId.value === props.item.authorId
      || getUserRoleByProjectIdAndUserId.value(props.item.projectId, userId.value as string) === "ADMIN";
});

/** Пункт «Редакторы» виден автору/админу и всем, у кого вычислен режим редактора. */
const vidniRedaktory = computed<boolean>(() => {
  return mozhetUpravlyat.value
      || props.isAdmin
      || (props.item.redaktorMode ?? null) !== null;
});

/** Единый реестр команд для меню и строки действий. */
const reestrKomand = computed<Partial<Record<UnitCommand, KnopkaKomandi>>>(() => {
  return sozdatReestrKomand(unitiStore, props.item.id);
});

type ZapisKomandi = {
  command: UnitCommand;
  knopka: KnopkaKomandi;
};

function zapisiKomand(commands: UnitCommand[]): ZapisKomandi[] {
  const zapisi: ZapisKomandi[] = [];

  POROZHDOK_KOMAND_ZHIZNENNOGO_CIKLA.forEach((command: UnitCommand) => {
    if (!commands.includes(command)) {
      return;
    }

    const knopka = reestrKomand.value[command];

    if (knopka) {
      zapisi.push({command, knopka});
    }
  });

  return zapisi;
}

const komandiZhiznennogoCikla = computed<ZapisKomandi[]>(() => {
  if (!mozhetUpravlyat.value) {
    return [];
  }

  const dostupnie = props.state.menuCommands.filter((command: UnitCommand) => {
    return command !== "proveritKonteinerUnita" || props.isAdmin;
  });

  return zapisiKomand(dostupnie);
});

const deistviyaSpiska = computed<Deistviye[]>(() => {
  if (!mozhetUpravlyat.value) {
    return [];
  }

  if (!props.item.commands.includes("vipolnitDeistvie")) {
    return [];
  }

  return spisokDeistvii.value(props.item);
});

const mozhnoZapolnit = computed<boolean>(() => {
  return mozhetUpravlyat.value
      && (props.item.commands.includes("zapolnitPeremenie") || props.state.canOpenLinks);
});

const estMeni = computed<boolean>(() => {
  return komandiZhiznennogoCikla.value.length > 0
      || deistviyaSpiska.value.length > 0
      || mozhnoZapolnit.value
      || props.item.redaktorLink !== null
      || vidniRedaktory.value
      || props.isAdmin
      || props.canRemove;
});

function otkritKonfig() {
  konfigFormStore.otkritFormu(props.item.id, props.item.projectId);
}

/** Открывает диалог редакторов текущего юнита. */
function otkritRedaktorov() {
  void storRedaktorov.otkrytDlya(props.item);
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
  <q-btn
      v-if="estMeni"
      flat
      dense
      size="sm"
      icon="more_vert"
      :aria-label="$t('unit.spisok_unitov.card.buttons.more')"
  >
    <q-menu>
      <q-list dense style="min-width: 240px">
        <template v-if="komandiZhiznennogoCikla.length > 0">
          <q-item-label header>
            {{ $t('unit.spisok_unitov.card.menu.lifecycle') }}
          </q-item-label>

          <q-item
              v-for="zapis in komandiZhiznennogoCikla"
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
        </template>

        <template v-if="deistviyaSpiska.length > 0">
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

        <q-item-label header>
          {{ $t('unit.spisok_unitov.card.menu.more') }}
        </q-item-label>

        <q-item v-if="mozhnoZapolnit" clickable v-close-popup @click="otkritKonfig">
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.set_config') }}</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="otkritOknoSZadachamiRunnera">
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.jobs') }}</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="sozdatSessiyuSUnitom">
          <q-item-section avatar>
            <q-icon name="forum" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.create_session') }}</q-item-section>
        </q-item>

        <q-item v-if="vidniRedaktory" clickable v-close-popup @click="otkritRedaktorov">
          <q-item-section avatar>
            <q-icon name="edit_note" />
          </q-item-section>
          <q-item-section>{{ $t('unit.redaktor.dialog.title') }}</q-item-section>
        </q-item>

        <q-item
            v-if="item.redaktorLink"
            tag="a"
            :href="item.redaktorLink"
            target="_blank"
            rel="noopener noreferrer"
            clickable
            v-close-popup
        >
          <q-item-section avatar>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.open_editor') }}</q-item-section>
        </q-item>

        <template v-if="isAdmin">
          <q-item-label header>
            {{ $t('unit.spisok_unitov.card.menu.admin') }}
          </q-item-label>

          <q-item clickable v-close-popup @click="emit('rebuild')">
            <q-item-section avatar>
              <q-icon name="restore" />
            </q-item-section>
            <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.rebuild') }}</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="emit('markBroken')">
            <q-item-section avatar>
              <q-icon name="report" />
            </q-item-section>
            <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.mark_broken') }}</q-item-section>
          </q-item>
        </template>

        <template v-if="canRemove">
          <q-separator />

          <q-item clickable v-close-popup @click="emit('remove')">
            <q-item-section avatar>
              <q-icon name="delete_forever" color="negative" />
            </q-item-section>
            <q-item-section class="text-negative">
              {{ $t('unit.spisok_unitov.card.buttons.delete') }}
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-menu>

    <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.more') }}</q-tooltip>
  </q-btn>
</template>
