<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import type { Schema } from "@/api/types";
import {
  GhActionMenu,
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhFormField,
  GhInput,
  GhLabel,
  GhSkeleton,
} from "@/components/ui";
import type { GhActionMenuItem } from "@/components/ui";
import { useStorLichnihTokenov } from "@/modules/account/store/StorLichnihTokenov";
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import ProektiService from "@/modules/unit/services/ProektiService";
import FormaDobavleniyaLichnogoTokena from "@/modules/account/view/AccountSettings/FormaDobavleniyaLichnogoTokena.vue";
import { convertDateTime } from "@/utils/dates";

const { t } = useI18n();

const storSpiska = useStorLichnihTokenov();
const formaStore = useStorFormiLichnogoTokena();

const {
  spisok,
  loaderSpiska,
  oshibkaZagruzki,
  dejstvieId,
  oshibkaDejstviya,
  poslednijRezultat,
} = storeToRefs(storSpiska);

/** Соответствие id проекта его имени; при недоступности показывается id. */
const imenaProektov = ref<Record<string, string>>({});

/** Одноразовый показ только что добавленного секрета. */
const noviyToken = ref<{ nazvanie: string; token: string } | null>(null);

const dialogUdaleniya = ref<boolean>(false);
const udalyaemiyToken = ref<Schema<"LichniyTokenPublic"> | null>(null);
const podtverzhdenieImeni = ref<string>("");

const skopirovano = ref<boolean>(false);
let tajmerKopirovaniya: ReturnType<typeof setTimeout> | null = null;

const pokazatSkeletony = computed<boolean>(
  () => loaderSpiska.value && spisok.value.length === 0,
);

const mozhnoUdalit = computed<boolean>(
  () =>
    udalyaemiyToken.value !== null &&
    podtverzhdenieImeni.value === udalyaemiyToken.value.nazvanie,
);

const opisanieUdaleniya = computed<string>(() =>
  t("settings.tokens.delete_description", {
    name: udalyaemiyToken.value?.nazvanie ?? "",
  }),
);

async function zagruzitImenaProektov(): Promise<void> {
  const response = await ProektiService.list();

  if (response.status !== "success") {
    return;
  }

  const karta: Record<string, string> = {};

  for (const proekt of response.data) {
    karta[proekt.id] = proekt.name;
  }

  imenaProektov.value = karta;
}

function nazvanieProekta(id: string): string {
  return imenaProektov.value[id] ?? id;
}

function pravaTokena(token: Schema<"LichniyTokenPublic">): string {
  if (token.obyomPrav === "vse") {
    return t("account.lichniy_tokeni.obyom_prav.vse");
  }

  const proekty = token.proektySPushom.map(nazvanieProekta).join(", ");

  return proekty === ""
    ? t("account.lichniy_tokeni.obyom_prav.spisok")
    : `${t("account.lichniy_tokeni.obyom_prav.spisok")}: ${proekty}`;
}

function dataProverki(token: Schema<"LichniyTokenPublic">): string {
  return convertDateTime(token.proverenoV);
}

function punktyMenu(): GhActionMenuItem[] {
  return [
    {
      id: "copy",
      label: t("settings.tokens.copy"),
      icon: "copy",
    },
    {
      id: "recheck",
      label: t("account.lichniy_tokeni.buttons.pereproverit"),
      icon: "sync",
      separatorBefore: true,
    },
    {
      id: "delete",
      label: t("settings.tokens.delete"),
      icon: "trash",
      danger: true,
    },
  ];
}

function vybratDeistvie(
  token: Schema<"LichniyTokenPublic">,
  item: GhActionMenuItem,
): void {
  if (item.id === "copy") {
    void skopirovat(token.tokenHint);
    return;
  }

  if (item.id === "recheck") {
    void storSpiska.pereproverit(token.id);
    return;
  }

  if (item.id === "delete") {
    otkrytUdalenie(token);
  }
}

function otkrytSozdanie(): void {
  formaStore.otkryt();
}

function otkrytUdalenie(token: Schema<"LichniyTokenPublic">): void {
  udalyaemiyToken.value = token;
  podtverzhdenieImeni.value = "";
  dialogUdaleniya.value = true;
}

function zakrytUdalenie(): void {
  dialogUdaleniya.value = false;
  udalyaemiyToken.value = null;
  podtverzhdenieImeni.value = "";
}

/** Удаление доступно только после точного ввода имени токена. */
async function udalitToken(): Promise<void> {
  if (!mozhnoUdalit.value || udalyaemiyToken.value === null) {
    return;
  }

  const otvet = await storSpiska.udalit(udalyaemiyToken.value.id);

  if (otvet?.status === "success") {
    zakrytUdalenie();
  }
}

