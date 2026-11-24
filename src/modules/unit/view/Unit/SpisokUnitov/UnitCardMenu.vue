<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import type { Deistviye, Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type { UnitCommand, UnitUiState } from "@/modules/unit/utils/unitStatus";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
import { useFormaZapolneniyaPeremenihUnitaStore } from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import { useAuthStore } from "@/modules/account/store/auth";
import { useStorRedaktorovUnita } from "@/modules/unit/store/SpisokUnitov/StorRedaktorovUnita";
import { storFormiDeistviyUnita } from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import { useStorDeistviySessiiUnita } from "@/modules/opencode/store/StorDeistviySessiiUnita";
import { GhActionMenu } from "@/components/ui";
import type { GhActionMenuItem, OcticonName } from "@/components/ui";
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

const { t } = useI18n();
const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const { getUserRoleByProjectIdAndUserId, spisokDeistvii } = storeToRefs(unitiStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const storFormaDeistviy = storFormiDeistviyUnita();
const storDeistviySessii = useStorDeistviySessiiUnita();
const storRedaktorov = useStorRedaktorovUnita();

const authStore = useAuthStore();
const { userId } = storeToRefs(authStore);

/** Автор и прикреплённые редакторы имеют доступ к unit-сессии. */
const estRedaktor = computed<boolean>(() => {
  const tekushiy = userId.value ?? "";

  return tekushiy !== ""
    && (props.item.authorId === tekushiy || (props.item.redaktory ?? []).includes(tekushiy));
});

/** Те же права, что были у действий карточки до рефакторинга. */
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

/** Пункт «Редакторы» виден автору/админу и всем, у кого вычислен режим редактора. */
const vidniRedaktory = computed<boolean>(() => {
  return (
    mozhetUpravlyat.value ||
    props.isAdmin ||
    (props.item.redaktorMode ?? null) !== null
  );
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
      zapisi.push({ command, knopka });
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
  return (
    mozhetUpravlyat.value &&
    (props.item.commands.includes("zapolnitPeremenie") || props.state.canOpenLinks)
  );
});

const estMeni = computed<boolean>(() => {
  return (
    komandiZhiznennogoCikla.value.length > 0 ||
    deistviyaSpiska.value.length > 0 ||
    mozhnoZapolnit.value ||
    props.item.redaktorLink !== null ||
    vidniRedaktory.value ||
    estRedaktor.value ||
    props.isAdmin ||
    props.canRemove
  );
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

type Menyu = {
  items: GhActionMenuItem[];
  deistviya: Record<string, () => void>;
};

/** Плоский список GhActionMenu: пункты + соответствующие обработчики. */
const menyu = computed<Menyu>(() => {
  const items: GhActionMenuItem[] = [];
  const deistviya: Record<string, () => void> = {};

  const dobavit = (
    id: string,
    label: string,
    icon: OcticonName | undefined,
    run: () => void,
    separatorBefore = false,
    danger = false,
  ): void => {
    items.push({ id, label, icon, separatorBefore, danger });
    deistviya[id] = run;
  };

  komandiZhiznennogoCikla.value.forEach((zapis: ZapisKomandi, index: number) => {
    dobavit(
      `cmd:${zapis.command}`,
      t(zapis.knopka.labelKey),
      perevodIkonki(zapis.knopka.icon),
      () => zapis.knopka.run(),
      index === 0 && items.length > 0,
    );
  });

  deistviyaSpiska.value.forEach((deistvie: Deistviye) => {
    dobavit(
      `action:${deistvie.id}`,
      deistvie.name,
      "zap",
      () => pokazatFormuDeistviya(deistvie),
      items.length > 0,
    );
  });

  if (mozhnoZapolnit.value) {
    dobavit(
      "config",
      t("unit.spisok_unitov.card.buttons.set_config"),
      "gear",
      otkritKonfig,
      items.length > 0,
    );
  }

  dobavit(
    "jobs",
    t("unit.spisok_unitov.card.buttons.jobs"),
    "info",
    otkritOknoSZadachamiRunnera,
    items.length > 0,
  );

  if (estRedaktor.value) {
    dobavit(
      "session",
      t("unit.spisok_unitov.card.buttons.session"),
      "comment-discussion",
      sozdatSessiyuSUnitom,
      false,
    );
  }

  if (vidniRedaktory.value) {
    dobavit(
      "editors",
      t("unit.redaktor.dialog.title"),
      "pencil",
      otkritRedaktorov,
      false,
    );
  }

  if (props.item.redaktorLink) {
    dobavit(
      "open-editor",
      t("unit.spisok_unitov.card.buttons.open_editor"),
      "code",
      () => {
        // IDE стартует по требованию. Открываем внутреннюю страницу, она
        // запросит ссылку редактора и только потом перейдёт на IDE.
        const target = router.resolve({
          name: "unit_redaktor",
          params: { id: props.item.id },
        });
        window.open(target.href, "_blank", "noopener,noreferrer");
      },
      false,
    );
  }

  if (props.isAdmin) {
    dobavit(
      "rebuild",
      t("unit.spisok_unitov.card.buttons.rebuild"),
      "sync",
      () => emit("rebuild"),
      true,
    );
    dobavit(
      "mark-broken",
      t("unit.spisok_unitov.card.buttons.mark_broken"),
      "alert",
      () => emit("markBroken"),
    );
  }

  if (props.canRemove) {
    dobavit(
      "remove",
      t("unit.spisok_unitov.card.buttons.delete"),
      "trash",
      () => emit("remove"),
      true,
      true,
    );
  }

  return { items, deistviya };
});

function vybrat(item: GhActionMenuItem): void {
  menyu.value.deistviya[item.id]?.();
}

function otkritKonfig() {
  konfigFormStore.otkritFormu(props.item.id, props.item.projectId);
}

/** Открывает диалог редакторов текущего юнита. */
function otkritRedaktorov() {
  void storRedaktorov.otkrytDlya(props.item);
}

function otkritOknoSZadachamiRunnera() {
  router.push({ name: "unit_jobs", params: { id: props.item.id } });
}

/** Открывает существующую сессию в новом окне либо форму создания. */
function sozdatSessiyuSUnitom() {
  void storDeistviySessii.otkritIliSozdat({
    unitId: props.item.id,
    unitLabel: props.item.name,
    unitDescription: `${props.item.projectName} · ${props.item.branch}`,
  });
}

function pokazatFormuDeistviya(deistvie: Deistviye) {
  storFormaDeistviy.otkritFormu(props.item.id, deistvie);
}
</script>

<template>
  <GhActionMenu
    v-if="estMeni"
    :items="menyu.items"
    :aria-label="$t('unit.spisok_unitov.card.buttons.more')"
    @select="vybrat"
  />
</template>
