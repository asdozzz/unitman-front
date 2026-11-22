<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
  GhPageHeader,
} from "@/components/ui";
import { storeInizializii } from "@/modules/app/store/InitializationStore";

const { t } = useI18n();

const store = storeInizializii();
const { formaProxyHost: form, proverkaProxyHost } = storeToRefs(store);
</script>

<template>
  <div class="initialization primer">
    <GhPageHeader
      :title="t('app.titles.init')"
      :description="t('app.initialization.description')"
    />

    <GhBox class="initialization__box">
      <template #header>
        <span>{{ t("app.form_proxy_host.caption") }}</span>
      </template>

      <div class="initialization__form">
        <GhFormField :label="t('app.form_proxy_host.fields.label')">
          <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
            <GhInput
              v-model="form.value"
              :id="controlId"
              :aria-describedby="ariaDescribedby"
              :aria-invalid="ariaInvalid"
              :disabled="form.loader"
            />
          </template>
        </GhFormField>

        <GhBanner
          v-if="form.oshibkaOtBeka"
          variant="danger"
          :title="t('common.states.error')"
        >
          {{ form.oshibkaOtBeka }}
        </GhBanner>

        <GhBanner
          v-if="proverkaProxyHost.oshibkaOtBeka"
          variant="danger"
          :title="t('common.states.error')"
        >
          {{ proverkaProxyHost.oshibkaOtBeka }}
        </GhBanner>

        <GhBanner v-if="proverkaProxyHost.result === true" variant="success">
          {{ t("common.states.available") }}
        </GhBanner>

        <GhBanner
          v-else-if="proverkaProxyHost.result === false"
          variant="attention"
        >
          {{ t("common.states.unavailable") }}
        </GhBanner>
      </div>

      <template #footer>
        <GhButton
          icon="check-circle"
          :label="t('app.form_proxy_host.buttons.check')"
          :loading="proverkaProxyHost.loader"
          :disabled="store.elsiProxyHostNeZapolnen"
          @click="store.proveritProxyHost()"
        />
        <GhButton
          variant="primary"
          icon="check"
          :label="t('app.form_proxy_host.buttons.ok')"
          :loading="form.loader"
          :disabled="store.elsiProxyHostNeZapolnen"
          @click="store.obnovitProxyHost()"
        />
      </template>
    </GhBox>
  </div>
</template>

<style scoped>
.initialization {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.initialization__box {
  max-width: 700px;
}

.initialization__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
