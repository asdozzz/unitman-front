<script setup lang="ts">
import type {TomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/**
 * Строка тома из блока конфига `unitman_volumes`: карточка тома, выбор
 * zip-архива, бейджи архивов каталога проекта и действия с файлом.
 *
 * Компонент не работает с сервисами напрямую: загрузка, выбор архива
 * проекта и очистка выполняются стором формы, который владеет томом.
 *
 * Архив проекта (`volume.izProekta`) принадлежит проекту, поэтому его
 * нельзя удалить — только очистить поле. Черновик юнита удаляется.
 */
const props = defineProps<{
  volume: TomUnita
}>();

const emit = defineEmits<{
  zagruzit: [volume: TomUnita, file: File]
  udalit: [volume: TomUnita]
  vibrat: [volume: TomUnita, fileId: string]
  ochistit: [volume: TomUnita]
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

function ochistitFayl(): void {
  emit('ochistit', props.volume);
}

function vibratFaylProekta(fileId: string): void {
  if (props.volume.izProekta && props.volume.volume.fileId === fileId) {
    return;
  }

  emit('vibrat', props.volume, fileId);
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
            @update:model-value="faylVibran"
        >
          <template v-slot:prepend>
            <q-icon name="attach_file"/>
          </template>
        </q-file>
      </div>

      <div class="col-auto" v-if="props.volume.volume.fileId">
        <q-btn
            v-if="props.volume.izProekta"
            square
            flat
            color="primary"
            icon="clear"
            padding="10px"
            @click="ochistitFayl"
        >
          <q-tooltip>{{ $t('unit.form_volume.hints.clear_file') }}</q-tooltip>
        </q-btn>
        <q-btn
            v-else
            square
            flat
            color="negative"
            icon="delete"
            padding="10px"
            @click="udalitFayl"
        >
          <q-tooltip>{{ $t('unit.form_volume.hints.delete_file') }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="text-caption text-grey-7" v-if="props.volume.volume.fileId">
      {{ props.volume.izProekta
          ? $t('unit.form_volume.hints.project_file_selected')
          : $t('unit.form_volume.hints.file_attached') }}
    </div>

    <div v-if="props.volume.faylyProekta.length > 0" class="q-mt-xs">
      <div class="text-caption text-grey-7 q-mb-xs">{{ $t('unit.form_volume.hints.project_files') }}</div>
      <div class="row wrap">
        <q-chip
            v-for="file in props.volume.faylyProekta"
            :key="file.fileId"
            clickable
            dense
            square
            :color="props.volume.volume.fileId === file.fileId ? 'primary' : 'grey-4'"
            :text-color="props.volume.volume.fileId === file.fileId ? 'white' : 'dark'"
            :label="file.name"
            class="q-mr-xs q-mb-xs"
            @click="vibratFaylProekta(file.fileId)"
        >
          <q-tooltip>{{ file.name }}</q-tooltip>
        </q-chip>
      </div>
    </div>

    <div class="text-caption text-negative" v-if="props.volume.oshibka" v-html="props.volume.oshibka"></div>
  </div>
</template>

<style scoped>
</style>
