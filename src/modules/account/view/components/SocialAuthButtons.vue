<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { GhIcon } from "@/components/ui";
import OAuthService from "@/modules/account/services/OAuthService";

const { t, locale } = useI18n();

const provaydery = ref<string[]>([]);

onMounted(async () => {
  const response = await OAuthService.poluchitProvaydery();

  if (response.status === "success") {
    provaydery.value = response.data.providers;
  }
});

function voydti(provider: string): void {
  OAuthService.start(provider, String(locale.value));
}
</script>

<template>
  <div v-if="provaydery.length > 0" class="social-auth">
    <div class="social-auth__divider">
      <span>{{ t("account.oauth.or") }}</span>
    </div>

    <button
      v-if="provaydery.includes('google')"
      type="button"
      class="social-auth__button"
      @click="voydti('google')"
    >
      <svg class="social-auth__google" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.6 11.6 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
        />
      </svg>
      <span>{{ t("account.oauth.google") }}</span>
    </button>

    <button
      v-if="provaydery.includes('github')"
      type="button"
      class="social-auth__button"
      @click="voydti('github')"
    >
      <GhIcon name="mark-github" :size="18" />
      <span>{{ t("account.oauth.github") }}</span>
    </button>
  </div>
</template>

<style scoped>
.social-auth {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.social-auth__divider {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
}

.social-auth__divider::before,
.social-auth__divider::after {
  flex: 1;
  height: 1px;
  background: var(--borderColor-default);
  content: "";
}

.social-auth__button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: 6px;
  background: var(--bgColor-default);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-small);
  font-weight: var(--fontWeight-medium);
  cursor: pointer;
}

.social-auth__button:hover {
  background: var(--bgColor-muted);
}

.social-auth__google {
  width: 18px;
  height: 18px;
}
</style>
