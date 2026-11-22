<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { GhActionMenu } from "@/components/ui";
import type { GhActionMenuItem } from "@/components/ui";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

const emit = defineEmits<{
  block: [];
  unblock: [];
}>();

const { t } = useI18n();
const router = useRouter();

/** Действия карточки: редактирование и обратимая блокировка. */
const items = computed<GhActionMenuItem[]>(() => {
  const spisok: GhActionMenuItem[] = [
    {
      id: "edit",
      label: t("account.spisok.card.buttons.edit"),
      icon: "pencil",
    },
  ];

  if (props.item.isBlocked) {
    spisok.push({
      id: "unblock",
      label: t("account.spisok.card.buttons.unblock"),
      icon: "eye",
      separatorBefore: true,
    });
  } else {
    spisok.push({
      id: "block",
      label: t("account.spisok.card.buttons.block"),
      icon: "eye-closed",
      danger: true,
      separatorBefore: true,
    });
  }

  return spisok;
});

/** Переход на страницу редактирования аккаунта. */
function redaktirovat(): void {
  void router.push({ name: "account_edit", params: { id: props.item.id } });
}

function vybrat(item: GhActionMenuItem): void {
  if (item.id === "edit") {
    redaktirovat();
    return;
  }

  if (item.id === "block") {
    emit("block");
    return;
  }

  if (item.id === "unblock") {
    emit("unblock");
  }
}
</script>

<template>
  <GhActionMenu
    :items="items"
    :aria-label="t('account.spisok.card.buttons.more')"
    @select="vybrat"
  />
</template>
