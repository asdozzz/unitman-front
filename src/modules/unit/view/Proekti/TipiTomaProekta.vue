<script setup lang="ts">
import {onMounted} from "vue";
import {storeToRefs} from "pinia";
import {useRoute} from "vue-router";
import {useTipiTomaProektaStore} from "@/modules/unit/store/SpisokProektov/TipiTomaProektaStore";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhFormField,
  GhIcon,
  GhInput,
  GhSkeleton,
} from "@/components/ui";

/**
 * Каталог типов томов проекта: добавление/удаление типов и прикрепление
 * к ним zip-архивов проекта.
 *
 * Тип нельзя удалить, пока к нему привязан хотя бы один архив — бэкенд
 * вернёт ошибку, которую стор показывает пользователю.
 */
const tipiTomaStore = useTipiTomaProektaStore();
const {
  spisok,
  form,
  loaderSpiska,
  loaderDobavleniya,
  loaderUdaleniya,
  zagruzkaFaylaDlya,
  udalenieFaylaDlya,
  oshibkaSpiska,
  oshibkaFormi,
} = storeToRefs(tipiTomaStore);

const route = useRoute();

onMounted(async () => {
  tipiTomaStore.pokazatSpisok(route.params.id as string);
  await tipiTomaStore.poluchitSpisok();
});

function faylyVibrani(code: string, files: File[] | null): void {
  if (!files || files.length === 0) {
    return;
  }

  tipiTomaStore.zagruzitFayly(code, files);
}

function razmerFayla(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="volume-types">
    <form @submit.prevent="tipiTomaStore.dobavitTip()">
      <GhBox padding="md">
        <template #header>
          {{ $t('unit.tipi_toma.title') }}
        </template>

        <div class="volume-types__form">
          <GhFormField :label="$t('unit.tipi_toma.fields.labels.code')">
            <GhInput v-model="form.code" />
          </GhFormField>

          <GhFormField :label="$t('unit.tipi_toma.fields.labels.name')">
            <GhInput v-model="form.name" />
          </GhFormField>
        </div>

        <GhBanner v-if="oshibkaFormi" variant="danger" class="volume-types__error">
          {{ oshibkaFormi }}
        </GhBanner>

        <template #footer>
          <GhButton
              type="submit"
              variant="primary"
              icon="plus"
              :label="$t('unit.tipi_toma.buttons.add')"
              :loading="loaderDobavleniya"
              :disabled="!form.code || !form.name"
          />
        </template>
      </GhBox>
    </form>

    <GhBanner
        v-if="oshibkaSpiska"
        variant="danger"
        :title="$t('common.states.error')"
        class="volume-types__gap"
    >
      {{ oshibkaSpiska }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="tipiTomaStore.poluchitSpisok()"
        />
      </template>
    </GhBanner>

    <GhBox v-else-if="loaderSpiska" padding="md" aria-busy="true" class="volume-types__gap">
      <div class="volume-types__skeleton">
        <GhSkeleton variant="text" width="50%" height="14" />
        <GhSkeleton variant="text" width="70%" height="12" />
      </div>
    </GhBox>

    <GhBox v-else-if="spisok.length === 0" padding="none" class="volume-types__gap">
      <GhEmptyState icon="database" :title="$t('unit.tipi_toma.list.empty_result')" />
    </GhBox>

    <template v-else>
      <GhBox v-for="tip in spisok" :key="tip.code" padding="md" class="volume-types__gap">
        <template #header>
          <GhIcon name="database" :size="14" />
          <span class="volume-types__name">{{ tip.name }}</span>
          <span class="volume-types__code gh-mono">({{ tip.code }})</span>
          <span class="volume-types__spacer" />
          <GhButton
              v-if="tip.files.length === 0"
              variant="invisible"
              icon="trash"
              :aria-label="$t('unit.tipi_toma.hints.delete_type')"
              :title="$t('unit.tipi_toma.hints.delete_type')"
              :loading="loaderUdaleniya"
              @click="tipiTomaStore.udalitTip(tip.code)"
          />
          <GhButton
              v-else
              variant="invisible"
              icon="trash"
              :aria-label="$t('unit.tipi_toma.hints.delete_type_forbidden')"
              :title="$t('unit.tipi_toma.hints.delete_type_forbidden')"
              disabled
          />
        </template>

        <div class="volume-types__upload">
          <q-file
              :model-value="null"
              class="volume-types__file"
              multiple
              :label="$t('unit.tipi_toma.fields.labels.files')"
              :loading="zagruzkaFaylaDlya === tip.code"
              accept=".zip,application/zip"
              outlined
              dense
              clearable
              @update:model-value="(files) => faylyVibrani(tip.code, files as File[] | null)"
          >
            <template #prepend>
              <GhIcon name="paperclip" />
            </template>
          </q-file>
        </div>

        <ul v-if="tip.files.length > 0" class="volume-types__files">
          <li v-for="file in tip.files" :key="file.fileId" class="volume-types__file-row">
            <GhIcon name="file-zip" :size="14" class="volume-types__file-icon" />
            <span class="volume-types__file-name">{{ file.name }}</span>
            <span class="volume-types__file-size gh-mono">{{ razmerFayla(file.size) }}</span>
            <GhButton
                variant="invisible"
                size="sm"
                icon="x"
                :aria-label="$t('unit.tipi_toma.hints.delete_file')"
                :title="$t('unit.tipi_toma.hints.delete_file')"
                :loading="udalenieFaylaDlya === tip.code"
                @click="tipiTomaStore.udalitFayl(tip.code, file.fileId)"
            />
          </li>
        </ul>

        <p v-else class="volume-types__no-files">{{ $t('unit.tipi_toma.list.no_files') }}</p>
      </GhBox>
    </template>
  </div>
</template>

<style scoped>
.volume-types {
  display: flex;
  flex-direction: column;
  max-width: 820px;
}

.volume-types__form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

@media (max-width: 767.98px) {
  .volume-types__form {
    flex-direction: column;
    align-items: stretch;
  }
}

.volume-types__gap {
  margin-top: 16px;
}

.volume-types__error {
  margin-top: 12px;
}

.volume-types__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.volume-types__name {
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
}

.volume-types__code {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.volume-types__spacer {
  flex: 1 1 auto;
}

.volume-types__upload {
  margin-bottom: 12px;
}

.volume-types__files {
  margin: 0;
  padding: 0;
  list-style: none;
}

.volume-types__file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
}

.volume-types__file-icon {
  color: var(--fgColor-muted);
}

.volume-types__file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.volume-types__file-size {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.volume-types__no-files {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
