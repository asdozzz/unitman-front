<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhButton,
  GhDialog,
  GhFormField,
  GhIcon,
  GhInput,
  GhSelect,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import type { ProvayderOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

const { t, te } = useI18n();

const formaStore = useFormaRekvizitovOpenCodeStore();
const storSpiska = useStorSpiskaRekvizitovOpenCode();
const {
  forma,
  loader,
  oshibkaOtBackenda,
  redaktiruemiId,
  maskaTekushegoKlyucha,
  etoSozdanie,
  etoCustom,
  provaydery,
  oshibkaProvayderov,
  zagruzkaModelei,
  istochnikModelei,
  oshibkaModelei,
  statusModelei,
  modeliDlyaVibora,
  ruchnoyRezhimModelei,
  mozhnoZagruzitModeli,
  modeliZablokirovany,
  mozhnoSohranit,
} = storeToRefs(formaStore);

/** Поле ручного ввода новой модели. */
const novayaModel = ref<string>("");

const zagolovok = computed<string>(() =>
  etoSozdanie.value
    ? t("opencode.rekvizity.form.caption_create")
    : t("opencode.rekvizity.form.caption_edit"),
);

/** При изменении ключ не приходит целиком — показывается только маска. */
const podskazkaKlyucha = computed<string>(() => {
  if (etoSozdanie.value) {
    return t("opencode.rekvizity.form.fields.api_key_new");
  }

  return t("opencode.rekvizity.form.fields.api_key_keep", {
    hint: maskaTekushegoKlyucha.value ?? "",
  });
});

/** Подпись провайдера: локализованное имя, а при отсутствии ключа — имя каталога. */
function imyaProvaydera(provayder: ProvayderOpenCode): string {
  const key = `opencode.providers.${provayder.code}`;

  return te(key) ? t(key) : provayder.name;
}

const opciiProvayderov = computed<GhSelectOption[]>(() =>
  provaydery.value.map((provayder) => ({
    value: provayder.code,
    label: imyaProvaydera(provayder),
    description: provayder.baseUrl || undefined,
  })),
);

const opciiModelei = computed<GhSelectOption[]>(() =>
  modeliDlyaVibora.value.map((model) => ({ value: model, label: model })),
);

const opciiDefoltnoyModeli = computed<GhSelectOption[]>(() =>
  forma.value.models.map((model) => ({ value: model, label: model })),
);

const podskazkaUrl = computed<string>(() => {
  if (etoCustom.value) {
    return t("opencode.rekvizity.form.fields.url_custom");
  }

  return t("opencode.rekvizity.form.fields.url_derived");
});

/** Подпись источника списка моделей (live/manual). */
const podskazkaIstochnika = computed<string>(() => {
  if (istochnikModelei.value === "live") {
    return t("opencode.rekvizity.form.models.source_live");
  }

  if (istochnikModelei.value === "manual") {
    return t("opencode.rekvizity.form.models.source_manual");
  }

  return "";
});

/** Подсказка под полем моделей: блокировка без ключа, live-список либо ручной режим. */
const podskazkaModelei = computed<string>(() => {
  if (modeliZablokirovany.value) {
    return t("opencode.rekvizity.form.models.need_key");
  }

  if (ruchnoyRezhimModelei.value) {
    return t("opencode.rekvizity.form.models.hint_manual");
  }

  return t("opencode.rekvizity.form.models.hint");
});

/** `errorKey` бэкенда (`account.opencode_credential.*`) переводится по суффиксу. */
function tekstOshibkiModelei(error: string | null): string {
  if (error === null || error === "") {
    return "";
  }

  // Провайдер отклонил доступ (401) — почти наверняка указан невалидный ключ.
  if (statusModelei.value === 401) {
    return t("opencode.rekvizity.model_errors.provider_invalid_key");
  }

  const prefiks = "account.opencode_credential.";

  if (error.startsWith(prefiks)) {
    const sufiks = error.slice(prefiks.length);
    const key = `opencode.rekvizity.model_errors.${sufiks}`;

    return te(key) ? t(key) : error;
  }

  return error;
}

function obrabotatProvaydera(value: string | number | null | Array<string | number>): void {
  formaStore.vybratProvaydera(value);
}

/** Смена набора моделей: дефолт не должен выпадать из списка. */
function obrabotatModeli(value: string | number | null | Array<string | number>): void {
  const models = Array.isArray(value)
    ? value.filter((model): model is string => typeof model === "string")
    : [];

  formaStore.forma.models = models;

  if (!models.includes(formaStore.forma.defaultModel)) {
    formaStore.forma.defaultModel = models[0] ?? "";
  }
}

function obrabotatDefoltnuyuModel(value: string | number | null | Array<string | number>): void {
  if (typeof value === "string") {
    formaStore.forma.defaultModel = value;
  }
}

function dobavitModel(): void {
  formaStore.dobavitModel(novayaModel.value);
  novayaModel.value = "";
}

function obrabotatZakrytie(otkryto: boolean): void {
  if (otkryto || loader.value) {
    return;
  }

  formaStore.zakrit();
}

function zakrit(): void {
  if (loader.value) {
    return;
  }

  formaStore.zakrit();
}

/** Сохранение идёт через стор списка: он же перезапрашивает список после успеха. */
async function sohranit(): Promise<void> {
  if (!mozhnoSohranit.value) {
    return;
  }

  await storSpiska.sohranitRekvizity();
}

/** Пауза после последнего ввода ключа перед автозагрузкой моделей (мс). */
const ZADERZHKA_ZAGRUZKI_MODELEY = 700;

let taymerZagruzkiModeley: ReturnType<typeof setTimeout> | null = null;

function otmenitOtlozhennuyuZagruzku(): void {
  if (taymerZagruzkiModeley !== null) {
    clearTimeout(taymerZagruzkiModeley);
    taymerZagruzkiModeley = null;
  }
}

/**
 * Автозагрузка моделей при вводе или вставке ключа: запрос уходит после
 * паузы, чтобы не дёргать провайдера на каждый символ.
 */
watch(
  () => forma.value.apiKey,
  (klyuch) => {
    otmenitOtlozhennuyuZagruzku();

    if (klyuch.trim() === "") {
      return;
    }

    taymerZagruzkiModeley = setTimeout(() => {
      taymerZagruzkiModeley = null;
      void formaStore.avtozagruzitModeli();
    }, ZADERZHKA_ZAGRUZKI_MODELEY);
  },
);

/** Уход с поля ключа грузит список сразу, не дожидаясь паузы. */
function obrabotatBlurKlyucha(): void {
  otmenitOtlozhennuyuZagruzku();
  void formaStore.avtozagruzitModeli();
}

onBeforeUnmount(otmenitOtlozhennuyuZagruzku);

onMounted(() => {
  void formaStore.zagruzitProvayderov();
});
</script>

<template>
  <GhDialog
    :model-value="redaktiruemiId !== null"
    :title="zagolovok"
    @update:model-value="obrabotatZakrytie"
  >
    <div class="forma-opencode__body">
      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>

      <GhFormField :label="t('opencode.rekvizity.form.fields.name')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.name"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.provider')"
        :caption="
          oshibkaProvayderov
            ? t('opencode.rekvizity.form.fields.provider_error')
            : t('opencode.rekvizity.form.fields.provider_hint')
        "
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="forma.provider"
            :options="opciiProvayderov"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            @update:model-value="obrabotatProvaydera"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.url')"
        :caption="podskazkaUrl"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.url"
            type="url"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            :readonly="!etoCustom"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.api_key')"
        :caption="podskazkaKlyucha"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.apiKey"
            type="password"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
            @blur="obrabotatBlurKlyucha"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.models')"
        :caption="podskazkaModelei"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="forma.models"
            :options="opciiModelei"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader || modeliZablokirovany"
            :loading="zagruzkaModelei"
            multiple
            use-chips
            use-input
            clearable
            @update:model-value="obrabotatModeli"
          >
            <template #append>
              <button
                v-if="mozhnoZagruzitModeli"
                type="button"
                class="forma-opencode__refresh"
                :aria-label="t('opencode.rekvizity.form.models.refresh')"
                :title="t('opencode.rekvizity.form.models.refresh')"
                :disabled="zagruzkaModelei"
                @click.stop="formaStore.zagruzitModeli()"
              >
                <GhIcon name="sync" :size="14" />
              </button>
            </template>
          </GhSelect>

          <span v-if="podskazkaIstochnika" class="forma-opencode__source">
            {{ podskazkaIstochnika }}
          </span>
        </template>
      </GhFormField>

      <div v-if="ruchnoyRezhimModelei" class="forma-opencode__model-row">
        <GhInput
          v-model="novayaModel"
          :placeholder="t('opencode.rekvizity.form.models.add_placeholder')"
          :disabled="loader || modeliZablokirovany"
          autocomplete="off"
        />
        <GhButton
          variant="default"
          icon="plus"
          :label="t('opencode.rekvizity.form.models.add')"
          :disabled="loader || modeliZablokirovany || novayaModel.trim() === ''"
          @click="dobavitModel"
        />
      </div>

      <p v-if="oshibkaModelei" class="forma-opencode__model-error">
        {{ tekstOshibkiModelei(oshibkaModelei) }}
        <span v-if="statusModelei !== null" class="forma-opencode__model-status">
          HTTP {{ statusModelei }}
        </span>
      </p>

      <p v-if="forma.models.length === 0 && ruchnoyRezhimModelei" class="forma-opencode__hint">
        {{ t('opencode.rekvizity.form.models.empty') }}
      </p>

      <GhFormField :label="t('opencode.rekvizity.form.fields.default_model')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="forma.defaultModel"
            :options="opciiDefoltnoyModeli"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader || forma.models.length === 0"
            @update:model-value="obrabotatDefoltnuyuModel"
          />
        </template>
      </GhFormField>
    </div>

    <template #footer>
      <GhButton
        variant="default"
        :label="t('opencode.rekvizity.form.buttons.close')"
        :disabled="loader"
        @click="zakrit"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="t('opencode.rekvizity.form.buttons.ok')"
        :loading="loader"
        :disabled="!mozhnoSohranit"
        @click="sohranit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.forma-opencode__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forma-opencode__model-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.forma-opencode__source {
  display: block;
  margin-top: 2px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.forma-opencode__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--borderRadius-medium);
  background: transparent;
  color: var(--fgColor-muted);
  cursor: pointer;
}

.forma-opencode__refresh:hover:not(:disabled) {
  background: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.forma-opencode__refresh:disabled {
  cursor: default;
  opacity: 0.6;
}

.forma-opencode__model-error {
  margin: 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.forma-opencode__model-status {
  color: var(--fgColor-muted);
}

.forma-opencode__hint {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}
</style>
