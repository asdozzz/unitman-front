<script setup lang="ts">
import { useAuthStore } from '@/modules/account/store/auth';
import { storeToRefs } from 'pinia'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router';
import {nextTick} from "vue";
const router = useRouter();

const authStore = useAuthStore();
const { loginView, tokenData, defaultRoute, returnUrl } = storeToRefs(authStore);

async function onSubmit() {
  const response = await authStore.login();
  if (response.status === "fail") {
    Notify.create(response.data.message);
  }
  if (response.status === "success") {
    nextTick();
    router.push(returnUrl.value || defaultRoute.value);
  }
}

function onLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="flex flex-center q-mt-lg">
    <q-card class="shadow-2 my_card" bordered v-if="!tokenData">
      <q-card-section class="text-center">
        <div class="text-grey-9 text-h5 text-weight-bold">{{$t('account.login_form.caption')}}</div>
      </q-card-section>
      <q-card-section>
        <q-input name="login" v-model="loginView.form.login" dense outlined :label="$t('account.login_form.email_label')"></q-input>
        <q-input name="pass" v-model="loginView.form.pass" dense outlined class="q-mt-md" type="password" :label="$t('account.login_form.password_label')"></q-input>
      </q-card-section>
      <q-card-section>
        <q-btn style="
  border-radius: 8px;" color="dark" rounded size="md" @click="onSubmit" :label="$t('account.login_form.button_login')" no-caps class="full-width"></q-btn>
      </q-card-section>
    </q-card>
    <q-card class="q-pa-md shadow-2 my_card" bordered v-else>
      <q-card-section class="text-center">
        <div class="text-grey-9 text-h5 text-weight-bold">{{$t('account.login_form.already_signin.text')}}</div>
        <q-btn color="black" :label="$t('account.login_form.already_signin.button_text')" @click.prevent="onLogout"/>
      </q-card-section>
    </q-card>
  </div>

</template>

<style>
.my_card {
  width: 25rem;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
</style>
