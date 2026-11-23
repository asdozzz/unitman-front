<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhActionMenu,
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhIcon,
  GhSkeleton,
} from "@/components/ui";
import type { GhActionMenuItem } from "@/components/ui";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import type {
  KodProvayderaOpenCode,
  RekvizityOpenCode,
} from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import FormaRekvizitovOpenCode from "@/modules/account/view/AccountSettings/FormaRekvizitovOpenCode.vue";
import { convertDate } from "@/utils/dates";

const { t, te } = useI18n();

const storSpiska = useStorSpiskaRekvizitovOpenCode();
const formaStore = useFormaRekvizitovOpenCodeStore();

const { spisok, loaderSpiska, oshibkaZagruzki, udalyaemiId } = storeToRefs(storSpiska);

const dialogUdaleniya = ref<boolean>(false);
const udalyaemieRekvizity = ref<RekvizityOpenCode | null>(null);

/** Локализованное имя провайдера; при отсутствии ключа показывается код. */
function imyaProvaydera(kod: KodProvayderaOpenCode | string): string {
  const key = `opencode.providers.${kod}`;

  return te(key) ? t(key) : kod;
}

/** Модели реквизитов с подсветкой дефолтной. */
function modeliSDefoltom(rekvizity: RekvizityOpenCode): string[] {
  if (rekvizity.models.length === 0) {
    return rekvizity.defaultModel !== "" ? [rekvizity.defaultModel] : [];
  }

  return rekvizity.models;
}

function etoDefoltnayaModel(rekvizity: RekvizityOpenCode, model: string): boolean {
  return model === rekvizity.defaultModel;
}

const pokazatSkeletony = computed<boolean>(
  () => loaderSpiska.value && spisok.value.length === 0,
);

function punktyMenu(): GhActionMenuItem[] {
  return [
    {
      id: "edit",
      label: t("opencode.rekvizity.buttons.edit"),
      icon: "pencil",
    },
    {
      id: "delete",
      label: t("opencode.rekvizity.buttons.delete"),
      icon: "trash",
      danger: true,
      separatorBefore: true,
    },
  ];
}

function vybratDeistvie(
  rekvizity: RekvizityOpenCode,
  item: GhActionMenuItem,
): void {
  if (item.id === "edit") {
    formaStore.otkritIzmenenie(rekvizity);
    return;
  }

  if (item.id === "delete") {
    otkrytUdalenie(rekvizity);
  }
}

function otkrytSozdanie(): void {
  formaStore.otkritSozdanie();
}

function otkrytUdalenie(rekvizity: RekvizityOpenCode): void {
  udalyaemieRekvizity.value = rekvizity;
  dialogUdaleniya.value = true;
}

function zakrytUdalenie(): void {
  dialogUdaleniya.value = false;
  udalyaemieRekvizity.value = null;
}

async function udalitRekvizity(): Promise<void> {
  if (udalyaemieRekvizity.value === null) {
    return;
  }

  const otvet = await storSpiska.udalitRekvizity(udalyaemieRekvizity.value.id);

  if (otvet?.status === "success") {
    zakrytUdalenie();
  }
}

onMounted(() => {
  void storSpiska.poluchitSpisok();
});
</script>

