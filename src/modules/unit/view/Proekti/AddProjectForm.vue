<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {onMounted, ref} from "vue";

const localProjectCode = ref<{value: string, label: string} | null>(null);

const addFormStore = useAddProjectFormStore();
const { form, oshibkaOtBackenda, loader, hranilisha, proekti, proverkaProxyHost } = storeToRefs(addFormStore);

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
    form.value.projectName = data.label;
  } else {
    form.value.projectCode = "";
    form.value.projectName = "";
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
              No results
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      <q-input v-model="form.projectName" :label="$t('unit.form_add_project.fields.labels.projectName')" />
      <q-input v-model="form.mainBranch" :label="$t('unit.form_add_project.fields.labels.mainBranch')" />
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
      <span v-if="proverkaProxyHost.result === true" class="text-light-green">Доступен</span>
      <span v-if="proverkaProxyHost.result === false" class="text-negative">Недоступен</span>
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
