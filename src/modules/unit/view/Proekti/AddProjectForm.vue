<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {onMounted, ref} from "vue";
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
const { form, oshibkaOtBackenda, loader, hranilisha, proekti } = storeToRefs(addFormStore);

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

function repoSelected(value: string | number | null): void {
  form.value.repoId = value === null ? "" : String(value);

  if (!value) {
    proekti.value.spisok = [];
  } else {
    addFormStore.poluchitProektiRepi();
  }
}

function projectCodeSelected(value: string | number | null): void {
  if (value === null || value === "") {
    localProjectCode.value = null;
    form.value.projectCode = "";
    form.value.projectName = "";
    return;
  }

  const kod = String(value);
  const nayden = proekti.value.spisok.find((item) => item.value === kod);

  localProjectCode.value = kod;
  form.value.projectCode = kod;
  form.value.projectName = (nayden?.label ?? kod).replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function filterSpiskaProektov(val: string | null, update: (callback: () => void) => void): void {
  proekti.value.query = val;
  update(() => addFormStore.poluchitProektiRepi());
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
        <q-select
            v-model="localProjectCode"
            class="add-project__native add-project__native--single"
            :loading="proekti.loader"
            :options="proekti.spisok"
            fill-input
            use-input
            hide-selected
            outlined
            dense
            hide-bottom-space
            clearable
            emit-value
            map-options
            @filter="filterSpiskaProektov"
            @update:model-value="projectCodeSelected"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">
                {{ $t('common.no_results') }}
              </q-item-section>
            </q-item>
          </template>
        </q-select>
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
        <q-select
            v-model="form.zashishennieVetki"
            class="add-project__native"
            use-input
            use-chips
            multiple
            hide-selected
            fill-input
            outlined
            dense
            hide-bottom-space
            @new-value="dobavitMasku"
        />
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

/* Однострочный селект — той же высоты, что GhInput/GhSelect (F1). */
.add-project__native--single :deep(.q-field__control) {
  height: var(--control-height-md);
  min-height: var(--control-height-md);
}

.add-project__native--single :deep(.q-field__inner) {
  height: 100%;
  min-height: 0;
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