function pokazatKopirovanie(): void {
  skopirovano.value = true;

  if (tajmerKopirovaniya !== null) {
    clearTimeout(tajmerKopirovaniya);
  }

  tajmerKopirovaniya = setTimeout(() => {
    skopirovano.value = false;
    tajmerKopirovaniya = null;
  }, 2000);
}

/** Копирование с фолбэком для окружений без Clipboard API. */
async function skopirovat(tekst: string): Promise<void> {
  if (tekst === "") {
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(tekst);
      pokazatKopirovanie();
      return;
    }
  } catch {
    // Пробуем резервный способ ниже.
  }

  try {
    const pole = document.createElement("textarea");
    pole.value = tekst;
    pole.style.position = "fixed";
    pole.style.opacity = "0";
    document.body.appendChild(pole);
    pole.select();
    const uspeh = document.execCommand("copy");
    document.body.removeChild(pole);

    if (uspeh) {
      pokazatKopirovanie();
    }
  } catch {
    // Копирование недоступно — молча выходим.
  }
}

function skopirovatNoviyToken(): void {
  if (noviyToken.value === null) {
    return;
  }

  void skopirovat(noviyToken.value.token);
}

function zakrytNoviyToken(): void {
  noviyToken.value = null;
}

function onSozdan(payload: { nazvanie: string; token: string }): void {
  noviyToken.value = payload;
  skopirovano.value = false;
}

onMounted(() => {
  void storSpiska.poluchitSpisok();
  void zagruzitImenaProektov();
});
</script>

<template>
  <GhBox padding="none">
    <template #header>
      <div class="spisok-tokenov__header">
        <span class="spisok-tokenov__title">{{ t("settings.tokens.title") }}</span>

        <div class="spisok-tokenov__actions">
          <GhButton
            variant="default"
            size="sm"
            icon="sync"
            :aria-label="t('account.lichniy_tokeni.buttons.refresh')"
            :loading="loaderSpiska"
            @click="storSpiska.poluchitSpisok()"
          />
          <GhButton
            variant="primary"
            size="sm"
            icon="plus"
            :label="t('settings.tokens.new')"
            :disabled="loaderSpiska"
            @click="otkrytSozdanie"
          />
        </div>
      </div>
    </template>

    <div class="spisok-tokenov__content">
      <GhBanner
        v-if="noviyToken"
        variant="success"
        :title="t('settings.tokens.new')"
        dismissible
        class="spisok-tokenov__banner"
        @dismiss="zakrytNoviyToken"
      >
        <p class="spisok-tokenov__banner-text">
          {{ t("settings.tokens.created_hint") }}
        </p>
        <div class="spisok-tokenov__secret">
          <code class="gh-mono spisok-tokenov__secret-value">{{ noviyToken.token }}</code>
          <GhButton
            variant="default"
            size="sm"
            icon="copy"
            :label="skopirovano ? t('common.copied') : t('settings.tokens.copy')"
            @click="skopirovatNoviyToken"
          />
        </div>
      </GhBanner>

      <GhBanner
        v-if="poslednijRezultat"
        variant="accent"
        :title="t('account.lichniy_tokeni.result.caption')"
        dismissible
        class="spisok-tokenov__banner"
        @dismiss="storSpiska.ochistitRezultat()"
      >
        <div class="spisok-tokenov__result-name">{{ poslednijRezultat.nazvanie }}</div>
        <div v-if="poslednijRezultat.bezPravNaRedaktirovanie">
          {{ t("account.lichniy_tokeni.result.bez_prav") }}
        </div>
        <div v-else>
          {{ t("account.lichniy_tokeni.obyom_prav.caption") }}:
          {{ pravaTokena(poslednijRezultat) }}
        </div>
      </GhBanner>

      <GhBanner
        v-if="oshibkaZagruzki"
        variant="danger"
        :title="t('settings.load_error')"
        class="spisok-tokenov__banner"
      >
        {{ oshibkaZagruzki }}
        <template #actions>
          <GhButton
            variant="default"
            size="sm"
            icon="sync"
            :label="t('settings.retry')"
            :loading="loaderSpiska"
            @click="storSpiska.poluchitSpisok()"
          />
        </template>
      </GhBanner>

      <GhBanner
        v-if="oshibkaDejstviya"
        variant="danger"
        dismissible
        class="spisok-tokenov__banner"
        @dismiss="storSpiska.oshibkaDejstviya = null"
      >
        {{ oshibkaDejstviya }}
      </GhBanner>

      <div v-if="pokazatSkeletony" class="spisok-tokenov__skeleton" aria-busy="true">
        <div v-for="n in 4" :key="`token-skeleton-${n}`" class="spisok-tokenov__skeleton-row">
          <GhSkeleton variant="text" width="30%" height="12" />
          <GhSkeleton variant="text" width="20%" height="12" />
          <GhSkeleton variant="text" width="18%" height="12" />
          <GhSkeleton variant="text" width="16%" height="12" />
        </div>
      </div>

      <GhEmptyState
        v-else-if="spisok.length === 0"
        icon="key"
        :title="t('settings.tokens.empty')"
      >
        <template #actions>
          <GhButton
            variant="primary"
            icon="plus"
            :label="t('settings.tokens.new')"
            @click="otkrytSozdanie"
          />
        </template>
      </GhEmptyState>

      <div v-else class="spisok-tokenov__scroll">
        <table class="spisok-tokenov__table">
          <thead>
            <tr>
              <th scope="col">{{ t("settings.tokens.name") }}</th>
              <th scope="col">{{ t("account.lichniy_tokeni.fields.token_hint") }}</th>
              <th scope="col">{{ t("account.lichniy_tokeni.obyom_prav.caption") }}</th>
              <th scope="col">{{ t("account.lichniy_tokeni.fields.provereno_v") }}</th>
              <th scope="col" class="spisok-tokenov__th-actions">
                <span class="gh-visually-hidden">{{ t("common.actions") }}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="token in spisok" :key="token.id">
              <td>
                <div class="spisok-tokenov__name">{{ token.nazvanie }}</div>
                <GhLabel
                  v-if="token.bezPravNaRedaktirovanie"
                  variant="danger"
                  icon="alert"
                  :label="t('account.lichniy_tokeni.hints.bez_prav')"
                />
              </td>
              <td>
                <code class="gh-mono">{{ token.tokenHint }}</code>
              </td>
              <td>{{ pravaTokena(token) }}</td>
              <td class="gh-mono">{{ dataProverki(token) }}</td>
              <td class="spisok-tokenov__td-actions">
                <GhActionMenu
                  :items="punktyMenu()"
                  :aria-label="t('common.actions')"
                  :disabled="dejstvieId === token.id"
                  @select="vybratDeistvie(token, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <FormaDobavleniyaLichnogoTokena @sozdan="onSozdan" />

    <GhDialog
      v-model="dialogUdaleniya"
      :title="t('settings.tokens.delete_title')"
      persistent
    >
      <div class="spisok-tokenov__dialog">
        <p class="spisok-tokenov__dialog-text">{{ opisanieUdaleniya }}</p>

        <GhFormField
          :label="t('settings.tokens.delete_confirm')"
          controlId="token-delete-name"
        >
          <template #default="{ ariaDescribedby, ariaInvalid }">
            <GhInput
              id="token-delete-name"
              v-model="podtverzhdenieImeni"
              :aria-describedby="ariaDescribedby"
              :aria-invalid="ariaInvalid"
              autocomplete="off"
            />
          </template>
        </GhFormField>
      </div>

      <template #footer>
        <GhButton
          variant="default"
          :label="t('common.buttons.cancel')"
          @click="zakrytUdalenie"
        />
        <GhButton
          variant="danger"
          icon="trash"
          :label="t('settings.tokens.delete_confirm')"
          :disabled="!mozhnoUdalit"
          :loading="udalyaemiyToken !== null && dejstvieId === udalyaemiyToken.id"
          @click="udalitToken"
        />
      </template>
    </GhDialog>
  </GhBox>
