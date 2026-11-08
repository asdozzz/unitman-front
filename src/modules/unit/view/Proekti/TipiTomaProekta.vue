<script setup lang="ts">
import {onMounted} from "vue";
import {storeToRefs} from "pinia";
import {useRoute} from "vue-router";
import {useTipiTomaProektaStore} from "@/modules/unit/store/SpisokProektov/TipiTomaProektaStore";

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
  <q-card style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-subtitle1 q-mb-sm">{{ $t('unit.tipi_toma.title') }}</div>
      <div class="row q-mb-sm">
        <div class="col-4 q-pr-sm">
          <q-input
              v-model="form.code"
              standout
              dense
              square
              outlined
              :label="$t('unit.tipi_toma.fields.labels.code')"
          />
        </div>
        <div class="col-5 q-pr-sm">
          <q-input
              v-model="form.name"
              standout
              dense
              square
              outlined
              :label="$t('unit.tipi_toma.fields.labels.name')"
          />
        </div>
        <div class="col-auto">
          <q-btn
              color="primary"
              :label="$t('unit.tipi_toma.buttons.add')"
              :loading="loaderDobavleniya"
              :disable="!form.code || !form.name"
              @click="tipiTomaStore.dobavitTip()"
          />
        </div>
      </div>
      <div class="text-negative" v-if="oshibkaFormi" v-html="oshibkaFormi"></div>
    </q-card-section>
  </q-card>

  <q-spinner-cube v-if="loaderSpiska" color="primary" size="2em"/>
  <div class="text-negative" v-else-if="oshibkaSpiska" v-html="oshibkaSpiska"></div>
  <template v-else>
    <div v-if="spisok.length === 0" class="q-mt-sm">{{ $t('unit.tipi_toma.list.empty_result') }}</div>
    <q-card v-for="tip in spisok" :key="tip.code" class="q-mt-sm" style="width: 700px; max-width: 80vw;">
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="col">
            <span class="text-subtitle2">{{ tip.name }}</span>
            <span class="text-grey-7 q-pl-sm">({{ tip.code }})</span>
          </div>
          <div class="col-auto">
            <q-btn
                square
                flat
                color="negative"
                icon="delete"
                padding="5px 6px"
                :loading="loaderUdaleniya"
                :disable="tip.files.length > 0"
                @click="tipiTomaStore.udalitTip(tip.code)"
            >
              <q-tooltip>
                {{ tip.files.length > 0
                    ? $t('unit.tipi_toma.hints.delete_type_forbidden')
                    : $t('unit.tipi_toma.hints.delete_type') }}
              </q-tooltip>
            </q-btn>
          </div>
        </div>

        <div class="row q-mt-sm">
          <div class="col">
            <q-file
                :model-value="null"
                multiple
                :label="$t('unit.tipi_toma.fields.labels.files')"
                :loading="zagruzkaFaylaDlya === tip.code"
                accept=".zip,application/zip"
                outlined
                dense
                clearable
                @update:model-value="(files) => faylyVibrani(tip.code, files as File[] | null)"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file"/>
              </template>
            </q-file>
          </div>
        </div>

        <div v-if="tip.files.length > 0" class="q-mt-sm">
          <div
              v-for="file in tip.files"
              :key="file.fileId"
              class="row items-center no-wrap q-mb-xs"
          >
            <div class="col">
              <q-icon name="archive" class="q-mr-xs"/>
              <span>{{ file.name }}</span>
              <span class="text-grey-7 q-pl-sm">{{ razmerFayla(file.size) }}</span>
            </div>
            <div class="col-auto">
              <q-btn
                  square
                  flat
                  color="negative"
                  icon="close"
                  padding="5px 6px"
                  :loading="udalenieFaylaDlya === tip.code"
                  @click="tipiTomaStore.udalitFayl(tip.code, file.fileId)"
              >
                <q-tooltip>{{ $t('unit.tipi_toma.hints.delete_file') }}</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
        <div v-else class="text-caption text-grey-7 q-mt-sm">{{ $t('unit.tipi_toma.list.no_files') }}</div>
      </q-card-section>
    </q-card>
  </template>
</template>

<style scoped>
</style>
