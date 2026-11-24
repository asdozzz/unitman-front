<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhButton,
  GhDialog,
  GhFormField,
  GhInput,
  GhLabel,
} from "@/components/ui";
import RunnerService from "@/modules/runner/services/RunnerService";
import type { RezultatProverkiPublicAddress } from "@/modules/runner/services/RunnerService";
import {
  proveritPublicAddress,
  type OshibkaPublicAddress,
} from "@/modules/runner/utils/publicAddress";

const props = defineProps<{
  modelValue: boolean;
  runnerId: string;
  currentAddress: string | null;
  hasPublicAddress: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  /** Список раннеров нужно перезагрузить после сохранения или удаления. */
  (e: "obnovit"): void;
}>();

const { t } = useI18n();

const adres = ref("");
const oshibka = ref<string | null>(null);
const soobshenie = ref<string | null>(null);
const rezultatProverki = ref<RezultatProverkiPublicAddress | null>(null);
const loaderProverki = ref(false);
const loaderSohraneniya = ref(false);
const loaderUdaleniya = ref(false);

const zanyat = computed<boolean>(
  () => loaderProverki.value || loaderSohraneniya.value || loaderUdaleniya.value,
);

const oshibkaValidacii = computed<OshibkaPublicAddress | null>(() =>
  proveritPublicAddress(adres.value),
);

const tekstOshibkiValidacii = computed<string>(() => {
  const kod = oshibkaValidacii.value;

  if (kod === null) {
    return "";
  }

  return t(`runner.runners_page.public_address.validation.${kod}`);
});

const mozhnoOtpravit = computed<boolean>(
  () => !zanyat.value && oshibkaValidacii.value === null,
);

function sbrositVremennoe(): void {
  oshibka.value = null;
  soobshenie.value = null;
  rezultatProverki.value = null;
  loaderProverki.value = false;
  loaderSohraneniya.value = false;
  loaderUdaleniya.value = false;
}

function podgotovitFormu(): void {
  adres.value = props.currentAddress ?? "";
  sbrositVremennoe();
}

watch(
  () => props.modelValue,
  (otkryto) => {
    if (otkryto) {
      podgotovitFormu();
    }
  },
  { immediate: true },
);

function obrabotatZakrytie(otkryto: boolean): void {
  if (otkryto) {
    emit("update:modelValue", true);

    return;
  }

  if (zanyat.value) {
    return;
  }

  emit("update:modelValue", false);
}

function zakrit(): void {
  if (zanyat.value) {
    return;
  }

  emit("update:modelValue", false);
}

/** Текст ошибки из ответа apiClient. */
function opisanieOshibki(
  otvet:
    | { status: "fail"; data: { message: string } }
    | { status: "error"; message: string },
): string {
  return otvet.status === "fail" ? otvet.data.message : otvet.message;
}

async function proverit(): Promise<void> {
  if (!mozhnoOtpravit.value) {
    return;
  }

  oshibka.value = null;
  soobshenie.value = null;
  rezultatProverki.value = null;
  loaderProverki.value = true;

  try {
    const otvet = await RunnerService.checkPublicAddress(
      props.runnerId,
      adres.value.trim(),
    );

    if (otvet.status === "success") {
      rezultatProverki.value = otvet.data;
    } else {
      oshibka.value = opisanieOshibki(otvet);
    }
  } catch (error) {
    oshibka.value =
      error instanceof Error
        ? error.message
        : t("runner.runners_page.public_address.messages.error");
  } finally {
    loaderProverki.value = false;
  }
}

async function sohranit(): Promise<void> {
  if (!mozhnoOtpravit.value) {
    return;
  }

  oshibka.value = null;
  soobshenie.value = null;
  loaderSohraneniya.value = true;

  try {
    const otvet = await RunnerService.savePublicAddress(
      props.runnerId,
      adres.value.trim(),
    );

    if (otvet.status === "success") {
      soobshenie.value = t("runner.runners_page.public_address.messages.saved");
      emit("obnovit");
    } else {
      oshibka.value = opisanieOshibki(otvet);
    }
  } catch (error) {
    oshibka.value =
      error instanceof Error
        ? error.message
        : t("runner.runners_page.public_address.messages.error");
  } finally {
    loaderSohraneniya.value = false;
  }
}

