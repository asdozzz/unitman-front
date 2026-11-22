<script setup lang="ts">
import {computed} from "vue";
import {useI18n} from "vue-i18n";
import {GhActionMenu} from "@/components/ui";
import type {GhActionMenuItem} from "@/components/ui";
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";

const props = defineProps<{
  item: Proekt;
  /** Состояние NEW/BUILD_ERROR — проект ещё ни разу не собирали. */
  neSobirali: boolean;
  /** Состояние REMOVE_ERROR — обычное удаление недоступно. */
  sloman: boolean;
}>();

const emit = defineEmits<{
  jobs: [];
  edit: [];
  build: [];
  activate: [];
  deactivate: [];
  remove: [];
  removeManually: [];
}>();

const {t} = useI18n();

const punktyMenu = computed<GhActionMenuItem[]>(() => {
  const punkty: GhActionMenuItem[] = [
    {id: "jobs", label: t("unit.spisok_proektov.card.buttons.jobs"), icon: "tasklist"},
    {id: "edit", label: t("unit.spisok_proektov.card.buttons.edit"), icon: "pencil"},
  ];

  if (props.neSobirali) {
    punkty.push({id: "build", label: t("unit.spisok_proektov.card.buttons.build"), icon: "tools"});
  }

  if (!props.item.isActive) {
    punkty.push({id: "activate", label: t("unit.spisok_proektov.card.buttons.activate"), icon: "check"});
  } else {
    punkty.push({id: "deactivate", label: t("unit.spisok_proektov.card.buttons.deactivate"), icon: "x"});
  }

  if (props.sloman) {
    punkty.push({
      id: "remove-manually",
      label: t("unit.spisok_proektov.card.buttons.delete_manually"),
      icon: "trash",
      danger: true,
      separatorBefore: true,
    });
  } else {
    punkty.push({
      id: "remove",
      label: t("unit.spisok_proektov.card.buttons.delete"),
      icon: "trash",
      danger: true,
      separatorBefore: true,
    });
  }

  return punkty;
});

function vybratDeistvie(item: GhActionMenuItem): void {
  switch (item.id) {
    case "jobs":
      emit("jobs");
      return;
    case "edit":
      emit("edit");
      return;
    case "build":
      emit("build");
      return;
    case "activate":
      emit("activate");
      return;
    case "deactivate":
      emit("deactivate");
      return;
    case "remove-manually":
      emit("removeManually");
      return;
    case "remove":
      emit("remove");
      return;
  }
}
</script>

<template>
  <GhActionMenu
      :items="punktyMenu"
      :aria-label="$t('unit.spisok_proektov.card.buttons.more')"
      @select="vybratDeistvie"
  />
</template>