<template>
  <GhBox padding="none">
    <template #header>
      <div class="rekvizity__header">
        <span class="rekvizity__title">{{ t("settings.opencode.title") }}</span>

        <div class="rekvizity__actions">
          <GhButton
            variant="default"
            size="sm"
            icon="sync"
            :aria-label="t('opencode.rekvizity.buttons.refresh')"
            :loading="loaderSpiska"
            @click="storSpiska.poluchitSpisok()"
          />
          <GhButton
            variant="primary"
            size="sm"
            icon="plus"
            :label="t('opencode.rekvizity.buttons.add')"
            :disabled="loaderSpiska"
            @click="otkrytSozdanie"
          />
        </div>
      </div>
    </template>

    <div class="rekvizity__content">
      <GhBanner
        v-if="oshibkaZagruzki"
        variant="danger"
        :title="t('settings.load_error')"
        class="rekvizity__banner"
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

      <div v-if="pokazatSkeletony" class="rekvizity__skeleton" aria-busy="true">
        <div v-for="n in 3" :key="`rekvizity-skeleton-${n}`" class="rekvizity__skeleton-row">
          <GhSkeleton variant="text" width="28%" height="12" />
          <GhSkeleton variant="text" width="26%" height="12" />
          <GhSkeleton variant="text" width="20%" height="12" />
          <GhSkeleton variant="text" width="16%" height="12" />
        </div>
      </div>

      <GhEmptyState
        v-else-if="spisok.length === 0"
        icon="cpu"
        :title="t('settings.opencode.empty')"
        :description="t('opencode.rekvizity.empty')"
      >
        <template #actions>
          <GhButton
            variant="primary"
            icon="plus"
            :label="t('opencode.rekvizity.buttons.add')"
            @click="otkrytSozdanie"
          />
        </template>
      </GhEmptyState>

      <div v-else class="rekvizity__scroll">
        <table class="rekvizity__table">
          <thead>
            <tr>
              <th scope="col">{{ t("opencode.rekvizity.form.fields.name") }}</th>
              <th scope="col">{{ t("opencode.rekvizity.form.fields.provider") }}</th>
              <th scope="col">{{ t("opencode.rekvizity.form.fields.url") }}</th>
              <th scope="col">{{ t("opencode.rekvizity.form.fields.models") }}</th>
              <th scope="col">{{ t("opencode.rekvizity.fields.api_key_hint") }}</th>
              <th scope="col">{{ t("opencode.rekvizity.fields.updated_at") }}</th>
              <th scope="col" class="rekvizity__th-actions">
                <span class="gh-visually-hidden">{{ t("common.actions") }}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="rekvizity in spisok" :key="rekvizity.id">
              <td>
                <div class="rekvizity__name">{{ rekvizity.name }}</div>
              </td>
              <td>
                <span class="rekvizity__provider">{{ imyaProvaydera(rekvizity.provider) }}</span>
              </td>
              <td>
                <span class="gh-mono rekvizity__url">{{ rekvizity.url }}</span>
              </td>
              <td>
                <div class="rekvizity__models">
                  <span
                    v-for="model in modeliSDefoltom(rekvizity)"
                    :key="model"
                    class="rekvizity__model"
                    :class="{ 'rekvizity__model--default': etoDefoltnayaModel(rekvizity, model) }"
                  >
                    <GhIcon
                      v-if="etoDefoltnayaModel(rekvizity, model)"
                      name="star-fill"
                      :size="12"
                      class="rekvizity__model-icon"
                    />
                    <span class="gh-mono">{{ model }}</span>
                    <span
                      v-if="etoDefoltnayaModel(rekvizity, model)"
                      class="rekvizity__model-marker"
                    >
                      {{ t("opencode.rekvizity.default_marker") }}
                    </span>
                  </span>
                </div>
              </td>
              <td>
                <code class="gh-mono">{{ rekvizity.apiKeyHint }}</code>
              </td>
              <td class="gh-mono">{{ convertDate(rekvizity.updatedAt) }}</td>
              <td class="rekvizity__td-actions">
                <GhActionMenu
                  :items="punktyMenu()"
                  :aria-label="t('common.actions')"
                  :disabled="udalyaemiId === rekvizity.id"
                  @select="vybratDeistvie(rekvizity, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <FormaRekvizitovOpenCode />

    <GhDialog
      v-model="dialogUdaleniya"
      :title="t('opencode.rekvizity.delete.caption')"
      persistent
    >
      <p class="rekvizity__dialog-text">
        {{ t("opencode.rekvizity.delete.message") }}
      </p>

      <template #footer>
        <GhButton
          variant="default"
          :label="t('common.buttons.cancel')"
          @click="zakrytUdalenie"
        />
        <GhButton
          variant="danger"
          icon="trash"
          :label="t('opencode.rekvizity.buttons.delete')"
          :loading="udalyaemieRekvizity !== null && udalyaemiId === udalyaemieRekvizity.id"
          @click="udalitRekvizity"
        />
      </template>
    </GhDialog>
  </GhBox>
</template>

<style scoped>
.rekvizity__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.rekvizity__title {
  font-weight: var(--fontWeight-semibold);
}

.rekvizity__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rekvizity__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.rekvizity__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rekvizity__skeleton-row {
  display: flex;
  gap: 24px;
}

.rekvizity__scroll {
  overflow-x: auto;
}

.rekvizity__table {
  width: 100%;
  border-collapse: collapse;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
}

.rekvizity__table th {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  text-align: left;
  white-space: nowrap;
}

.rekvizity__table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-muted);
  vertical-align: middle;
}

.rekvizity__table tbody tr:hover {
  background-color: var(--bgColor-neutral-muted);
}

.rekvizity__name {
  font-weight: var(--fontWeight-semibold);
  overflow-wrap: anywhere;
}

.rekvizity__provider {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.rekvizity__models {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 320px;
}

.rekvizity__model {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
  overflow-wrap: anywhere;
}

.rekvizity__model--default {
  border-color: var(--borderColor-accent-emphasis);
  background-color: var(--bgColor-accent-muted);
}

.rekvizity__model-icon {
  flex-shrink: 0;
  color: var(--fgColor-accent);
}

.rekvizity__model-marker {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.rekvizity__url {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.rekvizity__th-actions,
.rekvizity__td-actions {
  width: 48px;
  text-align: right;
}

.rekvizity__dialog-text {
  margin: 0;
  color: var(--fgColor-muted);
}
</style>
