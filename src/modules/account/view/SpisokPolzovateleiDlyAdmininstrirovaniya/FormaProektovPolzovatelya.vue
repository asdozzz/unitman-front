<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhLabel,
  GhSkeleton,
} from "@/components/ui";
import {
  FormaProektovPolzovatelyaStore,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaProektovPolzovatelyaStore";

const { t } = useI18n();

const storProektov = FormaProektovPolzovatelyaStore();
const { proekti, moi, loader, oshibkaOtBeka } = storeToRefs(storProektov);

const props = defineProps<{
  id: string;
}>();

onMounted(() => {
  void storProektov.poluchitSpisokActivnih();
  void storProektov.poluchitProektiPolzovatelya(props.id);
});

function esliVibran(id: string): boolean {
  return moi.value.includes(id);
}

function toggle(id: string): void {
  if (esliVibran(id)) {
    void storProektov.udalitIzProekta(id, props.id);
  } else {
    void storProektov.dobavitVProekt(id, props.id);
  }
}
</script>

<template>
  <GhBox class="account-projects">
    <template #header>{{ t("account.form_projects.projects") }}</template>

    <div class="account-projects__body">
      <GhBanner
        v-if="oshibkaOtBeka"
        variant="danger"
        :title="t('account.common.error_title')"
      >
        {{ oshibkaOtBeka }}
      </GhBanner>

      <div
        v-if="loader && proekti.length === 0"
        class="account-projects__skeleton"
        aria-busy="true"
      >
        <GhSkeleton variant="text" width="30%" height="16" />
        <GhSkeleton variant="text" width="25%" height="16" />
        <GhSkeleton variant="text" width="35%" height="16" />
      </div>

      <p v-else-if="proekti.length === 0" class="account-projects__empty">
        {{ t("account.form_projects.empty") }}
      </p>

      <div v-else class="account-projects__chips">
        <button
          v-for="proekt in proekti"
          :key="proekt.id"
          type="button"
          class="account-projects__chip"
          :disabled="loader"
          :aria-pressed="esliVibran(proekt.id) ? 'true' : 'false'"
          @click="toggle(proekt.id)"
        >
          <GhLabel
            :variant="esliVibran(proekt.id) ? 'success' : 'neutral'"
            :icon="esliVibran(proekt.id) ? 'check' : undefined"
            :label="proekt.name"
          />
        </button>
      </div>
    </div>
  </GhBox>
</template>

<style scoped>
.account-projects__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-projects__skeleton {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.account-projects__empty {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
}

.account-projects__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.account-projects__chip {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.account-projects__chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-projects__chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
  border-radius: var(--borderRadius-full);
}
</style>