async function udalit(): Promise<void> {
  if (zanyat.value) {
    return;
  }

  oshibka.value = null;
  soobshenie.value = null;
  rezultatProverki.value = null;
  loaderUdaleniya.value = true;

  try {
    const otvet = await RunnerService.deletePublicAddress(props.runnerId);

    if (otvet.status === "success") {
      adres.value = "";
      soobshenie.value = t("runner.runners_page.public_address.messages.deleted");
      emit("obnovit");
    } else {
      oshibka.value = opisanieOshibki(otvet);
    }
  } catch (error) {
    oshibka.value =
      error instanceof Error
        ? error.message
        : t("runner.runners_page.public_address.messages.error");
  } finally {
    loaderUdaleniya.value = false;
  }
}
</script>

<template>
  <GhDialog
    :model-value="modelValue"
    :title="t('runner.runners_page.public_address.dialog_title')"
    :close-label="t('common.buttons.close')"
    width="560px"
    @update:model-value="obrabotatZakrytie"
  >
    <div class="public-address__body">
      <GhBanner v-if="oshibka" variant="danger">
        {{ oshibka }}
      </GhBanner>

      <GhBanner v-if="soobshenie" variant="success">
        {{ soobshenie }}
      </GhBanner>

      <GhFormField
        :label="t('runner.runners_page.public_address.input_label')"
        :caption="t('runner.runners_page.public_address.caption')"
        :error="tekstOshibkiValidacii"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="adres"
            type="url"
            :placeholder="t('runner.runners_page.public_address.placeholder')"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :error="oshibkaValidacii !== null"
            :disabled="zanyat"
            autocomplete="url"
            @blur="rezultatProverki = null"
          />
        </template>
      </GhFormField>

      <div v-if="loaderProverki" class="public-address__check" aria-live="polite">
        {{ t("runner.runners_page.public_address.check.checking") }}
      </div>

      <div v-else-if="rezultatProverki" class="public-address__check" aria-live="polite">
        <GhLabel
          :variant="rezultatProverki.reachable ? 'success' : 'attention'"
          :icon="rezultatProverki.reachable ? 'check-circle' : 'alert'"
          :label="
            rezultatProverki.reachable
              ? t('runner.runners_page.public_address.check.reachable')
              : t('runner.runners_page.public_address.check.unreachable')
          "
        />
        <span
          v-if="!rezultatProverki.reachable && rezultatProverki.error"
          class="public-address__check-error"
        >
          {{ rezultatProverki.error }}
        </span>
        <span
          v-if="!rezultatProverki.reachable"
          class="public-address__check-hint"
        >
          {{ t("runner.runners_page.public_address.check.unreachable_hint") }}
        </span>
      </div>
    </div>

    <template #footer>
      <GhButton
        v-if="hasPublicAddress"
        class="public-address__delete"
        variant="danger"
        icon="trash"
        :label="t('runner.runners_page.public_address.buttons.clear')"
        :loading="loaderUdaleniya"
        :disabled="zanyat && !loaderUdaleniya"
        @click="udalit"
      />
      <GhButton
        variant="default"
        :label="t('runner.runners_page.public_address.buttons.cancel')"
        :disabled="zanyat"
        @click="zakrit"
      />
      <GhButton
        variant="default"
        icon="shield-check"
        :label="t('runner.runners_page.public_address.buttons.check')"
        :loading="loaderProverki"
        :disabled="!mozhnoOtpravit"
        @click="proverit"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="t('runner.runners_page.public_address.buttons.save')"
        :loading="loaderSohraneniya"
        :disabled="!mozhnoOtpravit"
        @click="sohranit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.public-address__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.public-address__check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.public-address__check-error,
.public-address__check-hint {
  overflow-wrap: anywhere;
}

.public-address__delete {
  margin-right: auto;
}
</style>
