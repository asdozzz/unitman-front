<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
} from "@/components/ui";
import AccountService from "@/modules/account/services/AccountService";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const email = ref<string>(String(route.query.email ?? ""));
const code = ref<string>("");

const otpravka = ref<boolean>(false);
const povtor = ref<boolean>(false);
const oshibka = ref<string | null>(null);
const uspekh = ref<boolean>(false);
const soobshenie = ref<string | null>(null);
const cooldown = ref<number>(0);

let taymer: number | null = null;

const formaValidna = computed<boolean>(
  () => email.value.trim() !== "" && /^\d{6}$/u.test(code.value.trim()),
);

function zapustitCooldown(): void {
  cooldown.value = 60;

  if (taymer !== null) {
    window.clearInterval(taymer);
  }

  taymer = window.setInterval(() => {
    cooldown.value -= 1;

    if (cooldown.value <= 0 && taymer !== null) {
      window.clearInterval(taymer);
      taymer = null;
    }
  }, 1000);
}

onUnmounted(() => {
  if (taymer !== null) {
    window.clearInterval(taymer);
  }
});

function perevodOshibki(message: string): string {
  switch (message) {
    case "account.email.code_invalid":
      return t("account.verify_email.errors.invalid");
    case "account.email.code_expired":
      return t("account.verify_email.errors.expired");
    case "account.email.too_many_attempts":
      return t("account.verify_email.errors.too_many_attempts");
    case "account.email.resend_too_often":
      return t("account.verify_email.errors.resend_too_often");
    case "account.email.too_many_resends":
      return t("account.verify_email.errors.too_many_resends");
    default:
      return message;
  }
}

async function podtverdit(): Promise<void> {
  if (otpravka.value || !formaValidna.value) {
    return;
  }

  otpravka.value = true;
  oshibka.value = null;
  soobshenie.value = null;

  const response = await AccountService.podtverditEmail({
    email: email.value.trim(),
    code: code.value.trim(),
  });

  otpravka.value = false;

  if (response.status === "success") {
    uspekh.value = true;
    return;
  }

  oshibka.value =
    response.status === "fail"
      ? perevodOshibki(response.data.message)
      : response.message;
}

async function otpravitPovtorno(): Promise<void> {
  if (povtor.value || cooldown.value > 0 || email.value.trim() === "") {
    return;
  }

  povtor.value = true;
  oshibka.value = null;
  soobshenie.value = null;

  const response = await AccountService.otpravitKodPovtorno({
    email: email.value.trim(),
  });

  povtor.value = false;

  if (response.status === "success") {
    soobshenie.value = t("account.verify_email.resent");
    zapustitCooldown();
    return;
  }

  oshibka.value =
    response.status === "fail"
      ? perevodOshibki(response.data.message)
      : response.message;
}
</script>

<template>
  <div class="verify primer">
    <GhBox class="verify__card">
      <GhBanner v-if="uspekh" variant="success" :title="t('account.verify_email.success_title')">
        {{ t("account.verify_email.success_text") }}
        <button type="button" class="verify__link" @click="router.push('/login')">
          {{ t("account.verify_email.go_to_login") }}
        </button>
      </GhBanner>

      <template v-else>
        <h1 class="verify__title">{{ t("account.verify_email.title") }}</h1>
        <p class="verify__description">
          {{ t("account.verify_email.description") }}
        </p>

        <GhBanner v-if="oshibka !== null" variant="danger" :title="t('account.verify_email.error_title')">
          {{ oshibka }}
        </GhBanner>

        <GhBanner v-if="soobshenie !== null" variant="success">
          {{ soobshenie }}
        </GhBanner>

        <form class="verify__form" @submit.prevent="podtverdit">
          <GhFormField :label="t('account.verify_email.email_label')" control-id="verify-email">
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

          <GhFormField :label="t('account.verify_email.code_label')" control-id="verify-code">
            <template #default="{ controlId, ariaInvalid }">
              <GhInput
                :id="controlId"
                v-model="code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                :maxlength="6"
                :aria-invalid="ariaInvalid"
              />
            </template>
          </GhFormField>

          <GhButton
            type="submit"
            variant="primary"
            block
            icon="verified"
            :loading="otpravka"
            :disabled="otpravka || !formaValidna"
            :label="t('account.verify_email.submit')"
          />

          <GhButton
            type="button"
            variant="default"
            block
            icon="sync"
            :loading="povtor"
            :disabled="povtor || cooldown > 0 || email.trim() === ''"
            :label="
              cooldown > 0
                ? t('account.verify_email.resend_in', { seconds: cooldown })
                : t('account.verify_email.resend')
            "
            @click="otpravitPovtorno"
          />
        </form>

        <p class="verify__footer">
          {{ t("account.verify_email.have_account") }}
          <RouterLink class="verify__link" to="/login">
            {{ t("account.verify_email.go_to_login") }}
          </RouterLink>
        </p>
      </template>
    </GhBox>
  </div>
</template>

<style scoped>
.verify {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.verify__card {
  width: 25rem;
  max-width: 100%;
}

.verify__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.verify__title {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-align: center;
}

.verify__description {
  margin: 8px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  line-height: var(--lineHeight-normal);
  text-align: center;
}

.verify__footer {
  margin: 16px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  text-align: center;
}

.verify__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fgColor-accent);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.verify__link:hover {
  text-decoration: underline;
}
</style>
