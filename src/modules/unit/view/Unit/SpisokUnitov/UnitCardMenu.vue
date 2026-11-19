<script setup lang="ts">
defineProps<{
  isAdmin: boolean;
  canRemove: boolean;
}>();

const emit = defineEmits<{
  markBroken: [];
  rebuild: [];
  remove: [];
}>();
</script>

<template>
  <q-btn
      v-if="isAdmin || canRemove"
      flat
      round
      dense
      size="sm"
      icon="more_vert"
      :aria-label="$t('unit.spisok_unitov.card.buttons.more')"
  >
    <q-menu>
      <q-list dense style="min-width: 230px">
        <q-item v-if="isAdmin" clickable v-close-popup @click="emit('rebuild')">
          <q-item-section avatar>
            <q-icon name="restore" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.rebuild') }}</q-item-section>
        </q-item>

        <q-item v-if="isAdmin" clickable v-close-popup @click="emit('markBroken')">
          <q-item-section avatar>
            <q-icon name="report" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_unitov.card.buttons.mark_broken') }}</q-item-section>
        </q-item>

        <q-separator v-if="isAdmin && canRemove" />

        <q-item v-if="canRemove" clickable v-close-popup @click="emit('remove')">
          <q-item-section avatar>
            <q-icon name="delete_forever" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('unit.spisok_unitov.card.buttons.delete') }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.more') }}</q-tooltip>
  </q-btn>
</template>
