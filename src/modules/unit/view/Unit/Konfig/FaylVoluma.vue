<script setup lang="ts">
import type {TomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/**
 * Строка тома из блока конфига `unitman_volumes`: карточка тома и выбор
 * zip-архива, который будет привязан к юниту.
 *
 * Компонент не работает с сервисами напрямую: загрузка и удаление файла
 * выполняются стором формы, который владеет состоянием тома.
 */
const props = defineProps<{
  volume: TomUnita
}>();

const emit = defineEmits<{
  zagruzit: [volume: TomUnita, file: File]
  udalit: [volume: TomUnita]
}>();

function faylVibran(file: File | null): void {
  if (!file) {
    return;
  }

  emit('zagruzit', props.volume, file);
}

function udalitFayl(): void {
  emit('udalit', props.volume);
}
</script>

<template>
  <div class="volume-row q-mb-sm">
    <div class="text-subtitle2">
      {{ props.volume.volume.name }}
      <span class="text-grey-7">({{ props.volume.volume.dir }})</span>
    </div>

    <div class="row no-wrap items-center q-col-gutter-sm">
      <div class="col">
        <q-file
            :model-value="null"
            :label="$t('unit.form_volume.fields.labels.file')"
            :loading="props.volume.zagruzka"
            accept=".zip,application/zip"
            outlined
            dense
            clearable
            @update:model-value="faylVibran"
        >
          <template v-slot:prepend>
            <q-icon name="attach_file"/>
          </template>
        </q-file>
      </div>

      <div class="col-auto" v-if="props.volume.volume.fileId">
        <q-btn square flat color="negative" icon="delete" padding="10px" @click="udalitFayl">
          <q-tooltip>{{ $t('unit.form_volume.hints.delete_file') }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="text-caption text-grey-7" v-if="props.volume.volume.fileId">
      {{ $t('unit.form_volume.hints.file_attached') }}
    </div>
    <div class="text-caption text-negative" v-if="props.volume.oshibka" v-html="props.volume.oshibka"></div>
  </div>
</template>

<style scoped>
</style>