</template>

<style scoped>
.spisok-tokenov__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.spisok-tokenov__title {
  font-weight: var(--fontWeight-semibold);
}

.spisok-tokenov__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spisok-tokenov__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.spisok-tokenov__banner-text {
  margin: 0 0 8px;
}

.spisok-tokenov__secret {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.spisok-tokenov__secret-value {
  flex: 1 1 220px;
  min-width: 0;
  padding: 4px 8px;
  overflow-wrap: anywhere;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
}

.spisok-tokenov__result-name {
  font-weight: var(--fontWeight-semibold);
}

.spisok-tokenov__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spisok-tokenov__skeleton-row {
  display: flex;
  gap: 24px;
}

.spisok-tokenov__scroll {
  overflow-x: auto;
}

.spisok-tokenov__table {
  width: 100%;
  border-collapse: collapse;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
}

.spisok-tokenov__table th {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  text-align: left;
  white-space: nowrap;
}

.spisok-tokenov__table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-muted);
  vertical-align: middle;
}

.spisok-tokenov__table tbody tr:hover {
  background-color: var(--bgColor-neutral-muted);
}

.spisok-tokenov__name {
  font-weight: var(--fontWeight-semibold);
  overflow-wrap: anywhere;
}

.spisok-tokenov__th-actions,
.spisok-tokenov__td-actions {
  width: 48px;
  text-align: right;
}

.spisok-tokenov__dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.spisok-tokenov__dialog-text {
  margin: 0;
  color: var(--fgColor-muted);
}
</style>
