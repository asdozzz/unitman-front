<script setup lang="ts">
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

/** «Редактировать» открывает общий диалог формы редактирования. */
function otkritRedaktirovanie() {
  editFormStore.otkritFormu(new EditForm(props.item.id, props.item.token));
}
</script>

<template>
  <q-btn
      flat
      dense
      size="sm"
      icon="more_vert"
      :aria-label="$t('unit.spisok_rep.card.buttons.more')"
  >
    <q-menu>
      <q-list dense style="min-width: 240px">
        <q-item clickable v-close-popup @click="otkritRedaktirovanie">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_rep.card.buttons.edit') }}</q-item-section>
        </q-item>

        <q-item
            v-if="!item.confirmed"
            clickable
            v-close-popup
            @click="emit('confirm')"
        >
          <q-item-section avatar>
            <q-icon name="verified" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_rep.card.buttons.confirm') }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-close-popup @click="emit('remove')">
          <q-item-section avatar>
            <q-icon name="delete_forever" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('unit.spisok_rep.card.buttons.delete') }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <q-tooltip>{{ $t('unit.spisok_rep.card.buttons.more') }}</q-tooltip>
  </q-btn>
</template>
