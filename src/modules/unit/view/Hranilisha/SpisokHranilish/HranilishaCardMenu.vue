<script setup lang="ts">
import {computed} from "vue";
import {useI18n} from "vue-i18n";
import {GhActionMenu} from "@/components/ui";
import type {GhActionMenuItem} from "@/components/ui";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import {useEditFormStore, EditForm} from "@/modules/unit/store/SpisokHranilish/EditFormStore";

const props = defineProps<{
  item: Hranilishe;
}>();

const emit = defineEmits<{
  confirm: [];
  remove: [];
}>();

const editFormStore = useEditFormStore();
const {t} = useI18n();

/**
 * «Редактировать» открывает общий диалог формы редактирования.
 *
 * В форму передаётся только id: API больше не возвращает сам токен, а поле
 * ввода предназначено исключительно для НОВОГО значения.
 */
function otkritRedaktirovanie() {
  editFormStore.otkritFormu(new EditForm(props.item.id));
}

const punktyMenu = computed<GhActionMenuItem[]>(() => {
  const punkty: GhActionMenuItem[] = [
    {id: "edit", label: t("unit.spisok_rep.card.buttons.edit"), icon: "pencil"},
  ];

  if (!props.item.confirmed) {
    punkty.push({id: "confirm", label: t("unit.spisok_rep.card.buttons.confirm"), icon: "verified"});
  }

  punkty.push({
    id: "remove",
    label: t("unit.spisok_rep.card.buttons.delete"),
    icon: "trash",
    danger: true,
    separatorBefore: true,
  });

  return punkty;
});

function vybratDeistvie(item: GhActionMenuItem): void {
  switch (item.id) {
    case "edit":
      otkritRedaktirovanie();
      return;
    case "confirm":
      emit("confirm");
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
      :aria-label="$t('unit.spisok_rep.card.buttons.more')"
      @select="vybratDeistvie"
  />
</template>
