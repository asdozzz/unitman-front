<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhIcon,
} from "@/components/ui";
import type { OcticonName } from "@/components/ui";
import { useAuthStore } from "@/modules/account/store/auth";

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

/** Проверка статуса активации на сервере. */
const proverka = ref<boolean>(false);
const proverkaOshibka = ref<string | null>(null);
const proverkaUspekh = ref<boolean>(false);

type Vozmozhnost = {
  icon: OcticonName;
  titleKey: string;
  descriptionKey: string;
};

/**
 * Краткое описание того, что откроется после активации. Страница остаётся
 * единственной доступной неактивированному пользователю.
 */
const vozmozhnosti: Vozmozhnost[] = [
  {
    icon: "package",
    titleKey: "account.pending_activation.features.units.title",
    descriptionKey: "account.pending_activation.features.units.description",
  },
  {
    icon: "repo",
    titleKey: "account.pending_activation.features.projects.title",
    descriptionKey: "account.pending_activation.features.projects.description",
  },
  {
    icon: "server",
    titleKey: "account.pending_activation.features.runners.title",
    descriptionKey: "account.pending_activation.features.runners.description",
  },
  {
    icon: "sparkle-fill",
    titleKey: "account.pending_activation.features.ai.title",
    descriptionKey: "account.pending_activation.features.ai.description",
  },
  {
    icon: "bell",
    titleKey: "account.pending_activation.features.notifications.title",
    descriptionKey: "account.pending_activation.features.notifications.description",
  },
  {
    icon: "shield",
    titleKey: "account.pending_activation.features.access.title",
    descriptionKey: "account.pending_activation.features.access.description",
  },
];

async function proveritStatus(): Promise<void> {
  if (proverka.value) {
    return;
  }

  proverka.value = true;
  proverkaOshibka.value = null;
  proverkaUspekh.value = false;

  try {
    const aktivirovan = await authStore.obnovitStatusAktivacii();

    if (aktivirovan) {
      proverkaUspekh.value = true;
      await router.push(authStore.defaultRoute);

      return;
    }

    proverkaOshibka.value = t("account.pending_activation.still_pending");
  } catch {
    proverkaOshibka.value = t("account.pending_activation.check_error");
  } finally {
    proverka.value = false;
  }
}

function viyty(): void {
  authStore.logout();
  void router.push("/login");
}
</script>

<template>
  <div class="pending primer">
    <div class="pending__content">
      <GhBanner
        variant="attention"
        :title="t('account.pending_activation.banner_title')"
      >
        {{ t("account.pending_activation.banner_text") }}
      </GhBanner>

      <GhBox class="pending__intro">
        <h1 class="pending__title">
          {{ t("account.pending_activation.title") }}
        </h1>
        <p class="pending__description">
          {{ t("account.pending_activation.description") }}
        </p>
        <p v-if="authStore.email" class="pending__email">
          {{ t("account.pending_activation.account") }}: {{ authStore.email }}
        </p>

        <div class="pending__actions">
          <GhButton
            variant="primary"
            icon="sync"
            :label="t('account.pending_activation.check_status')"
            :loading="proverka"
            :disabled="proverka"
            @click="proveritStatus"
          />
          <GhButton
            variant="default"
            icon="sign-out"
            :label="t('account.pending_activation.logout')"
            @click="viyty"
          />
        </div>

        <GhBanner
          v-if="proverkaOshibka !== null"
          variant="attention"
          class="pending__message"
        >
          {{ proverkaOshibka }}
        </GhBanner>

        <GhBanner
          v-if="proverkaUspekh"
          variant="success"
          class="pending__message"
        >
          {{ t("account.pending_activation.activated") }}
        </GhBanner>
      </GhBox>

      <h2 class="pending__features-title">
        {{ t("account.pending_activation.features_title") }}
      </h2>

      <div class="pending__features">
        <GhBox
          v-for="vozmozhnost in vozmozhnosti"
          :key="vozmozhnost.titleKey"
          class="pending__feature"
        >
          <span class="pending__feature-icon">
            <GhIcon :name="vozmozhnost.icon" :size="20" />
          </span>
          <h3 class="pending__feature-title">
            {{ t(vozmozhnost.titleKey) }}
          </h3>
          <p class="pending__feature-description">
            {{ t(vozmozhnost.descriptionKey) }}
          </p>
        </GhBox>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending {
  min-height: 100%;
  padding: 32px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.pending__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.pending__intro {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending__title {
  margin: 0;
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.pending__description {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.pending__email {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
}

.pending__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.pending__message {
  margin-top: 4px;
}

.pending__features-title {
  margin: 0;
  font-size: var(--fontSize-subtitle);
  font-weight: var(--fontWeight-semibold);
}

.pending__features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.pending__feature {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending__feature-icon {
  color: var(--fgColor-accent);
}

.pending__feature-title {
  margin: 0;
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
}

.pending__feature-description {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
  line-height: var(--lineHeight-normal);
}
</style>
