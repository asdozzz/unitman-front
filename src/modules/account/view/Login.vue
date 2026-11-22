<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
} from "@/components/ui";
import { useAuthStore } from "@/modules/account/store/auth";

const { t } = useI18n();
const router = useRouter();

const authStore = useAuthStore();
const { loginView, tokenData, defaultRoute, returnUrl } = storeToRefs(authStore);

/** Идёт отправка формы — защищает от повторного входа. */
const otpravka = ref<boolean>(false);

/** Текст ошибки входа; показывается inline-баннером вместо Notify. */
const oshibka = ref<string | null>(null);

const estAvtorizovan = computed<boolean>(() => tokenData.value !== null);

function izmenitLogin(value: string | number | null): void {
  loginView.value.form.login = value === null ? null : String(value);
  oshibka.value = null;
}

function izmenitParol(value: string | number | null): void {
  loginView.value.form.pass = value === null ? null : String(value);
  oshibka.value = null;
}

async function onSubmit(): Promise<void> {
  if (otpravka.value) {
    return;
  }

  otpravka.value = true;
  oshibka.value = null;

  const response = await authStore.login();

  otpravka.value = false;

  if (response.status === "success") {
    await nextTick();
    await router.push(returnUrl.value || defaultRoute.value);
    return;
  }

  oshibka.value =
    response.status === "fail"
      ? response.data.message
      : response.message || t("account.login_form.error");
}

function onLogout(): void {
  authStore.logout();
  void router.push("/login");
}
</script>

<template>
  <div class="login primer">
    <GhBox v-if="!estAvtorizovan" class="login__card">
      <form class="login__form" @submit.prevent="onSubmit">
        <h1 class="login__title">{{ t("account.login_form.caption") }}</h1>

        <GhBanner
          v-if="oshibka !== null"
          variant="danger"
          :title="t('account.login_form.error_title')"
        >
          {{ oshibka }}
        </GhBanner>

        <GhFormField
          :label="t('account.login_form.email_label')"
          control-id="login-email"
        >
          <template #default="{ controlId, ariaInvalid }">
            <GhInput
              :id="controlId"
              :model-value="loginView.form.login"
              type="email"
              autocomplete="username"
              :aria-invalid="ariaInvalid"
              @update:model-value="izmenitLogin"
            />
          </template>
        </GhFormField>

        <GhFormField
          :label="t('account.login_form.password_label')"
          control-id="login-password"
        >
          <template #default="{ controlId, ariaInvalid }">
            <GhInput
              :id="controlId"
              :model-value="loginView.form.pass"
              type="password"
              autocomplete="current-password"
              :aria-invalid="ariaInvalid"
              @update:model-value="izmenitParol"
            />
          </template>
        </GhFormField>

        <GhButton
          type="submit"
          variant="primary"
          block
          icon="sign-in"
          :loading="otpravka"
          :disabled="otpravka"
          :label="t('account.login_form.button_login')"
        />
      </form>
    </GhBox>

    <GhBox v-else class="login__card">
      <div class="login__form">
        <p class="login__title">{{ t("account.login_form.already_signin.text") }}</p>

        <GhButton
          variant="danger"
          block
          icon="sign-out"
          :label="t('account.login_form.already_signin.button_text')"
          @click="onLogout"
        />
      </div>
    </GhBox>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.login__card {
  width: 25rem;
  max-width: 100%;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login__title {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-align: center;
}
</style>
