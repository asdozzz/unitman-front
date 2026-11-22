<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhButton,
  GhFormField,
  GhInput,
  GhLabel,
  GhSelect,
} from "@/components/ui";
import {
  useFormaRegistraziiPolzovatelya,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";

const { t } = useI18n();

const addFormStore = useFormaRegistraziiPolzovatelya();
const {
  form,
  oshibkaOtBackenda,
  loader,
  roles,
  locales,
  proekti,
  vibranieProekti,
} = storeToRefs(addFormStore);

const emit = defineEmits<{
  formaBilaOtpravlena: [];
}>();

onMounted(() => {
  void addFormStore.poluchitSpisokActivnihProektov();
});

function izmenitEmail(value: string | number | null): void {
  form.value.email = value === null ? "" : String(value);
}

function izmenitParol(value: string | number | null): void {
  form.value.password = value === null ? "" : String(value);
}

function izmenitRol(value: string | number | null): void {
  form.value.roles = value === null ? "" : String(value);
}

function izmenitYazik(value: string | number | null): void {
  form.value.locale = value === null ? "" : String(value);
}

function izmenitNik(value: string | number | null): void {
  form.value.nickname = value === null ? null : String(value);
}

async function otpravitFormu(): Promise<void> {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    await addFormStore.dobavitVProekti();
    emit("formaBilaOtpravlena");
    addFormStore.zakritFormu();
  }
}

function esliVibran(proektId: string): boolean {
  return vibranieProekti.value.includes(proektId);
}

function toggle(proektId: string): void {
  if (esliVibran(proektId)) {
    vibranieProekti.value = vibranieProekti.value.filter(
      (item) => item !== proektId,
    );
  } else {
    vibranieProekti.value.push(proektId);
  }
}
</script>

<template>
  <div class="account-add primer">
    <div class="account-add__body">
      <GhFormField
        :label="t('account.form_add.fields.labels.email')"
        control-id="account-add-email"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="form.email"
            type="email"
            autocomplete="email"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenitEmail"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('account.form_add.fields.labels.password')"
        control-id="account-add-password"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="form.password"
            type="password"
            autocomplete="new-password"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenitParol"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('account.form_add.fields.labels.role')"
        control-id="account-add-role"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="form.roles"
            :options="roles.spisok"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenitRol"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('account.form_add.fields.labels.locale')"
        control-id="account-add-locale"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="form.locale"
            :options="locales.spisok"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenitYazik"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('account.form_add.fields.labels.nickname')"
        control-id="account-add-nickname"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="form.nickname"
            type="text"
            autocomplete="nickname"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenitNik"
          />
        </template>
      </GhFormField>

      <div v-if="proekti.length > 0" class="account-add__projects">
        <div class="account-add__chips">
          <button
            v-for="proekt in proekti"
            :key="proekt.id"
            type="button"
            class="account-add__chip"
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

      <GhBanner
        v-if="oshibkaOtBackenda"
        variant="danger"
        :title="t('account.common.error_title')"
      >
        {{ oshibkaOtBackenda }}
      </GhBanner>
    </div>

    <div class="account-add__footer">
      <GhButton
        variant="default"
        :label="t('account.form_add.buttons.close')"
        :disabled="loader"
        @click="addFormStore.zakritFormu()"
      />
      <GhButton
        variant="primary"
        icon="check"
        :loading="loader"
        :label="t('account.form_add.buttons.ok')"
        @click="otpravitFormu"
      />
    </div>
  </div>
</template>

<style scoped>
.account-add {
  display: flex;
  flex-direction: column;
}

.account-add__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-add__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.account-add__chip {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.account-add__chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-add__chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
  border-radius: var(--borderRadius-full);
}

/* Действия диалога: отступ 16px сверху, тот же горизонтальный инсет, что у полей. */
.account-add__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
