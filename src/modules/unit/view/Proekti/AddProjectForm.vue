<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {onMounted, ref} from "vue";
import {storeInizializii} from "@/modules/app/store/InitializationStore";
import i18n from "@/bootstrap/translator";
import {OshibkaMaski, proveritMaskuVetki} from "@/modules/unit/utils/zashishennieVetki";

const localProjectCode = ref<{value: string, label: string} | null>(null);
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
const { form, oshibkaOtBackenda, loader, hranilisha, proekti, proverkaProxyHost } = storeToRefs(addFormStore);

const initStore = storeInizializii();
const { getProxyHost } = storeToRefs(initStore);
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

function repoSelected(value: string | null): void {
  if (!value) {
    proekti.value.spisok = [];
  } else {
    addFormStore.poluchitProektiRepi();
  }
}

function projectCodeSelected(data: { value: string, label: string } | null): void {
  if (data) {
    form.value.projectCode = data.value;
    form.value.projectName = data.label.replace(/[^a-zA-Z0-9_-]+/g, "_");
    // getProxyHost получен через storeToRefs, то есть это ComputedRef<string>.
    form.value.proxyHost = getProxyHost.value;
  } else {
    form.value.projectCode = "";
    form.value.projectName = "";
    form.value.proxyHost = "";
  }
}

function filterSpiskaProektov(val: string | null, update: any): void {
  proekti.value.query = val;
  update(() => addFormStore.poluchitProektiRepi());
}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{$t('unit.form_add_project.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select
          v-model="form.repoId"
          :options="hranilisha.spisok"
          @update:model-value="repoSelected"
          :label="$t('unit.form_add_project.fields.labels.repo')" emit-value map-options/>
      <q-select
          :loading="proekti.loader"
          :options="proekti.spisok"
          v-model="localProjectCode"
          @filter="filterSpiskaProektov"
          :label="$t('unit.form_add_project.fields.labels.projectCode')"
          fill-input
          use-input
          hide-selected
          @update:model-value="projectCodeSelected"
          clearable
      >
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey">
              {{ $t('common.no_results') }}
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      <q-input v-model="form.projectName" :label="$t('unit.form_add_project.fields.labels.projectName')" />
      <q-input v-model="form.mainBranch" :label="$t('unit.form_add_project.fields.labels.mainBranch')" />
      <q-select
          v-model="form.zashishennieVetki"
          use-input
          use-chips
          multiple
          hide-selected
          fill-input
          :label="$t('unit.form_add_project.fields.labels.zashishennieVetki')"
          :hint="$t('unit.form_add_project.hints.zashishennieVetki')"
          @new-value="dobavitMasku"
      />
      <div v-if="lokalnayaOshibkaVetok" class="text-negative text-caption">{{ lokalnayaOshibkaVetok }}</div>
      <q-input v-model="form.proxyHost" :label="$t('unit.form_add_project.fields.labels.proxyHost')" />
      <q-chip
          v-if="form.proxyHost.length > 0"
          :loading="proverkaProxyHost.loader"
          size="12px"
          clickable
          color="primary"
          square
          text-color="white"
          :label="$t('unit.form_add_project.buttons.check_proxy_host')"
          @click="addFormStore.proveritProxyHost"
      />
      <span v-if="proverkaProxyHost.result === true" class="text-light-green">{{ $t('common.states.available') }}</span>
      <span v-if="proverkaProxyHost.result === false" class="text-negative">{{ $t('common.states.unavailable') }}</span>
      <q-input type="number" v-model.number="form.memoryLimit" :label="$t('unit.form_add_project.fields.labels.unitContainerMemory')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('unit.form_add_project.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('unit.form_add_project.buttons.close')" color="dark" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
