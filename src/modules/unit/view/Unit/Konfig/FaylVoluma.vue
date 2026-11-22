<script setup lang="ts">
import type { TomUnita } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { GhBanner, GhButton, GhIcon, GhLabel } from "@/components/ui";

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
  volume: TomUnita;
}>();

const emit = defineEmits<{
  zagruzit: [volume: TomUnita, file: File];
  udalit: [volume: TomUnita];
  vibrat: [volume: TomUnita, fileId: string];
  ochistit: [volume: TomUnita];
}>();

function faylVibran(file: File | File[] | null): void {
  const vibran = Array.isArray(file) ? file[0] : file;

  if (!vibran) {
    return;
  }

  emit("zagruzit", props.volume, vibran);
}

function udalitFayl(): void {
  emit("udalit", props.volume);
}

function ochistitFayl(): void {
  emit("ochistit", props.volume);
}

function vibratFaylProekta(fileId: string): void {
  if (props.volume.izProekta && props.volume.volume.fileId === fileId) {
    return;
  }

  emit("vibrat", props.volume, fileId);
}
</script>

<template>
  <div class="volume-row">
    <div class="volume-row__head">
      <span class="volume-row__name">{{ volume.volume.name }}</span>
      <span class="volume-row__dir gh-mono">{{ volume.volume.dir }}</span>
    </div>

    <div class="volume-row__upload">
      <q-file
        class="volume-row__file"
        :model-value="null"
        :label="$t('unit.form_volume.fields.labels.file')"
        :loading="volume.zagruzka"
        accept=".zip,application/zip"
        outlined
        dense
        @update:model-value="faylVibran"
      >
        <template #prepend>
          <GhIcon name="paperclip" class="volume-row__icon" />
        </template>
      </q-file>

      <GhButton
        v-if="volume.volume.fileId"
        :variant="volume.izProekta ? 'default' : 'danger'"
        size="sm"
        :icon="volume.izProekta ? 'x' : 'trash'"
        :aria-label="
          volume.izProekta
            ? $t('unit.form_volume.hints.clear_file')
            : $t('unit.form_volume.hints.delete_file')
        "
        @click="volume.izProekta ? ochistitFayl() : udalitFayl()"
      >
        <q-tooltip>
          {{
            volume.izProekta
              ? $t("unit.form_volume.hints.clear_file")
              : $t("unit.form_volume.hints.delete_file")
          }}
        </q-tooltip>
      </GhButton>
    </div>

    <p v-if="volume.volume.fileId" class="volume-row__hint">
      {{
        volume.izProekta
          ? $t("unit.form_volume.hints.project_file_selected")
          : $t("unit.form_volume.hints.file_attached")
      }}
    </p>

    <div v-if="volume.faylyProekta.length > 0" class="volume-row__project-files">
      <p class="volume-row__hint">{{ $t("unit.form_volume.hints.project_files") }}</p>

      <div class="volume-row__chips">
        <button
          v-for="file in volume.faylyProekta"
          :key="file.fileId"
          type="button"
          class="volume-row__chip"
          :class="{ 'volume-row__chip--selected': volume.volume.fileId === file.fileId }"
          :aria-pressed="volume.volume.fileId === file.fileId ? 'true' : 'false'"
          @click="vibratFaylProekta(file.fileId)"
        >
          <GhLabel variant="neutral">{{ file.name }}</GhLabel>
          <q-tooltip>{{ file.name }}</q-tooltip>
        </button>
      </div>
    </div>

    <GhBanner v-if="volume.oshibka" variant="danger">
      {{ volume.oshibka }}
    </GhBanner>
  </div>
</template>

<style scoped>
.volume-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--borderColor-muted);
}

.volume-row__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.volume-row__name {
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
}

.volume-row__dir {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.volume-row__upload {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-row__file {
  flex: 1 1 auto;
  min-width: 0;
}

.volume-row__icon {
  color: var(--fgColor-muted);
}

.volume-row__hint {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.volume-row__project-files {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.volume-row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.volume-row__chip {
  padding: 0;
  border: 0;
  border-radius: var(--borderRadius-full);
  background: transparent;
  cursor: pointer;
}

.volume-row__chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.volume-row__chip--selected {
  box-shadow: 0 0 0 2px var(--fgColor-accent);
  border-radius: var(--borderRadius-full);
}
</style>
