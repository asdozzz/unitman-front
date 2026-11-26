<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
  GhSelect,
} from "@/components/ui";
import AccountService from "@/modules/account/services/AccountService";
import SocialAuthButtons from "@/modules/account/view/components/SocialAuthButtons.vue";

const { t } = useI18n();
const router = useRouter();

const email = ref<string>("");
const password = ref<string>("");
const passwordRepeat = ref<string>("");
const nickname = ref<string>("");
const locale = ref<string>("ru");

const otpravka = ref<boolean>(false);
const oshibka = ref<string | null>(null);
const uspekh = ref<boolean>(false);

const localeOptions = computed(() => [
  { value: "ru", label: t("app.header.language_ru") },
  { value: "en", label: t("app.header.language_en") },
]);

const paroliSovpadayut = computed<boolean>(
  () => password.value === passwordRepeat.value,
);

const formaValidna = computed<boolean>(
  () =>
    email.value.trim() !== "" &&
    password.value.length >= 6 &&
    paroliSovpadayut.value,
);

async function otpravit(): Promise<void> {
  if (otpravka.value || !formaValidna.value) {
    return;
  }

  otpravka.value = true;
  oshibka.value = null;

  try {
    const response = await AccountService.registraziyaZayavki({
      email: email.value.trim(),
      password: password.value,
      locale: locale.value,
      nickname: nickname.value.trim() === "" ? null : nickname.value.trim(),
    });

    if (response.status === "success") {
      await router.push({
        path: "/verify-email",
        query: { email: email.value.trim() },
      });
      return;
    }

    oshibka.value =
      response.status === "fail" ? response.data.message : response.message;
  } catch {
    oshibka.value = t("account.register_form.error");
  } finally {
    otpravka.value = false;
  }
}
</script>

<template>
  <div class="register primer">
    <GhBox class="register__card">
      <GhBanner
        v-if="uspekh"
        variant="success"
        :title="t('account.register_form.success_title')"
      >
        {{ t("account.register_form.success_text") }}
        <RouterLink class="register__link" to="/login">
          {{ t("account.register_form.go_to_login") }}
        </RouterLink>
      </GhBanner>

      <template v-else>
        <h1 class="register__title">{{ t("account.register_form.caption") }}</h1>
        <p class="register__description">
          {{ t("account.register_form.description") }}
        </p>

        <SocialAuthButtons />

        <GhBanner
          v-if="oshibka !== null"
          variant="danger"
          :title="t('account.register_form.error_title')"
        >
          {{ oshibka }}
        </GhBanner>

        <form class="register__form" @submit.prevent="otpravit">
          <GhFormField
            :label="t('account.register_form.email_label')"
            control-id="register-email"
          >
            <template #default="{ controlId, ariaInvalid }">
              <GhInput
                :id="controlId"
                v-model="email"
                type="email"
                autocomplete="email"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhFormField
            :label="t('account.register_form.password_label')"
            control-id="register-password"
          >
            <template #default="{ controlId, ariaInvalid }">
              <GhInput
                :id="controlId"
                v-model="password"
                type="password"
                autocomplete="new-password"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhFormField
            :label="t('account.register_form.password_repeat_label')"
            control-id="register-password-repeat"
          >
            <template #default="{ controlId, ariaInvalid }">
              <GhInput
                :id="controlId"
                v-model="passwordRepeat"
                type="password"
                autocomplete="new-password"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhBanner
            v-if="passwordRepeat !== '' && !paroliSovpadayut"
            variant="attention"
          >
            {{ t("account.register_form.passwords_mismatch") }}
          </GhBanner>

          <GhFormField
            :label="t('account.register_form.nickname_label')"
            control-id="register-nickname"
          >
            <template #default="{ controlId, ariaInvalid }">
              <GhInput
                :id="controlId"
                v-model="nickname"
                type="text"
                autocomplete="nickname"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhFormField
            :label="t('account.register_form.locale_label')"
            control-id="register-locale"
          >
            <template #default="{ controlId, ariaInvalid }">
              <GhSelect
                :id="controlId"
                v-model="locale"
                :options="localeOptions"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhButton
            type="submit"
            variant="primary"
            block
            icon="person-add"
            :loading="otpravka"
            :disabled="otpravka || !formaValidna"
            :label="t('account.register_form.button_register')"
          />
        </form>

        <p class="register__footer">
          {{ t("account.register_form.have_account") }}
          <RouterLink class="register__link" to="/login">
            {{ t("account.register_form.go_to_login") }}
          </RouterLink>
        </p>
      </template>
    </GhBox>
  </div>
</template>

<style scoped>
.register {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.register__card {
  width: 25rem;
  max-width: 100%;
}

.register__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.register__title {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-align: center;
}

.register__description {
  margin: 8px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  line-height: var(--lineHeight-normal);
  text-align: center;
}

.register__footer {
  margin: 16px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  text-align: center;
}

.register__link {
  color: var(--fgColor-accent);
  text-decoration: none;
}

.register__link:hover {
  text-decoration: underline;
}
</style>
