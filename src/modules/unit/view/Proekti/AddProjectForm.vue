<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {computed, onMounted, ref, watch} from "vue";
import i18n from "@/bootstrap/translator";
import {OshibkaMaski, proveritMaskuVetki} from "@/modules/unit/utils/zashishennieVetki";
import {
  GhBanner,
  GhButton,
  GhFormField,
  GhInput,
  GhSelect,
} from "@/components/ui";

const localProjectCode = ref<string | null>(null);
const lokalnayaOshibkaVetok = ref<string | null>(null);

type NewValueDone = (value?: string, mode?: 'add' | 'add-unique' | 'toggle') => void;

function tekstOshibkiMaski(kod: OshibkaMaski): string {
  switch (kod) {
    case 'empty':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.empty');
    case 'too_long':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_long');
    case 'duplicate':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.duplicate');
    case 'too_many':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_many');
    default:
      return '';
  }
}

function dobavitMasku(value: string, done: NewValueDone): void {
  const oshibka = proveritMaskuVetki(value, form.value.zashishennieVetki);
  if (oshibka) {
    lokalnayaOshibkaVetok.value = tekstOshibkiMaski(oshibka);
    return;
  }

  lokalnayaOshibkaVetok.value = null;
  done(value.trim());
}

const addFormStore = useAddProjectFormStore();
const { enable, form, oshibkaOtBackenda, loader, hranilisha, proekti, vetki } = storeToRefs(addFormStore);

/** Опции селекта веток — плоский список имён (модель хранит строки-маски). */
const opciiVetok = computed<string[]>(() => vetki.value.spisok.map((vetka) => vetka.value));

/** Серверный поиск веток: запрос уходит в хранилище с параметром `query`. */
function filterSpiskaVetok(val: string | null, update: (cb: () => void) => void): void {
  vetki.value.query = val ?? "";
  update(() => void addFormStore.poluchitVetkiHranilisha());
}

onMounted(async () => {
  await addFormStore.poluchitActivnieHranilisha();
})

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
  }

}

/** Сбросить выбранный проект: и локальную модель, и поля формы. */
function sbrositViborProekta(): void {
  localProjectCode.value = null;
  form.value.projectCode = "";
  form.value.projectName = "";
}

/**
 * Диалог может оставаться смонтированным между открытиями, поэтому при
 * повторном открытии сбрасываем локальное состояние селекта проекта.
 */
watch(enable, (otkrit) => {
  if (otkrit) {
    sbrositViborProekta();
    lokalnayaOshibkaVetok.value = null;
  }
});

function repoSelected(value: string | number | null): void {
  const repoId = value === null ? "" : String(value);

  if (repoId === form.value.repoId) {
    return;
  }

  form.value.repoId = repoId;
  sbrositViborProekta();

  // Ветки зависят и от репозитория, и от кода проекта: код сброшен выше,
  // поэтому список веток тоже нужно очистить.
  addFormStore.sbrositVetki();

  // Стор сам очистит список при пустом repoId и загрузит проекты иначе.
  addFormStore.poluchitProektiRepi();
}

function projectCodeSelected(value: string | number | null): void {
  if (value === null || value === "") {
    sbrositViborProekta();
    addFormStore.sbrositVetki();
    return;
  }

  const kod = String(value);
  const nayden = proekti.value.spisok.find((item) => item.value === kod);

  localProjectCode.value = kod;
  form.value.projectCode = kod;
  form.value.projectName = (nayden?.label ?? kod).replace(/[^a-zA-Z0-9_-]+/g, "_");

  // Проект в хранилище выбран — можно загружать его ветки для подсказок.
  if (form.value.repoId) {
    void addFormStore.poluchitVetkiHranilisha();
  }
}

</script>

<template>
  <form class="add-project" @submit.prevent="otpravitFormu">
    <div class="add-project__fields">
      <GhFormField :label="$t('unit.form_add_project.fields.labels.repo')">
        <GhSelect
            :model-value="form.repoId"
            :options="hranilisha.spisok"
            :disabled="hranilisha.loader"
            @update:model-value="repoSelected"
        />
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_project.fields.labels.projectCode')">
        <GhSelect
            :model-value="localProjectCode"
            :options="proekti.spisok"
            :loading="proekti.loader"
            :disabled="!form.repoId"
            :placeholder="$t('unit.form_add_project.fields.labels.projectCode')"
            use-input
            hide-selected
            clearable
            @update:model-value="projectCodeSelected"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">
                {{ $t('common.no_results') }}
              </q-item-section>
            </q-item>
          </template>
        </GhSelect>
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_project.fields.labels.projectName')">
        <GhInput v-model="form.projectName" />
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_project.fields.labels.mainBranch')">
        <GhInput v-model="form.mainBranch" />
      </GhFormField>

      <GhFormField
          :label="$t('unit.form_add_project.fields.labels.zashishennieVetki')"
          :caption="$t('unit.form_add_project.hints.zashishennieVetki')"
          :error="lokalnayaOshibkaVetok ?? ''"
      >
        <!--
          Тег-инпут масок: выбранные ветки/маски показываются чипами
          (use-chips), ввод фильтрует подсказки с сервера (@filter), Enter
          добавляет маску вручную (@new-value). hide-selected/fill-input
          здесь нельзя: hide-selected скрывает чипы (QSelect.getSelection
          возвращяет пустой массив), а fill-input не совместим с multiple.
        -->
        <q-select
            v-model="form.zashishennieVetki"
            class="add-project__native"
            :options="opciiVetok"
            :loading="vetki.loader"
            :disable="!form.repoId || !form.projectCode"
            :placeholder="form.zashishennieVetki.length === 0 ? $t('unit.form_add_project.fields.placeholders.zashishennieVetki') : ''"
            use-input
            use-chips
            multiple
            outlined
            dense
            hide-bottom-space
            @new-value="dobavitMasku"
            @filter="filterSpiskaVetok"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">
                {{ $t('unit.form_add_project.hints.zashishennieVetkiVvod') }}
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_project.fields.labels.unitContainerMemory')">
        <GhInput
            :model-value="form.memoryLimit"
            type="number"
            @update:model-value="form.memoryLimit = $event === null || $event === '' ? 0 : Number($event)"
        />
      </GhFormField>
    </div>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="add-project__error">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="add-project__actions">
      <GhButton
          variant="default"
          :label="$t('unit.form_add_project.buttons.close')"
          :disabled="loader"
          @click="addFormStore.zakritFormu()"
      />
      <GhButton
          type="submit"
          variant="primary"
          icon="check"
          :label="$t('unit.form_add_project.buttons.ok')"
          :loading="loader"
      />
    </div>
  </form>
</template>

<style scoped>
.add-project {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-project__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-project__native :deep(.q-field__control) {
  border-radius: var(--borderRadius-medium);
}

.add-project__error {
  margin-top: 4px;
}

.add-project__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--borderColor-default);
}
</style>
