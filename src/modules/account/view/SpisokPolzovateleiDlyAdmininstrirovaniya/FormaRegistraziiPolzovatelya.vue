<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaRegistraziiPolzovatelya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";
import {onMounted} from "vue";

const addFormStore = useFormaRegistraziiPolzovatelya();
const { form, oshibkaOtBackenda, loader, roles, locales, proekti, vibranieProekti } = storeToRefs(addFormStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()

onMounted(() => {
  addFormStore.poluchitSpisokActivnihProektov();
})
async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    await addFormStore.dobavitVProekti();
    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
    //router.push({ name: 'account_edit', params: { id: response.data.id } })

  }
}

function esliVibran(proektId: string): boolean {
  return vibranieProekti.value.includes(proektId);
}

function toggle(proektId: string) {
  if (esliVibran(proektId)) {
    vibranieProekti.value = vibranieProekti.value.filter(item => item!= proektId);
  } else {
    vibranieProekti.value.push(proektId);
  }
}

</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{$t('account.form_add.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.email" :label="$t('account.form_add.fields.labels.email')" />
      <q-input v-model="form.password" :label="$t('account.form_add.fields.labels.password')" />
      <q-select v-model="form.roles" :options="roles.spisok" :label="$t('account.form_add.fields.labels.role')" emit-value map-options/>
      <q-select v-model="form.locale" :options="locales.spisok" :label="$t('account.form_add.fields.labels.locale')" emit-value map-options/>
      <q-input v-model="form.nickname" :label="$t('account.form_add.fields.labels.nickname')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>
    <q-card-section>
      <q-chip
          :disable="loader"
          dark
          :color="esliVibran(proekt.id) ? 'positive':'primary'"
          v-for="proekt in proekti"
          :label="proekt.name"
          square
          clickable
          :selected="esliVibran(proekt.id)"
          @click="toggle(proekt.id)"
      ></q-chip>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn :label="$t('account.form_add.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('account.form_add.buttons.close')" color="dark" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
