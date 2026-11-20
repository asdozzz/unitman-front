<script setup lang="ts">
import {useRouter} from "vue-router";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

const emit = defineEmits<{
  block: [];
  unblock: [];
}>();

const router = useRouter();

/** Переход на страницу редактирования аккаунта. */
function redaktirovat() {
  void router.push({name: "account_edit", params: {id: props.item.id}});
}
</script>

<template>
  <q-btn
      flat
      dense
      size="sm"
      icon="more_vert"
      :aria-label="$t('account.spisok.card.buttons.more')"
  >
    <q-menu>
      <q-list dense style="min-width: 220px">
        <q-item clickable v-close-popup @click="redaktirovat">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>{{ $t('account.spisok.card.buttons.edit') }}</q-item-section>
        </q-item>

        <q-item
            v-if="!item.isBlocked"
            clickable
            v-close-popup
            @click="emit('block')"
        >
          <q-item-section avatar>
            <q-icon name="visibility_off" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('account.spisok.card.buttons.block') }}
          </q-item-section>
        </q-item>

        <q-item
            v-else
            clickable
            v-close-popup
            @click="emit('unblock')"
        >
          <q-item-section avatar>
            <q-icon name="visibility" color="positive" />
          </q-item-section>
          <q-item-section>{{ $t('account.spisok.card.buttons.unblock') }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <q-tooltip>{{ $t('account.spisok.card.buttons.more') }}</q-tooltip>
  </q-btn>
</template>
