<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  HookSettingsForm,
  storeObnovleniyaNastroekHuka
} from "@/modules/unit/store/SpisokProektov/StoreObnovleniyaNastroekHuka";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";
import {useRoute} from "vue-router";
import {onMounted} from "vue";
import {copyToClipboard} from "quasar";
import {storeHelper} from "@/modules/app/store/HelperStore";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhSkeleton,
  GhSwitch,
} from "@/components/ui";

const helperStore = storeHelper();
const { baseUrl } = storeToRefs(helperStore);

const storeProekta = storePolucheniyaProekta();
const {loader: loaderProekta, proekt, oshibkaOtBeka } = storeToRefs(storeProekta);

const formStore = storeObnovleniyaNastroekHuka();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formStore);

const route = useRoute();

async function zagruzitNastroiki(): Promise<void> {
  await storeProekta.poluchitProekt(route.params.id as string);
  if (proekt.value) {
    formStore.otkritFormu(new HookSettingsForm(
        proekt.value.id,
        proekt.value.nastroikiHukaProekta.avtosozdanie,
        proekt.value.nastroikiHukaProekta.avtoobnovlenie,
        proekt.value.nastroikiHukaProekta.avtoudalenie,
        proekt.value.nastroikiHukaProekta.obnovlenieBezSbrosaPodgotovki,
        proekt.value.nastroikiHukaProekta.vebhukNastroen,
    ))
  }
}

onMounted(zagruzitNastroiki);

async function otpravitFormu() {
  await formStore.otpravitFormu();
}

function skopirovatHook(): void {
  if (proekt.value) {
    void copyToClipboard(`${baseUrl.value}/project/${proekt.value.id}/hook`);
  }
}
</script>

<template>
  <div class="hook-settings">
    <GhBox v-if="loaderProekta" padding="md" aria-busy="true">
      <div class="hook-settings__skeleton">
        <GhSkeleton variant="text" width="70%" height="12" />
        <GhSkeleton variant="text" width="40%" height="32" />
        <GhSkeleton variant="text" width="40%" height="32" />
        <GhSkeleton variant="rect" width="120px" height="32" />
      </div>
    </GhBox>

    <GhBanner
        v-else-if="oshibkaOtBeka"
        variant="danger"
        :title="$t('common.states.error')"
    >
      {{ oshibkaOtBeka }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="zagruzitNastroiki"
        />
      </template>
    </GhBanner>

    <form v-else class="hook-settings__form" @submit.prevent="otpravitFormu">
      <GhBox padding="md">
        <template #header>
          {{ $t('unit.proekt.tabs.repo_event_handler') }}
        </template>

        <p class="hook-settings__hint">
          {{ $t('unit.proekt.hook_settings.hint') }}
        </p>

        <GhButton
            v-if="proekt"
            variant="default"
            size="sm"
            icon="copy"
            :label="$t('unit.proekt.hook_settings.chip_label')"
            class="hook-settings__copy"
            @click="skopirovatHook"
        />

        <div class="hook-settings__switches">
          <GhSwitch
              :model-value="form.avtosozdanie"
              :label="$t('unit.form_project_settings.fields.labels.autoCreate')"
              @update:model-value="form.avtosozdanie = $event"
          />
          <GhSwitch
              :model-value="form.avtoobnovlenie"
              :label="$t('unit.form_project_settings.fields.labels.autoUpdate')"
              @update:model-value="form.avtoobnovlenie = $event"
          />
          <GhSwitch
              :model-value="form.avtoudalenie"
              :label="$t('unit.form_project_settings.fields.labels.autoDelete')"
              @update:model-value="form.avtoudalenie = $event"
          />
          <GhSwitch
              :model-value="form.obnovlenieBezSbrosaPodgotovki"
              :label="$t('unit.form_project_settings.fields.labels.updateWithoutReset')"
              @update:model-value="form.obnovlenieBezSbrosaPodgotovki = $event"
          />
          <GhSwitch
              :model-value="form.vebhukNastroen"
              :label="$t('unit.form_project_settings.fields.labels.gitWebhookConfigured')"
              @update:model-value="form.vebhukNastroen = $event"
          />
        </div>

        <p class="hook-settings__hint">
          {{ $t('unit.proekt.hook_settings.git_webhook_hint') }}
        </p>

        <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="hook-settings__error">
          {{ oshibkaOtBackenda }}
        </GhBanner>

        <template #footer>
          <GhButton
              type="submit"
              variant="primary"
              icon="check"
              :label="$t('unit.form_project_settings.buttons.save')"
              :loading="loader"
          />
        </template>
      </GhBox>
    </form>
  </div>
</template>

<style scoped>
.hook-settings {
  max-width: 640px;
}

.hook-settings__form {
  display: contents;
}

.hook-settings__skeleton,
.hook-settings__switches {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hook-settings__hint {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.hook-settings__copy {
  margin-bottom: 16px;
}

.hook-settings__error {
  margin-top: 12px;
}
</style>
