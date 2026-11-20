<script setup lang="ts">
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";

defineProps<{
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
</script>

<template>
  <q-btn
      flat
      dense
      size="sm"
      icon="more_vert"
      :aria-label="$t('unit.spisok_proektov.card.buttons.more')"
  >
    <q-menu>
      <q-list dense style="min-width: 240px">
        <q-item clickable v-close-popup @click="emit('jobs')">
          <q-item-section avatar>
            <q-icon name="task_alt" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_proektov.card.buttons.jobs') }}</q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="emit('edit')">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_proektov.card.buttons.edit') }}</q-item-section>
        </q-item>

        <q-item v-if="neSobirali" clickable v-close-popup @click="emit('build')">
          <q-item-section avatar>
            <q-icon name="build" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_proektov.card.buttons.build') }}</q-item-section>
        </q-item>

        <q-item v-if="!item.isActive" clickable v-close-popup @click="emit('activate')">
          <q-item-section avatar>
            <q-icon name="done" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_proektov.card.buttons.activate') }}</q-item-section>
        </q-item>

        <q-item v-else clickable v-close-popup @click="emit('deactivate')">
          <q-item-section avatar>
            <q-icon name="remove_done" />
          </q-item-section>
          <q-item-section>{{ $t('unit.spisok_proektov.card.buttons.deactivate') }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item v-if="sloman" clickable v-close-popup @click="emit('removeManually')">
          <q-item-section avatar>
            <q-icon name="delete_forever" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('unit.spisok_proektov.card.buttons.delete_manually') }}
          </q-item-section>
        </q-item>

        <q-item v-else clickable v-close-popup @click="emit('remove')">
          <q-item-section avatar>
            <q-icon name="delete_forever" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('unit.spisok_proektov.card.buttons.delete') }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

    <q-tooltip>{{ $t('unit.spisok_proektov.card.buttons.more') }}</q-tooltip>
  </q-btn>
</template>
