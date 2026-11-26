<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { GhBanner, GhBox, GhButton } from "@/components/ui";
import OAuthService from "@/modules/account/services/OAuthService";
import { useAuthStore, type TokenData } from "@/modules/account/store/auth";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const zagruzka = ref<boolean>(true);
const oshibka = ref<string | null>(null);

function perevodOshibki(message: string): string {
  switch (message) {
    case "oauth.email.not_verified":
      return t("account.oauth.errors.email_not_verified");
    case "oauth.account.blocked":
      return t("account.oauth.errors.blocked");
    case "oauth.account.system":
      return t("account.oauth.errors.system");
    case "oauth.provider.not_configured":
      return t("account.oauth.errors.not_configured");
    case "oauth.state.invalid":
    case "oauth.state.expired":
    case "oauth.code.invalid":
      return t("account.oauth.errors.state");
    case "oauth.exchange.failed":
    default:
      return t("account.oauth.errors.exchange");
  }
}

onMounted(async () => {
  const queryError = route.query.oauthError;
  const code = route.query.code;

  if (typeof queryError === "string" && queryError !== "") {
    oshibka.value = perevodOshibki(queryError);
    zagruzka.value = false;
    return;
  }

  if (typeof code !== "string" || code === "") {
    oshibka.value = t("account.oauth.errors.state");
    zagruzka.value = false;
    return;
  }

  const response = await OAuthService.obmenyatKod(code);
  zagruzka.value = false;

  if (response.status !== "success") {
    oshibka.value =
      response.status === "fail"
        ? perevodOshibki(response.data.message)
        : perevodOshibki(response.message);
    return;
  }

  authStore.prinyatTokenData(response.data as unknown as TokenData);

  await router.replace(
    authStore.isPendingActivation ? "/pending" : authStore.defaultRoute,
  );
});
</script>

<template>
  <div class="oauth-callback primer">
    <GhBox class="oauth-callback__card">
      <template v-if="zagruzka">
        <p class="oauth-callback__title">{{ t("account.oauth.callback_loading") }}</p>
      </template>

      <template v-else-if="oshibka !== null">
        <GhBanner variant="danger" :title="t('account.oauth.callback_error_title')">
          {{ oshibka }}
        </GhBanner>
        <GhButton
          variant="primary"
          block
          icon="sign-in"
          :label="t('account.oauth.go_to_login')"
          @click="router.push('/login')"
        />
      </template>
    </GhBox>
  </div>
</template>

<style scoped>
.oauth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.oauth-callback__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 25rem;
  max-width: 100%;
}

.oauth-callback__title {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  text-align: center;
}
</style>
