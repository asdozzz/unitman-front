<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhInput,
    GhSelect,
    GhSkeleton,
    GhSwitch,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import {
    MAX_PROEKTOV_WORKSPACE,
    useStorFormiSozdaniyaWorkspace,
} from "@/modules/opencode/store/StorFormiSozdaniyaWorkspace";
import { proveritNazvanieVetki } from "@/modules/unit/utils/vetki";
import { soderzhitZashishennuyuVetku } from "@/modules/unit/utils/zashishennieVetki";

/**
 * Диалог создания workspace.
 *
 * Для каждого выбранного проекта форма собирает базовую ветку и имя
 * локальной ветки: ветки создаются в хранилище двухфазно перед созданием
 * workspace. Навигация остаётся за списком — компонент только сообщает
 * идентификатор созданного workspace.
 */
const emit = defineEmits<{ sozdan: [id: string] }>();

const { t } = useI18n();

const formaStore = useStorFormiSozdaniyaWorkspace();
const {
    otkrita,
    name,
    credentialId,
    model,
    dostupnieModeli,
    modelPoUmolchaniyu,
    projectIds,
    prompt,
    proekti,
    loaderProektov,
    oshibkaZagruzkiProektov,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
    bazovieVetki,
    lokalnieVetki,
    etapSozdaniya,
    proektiBezPushTokena,
    vetkiProektov,
    oshibkiVetokProektov,
} = storeToRefs(formaStore);

/** Опции реквизитов для GhSelect. */
const optsRekvizitov = computed<GhSelectOption[]>(() =>
    rekvizity.value.map((rekvizit) => ({
        value: rekvizit.id,
        label: rekvizit.name,
    })),
);

/** Опции моделей выбранных реквизитов с подписью дефолтной. */
const optsModelei = computed<GhSelectOption[]>(() => {
    const marker = t("opencode.rekvizity.default_marker");
    const poUmolchaniyu = modelPoUmolchaniyu.value;

    return dostupnieModeli.value.map((nazvanie) => ({
        value: nazvanie,
        label: nazvanie === poUmolchaniyu ? `${nazvanie} (${marker})` : nazvanie,
    }));
});

/** Смена реквизитов: стор сбрасывает модель на их дефолт. */
function izmenitRekvizity(value: string | number | null): void {
    formaStore.ustanovitRekvizity(value === null ? "" : String(value));
}

/** Выбор модели для создаваемого workspace. */
function izmenitModel(value: string | number | null): void {
    formaStore.ustanovitModel(value === null ? null : String(value));
}

/** Имена выбранных проектов без личного токена с правом push. */
const imenaProektovBezTokena = computed<string>(() =>
    proektiBezPushTokena.value
        .map((projectId) => imyaProekta(projectId))
        .join(", "),
);

/** Подпись кнопки сохранения по текущему этапу. */
const podpisKnopki = computed<string>(() => {
    if (etapSozdaniya.value === "vetki") {
        return t("opencode.workspace.form.messages.creating_branches");
    }

    if (etapSozdaniya.value === "workspace") {
        return t("opencode.workspace.form.messages.creating_workspace");
    }

    return t("opencode.workspace.form.buttons.ok");
});

/** Таймеры debounce для фильтра веток, по одному на проект. */
const taimeryVetok = new Map<string, ReturnType<typeof setTimeout>>();

async function sozdat() {
    const id = await formaStore.sozdatIDobavitVSpiske();

    if (id !== null) {
        emit("sozdan", id);
    }
}

/** Название проекта по идентификатору. */
function imyaProekta(projectId: string): string {
    return proekti.value.find((proekt) => proekt.id === projectId)?.name ?? projectId;
}

/** Ветки проекта из кеша стора. */
function vetkiProekta(projectId: string): string[] {
    return vetkiProektov.value[projectId]?.spisok ?? [];
}

/** Опции базовой ветки в формате GhSelect. */
function optsVetok(projectId: string): GhSelectOption[] {
    return vetkiProekta(projectId).map((name) => ({ value: name, label: name }));
}

/** Идёт ли загрузка веток проекта. */
function loaderVetok(projectId: string): boolean {
    return vetkiProektov.value[projectId]?.loader ?? false;
}

/** Ошибка загрузки веток проекта, если была. */
function oshibkaVetok(projectId: string): string | null {
    return oshibkiVetokProektov.value[projectId] ?? null;
}

/**
 * Ошибка имени локальной ветки: некорректное имя или защищённая ветка.
 *
 * Возвращает пустую строку, если имя корректно и не попадает под маски
 * защищённых веток проекта.
 */
function oshibkaLokalnoyVetki(proekt: Proekt): string {
    const nazvanie = lokalnieVetki.value[proekt.id] ?? "";
    const klyuchOshibki = proveritNazvanieVetki(nazvanie);

    if (klyuchOshibki !== "") {
        return t(klyuchOshibki);
    }

    if (soderzhitZashishennuyuVetku(proekt.zashishennieVetki, nazvanie) !== null) {
        return t("opencode.workspace.form.errors.vetka_zashishena");
    }

    return "";
}

/**
 * Текст ошибки строки проекта: загрузка веток либо имя локальной ветки.
 *
 * Пустая строка означает, что ошибок нет и элемент ошибки не рендерится.
 */
function oshibkaRyada(proekt: Proekt): string {
    const oshibkaZagruzki = oshibkaVetok(proekt.id);

    if (oshibkaZagruzki !== null) {
        return t("opencode.workspace.form.error_project_branches") + ": " + oshibkaZagruzki;
    }

    return oshibkaLokalnoyVetki(proekt);
}

/** Привести значение GhInput к строке/null для стора. */
function obnovitLokalnuyuVetku(projectId: string, value: string | number | null): void {
    if (value === null) {
        formaStore.ustanovitLokalnuyuVetku(projectId, null);

        return;
    }

    formaStore.ustanovitLokalnuyuVetku(projectId, String(value));
}

/**
 * Фильтр веток проекта с debounce и защитой от гонок в сторе.
 *
 * Пока пользователь печатает, запросы не летят на каждый символ; стор
 * дополнительно отбрасывает устаревшие ответы по номеру запроса.
 */
function filterVetokProekta(
    projectId: string,
    val: string,
    update: (callback: () => void) => void,
): void {
    update(() => {
        // Опции приходят из реактивного стора, локально фильтровать не нужно.
    });

    const query = (val ?? "").trim();
    const suschestvuyushiy = taimeryVetok.get(projectId);

    if (suschestvuyushiy !== undefined) {
        clearTimeout(suschestvuyushiy);
    }

    taimeryVetok.set(projectId, setTimeout(() => {
        taimeryVetok.delete(projectId);
        void formaStore.poluchitVetkiProekta(projectId, query);
    }, 250));
}

onBeforeUnmount(() => {
    taimeryVetok.forEach((timer) => clearTimeout(timer));
    taimeryVetok.clear();
});
</script>

<template>
  <GhDialog
      :model-value="otkrita"
      :title="$t('opencode.workspace.form.caption')"
      width="800px"
      persistent
      @update:model-value="formaStore.zakrit()"
  >
    <div class="opencode-form opencode-form--workspace">
      <GhFormField
          :label="$t('opencode.workspace.form.fields.name')"
          :caption="$t('opencode.workspace.form.hint_name')"
      >
        <GhInput v-model="name" :maxlength="256" />
      </GhFormField>

      <GhFormField :label="$t('opencode.workspace.form.fields.credential')">
        <GhSelect
            :model-value="credentialId"
            :options="optsRekvizitov"
            @update:model-value="izmenitRekvizity"
        />
      </GhFormField>

      <GhFormField :label="$t('opencode.rekvizity.fields.default_model')">
        <GhSelect
            :model-value="model"
            :options="optsModelei"
            use-input
            hide-selected
            fill-input
            :placeholder="$t('opencode.rekvizity.fields.default_model')"
            @update:model-value="izmenitModel"
        />
      </GhFormField>

      <GhFormField
          :label="$t('opencode.workspace.form.fields.projects')"
          :caption="$t('opencode.workspace.form.hint_projects', { max: MAX_PROEKTOV_WORKSPACE, count: projectIds.length })"
      >
        <div class="opencode-form__switch-list">
          <template v-if="loaderProektov">
            <GhSkeleton v-for="n in 3" :key="'project-skeleton-' + n" height="28px" />
          </template>

          <template v-else>
            <template v-if="proekti.length > 0">
              <div class="opencode-form__projects-header">
                <span>{{ $t('opencode.workspace.form.columns.project') }}</span>
                <span>{{ $t('opencode.workspace.form.columns.base_branch') }}</span>
                <span>{{ $t('opencode.workspace.form.columns.local_branch') }}</span>
              </div>
              <p class="opencode-form__hint">{{ $t('opencode.workspace.form.hint_branches') }}</p>
            </template>

            <div
                v-for="proekt in proekti"
                :key="proekt.id"
                class="opencode-form__project"
            >
              <div class="opencode-form__project-row">
                <GhSwitch
                    :model-value="projectIds.includes(proekt.id)"
                    :label="proekt.name"
                    :description="proekt.code"
                    @update:model-value="formaStore.perekluchitProekt(proekt.id, $event)"
                />

                <template v-if="projectIds.includes(proekt.id)">
                  <GhSelect
                      size="sm"
                      use-input
                      hide-selected
                      fill-input
                      clearable
                      :model-value="bazovieVetki[proekt.id] ?? ''"
                      :options="optsVetok(proekt.id)"
                      :loading="loaderVetok(proekt.id)"
                      :placeholder="$t('opencode.workspace.form.fields.base_branch')"
                      @filter="(val, update) => filterVetokProekta(proekt.id, val, update)"
                      @update:model-value="(value) => formaStore.ustanovitBazovuyuVetku(proekt.id, value === null ? null : String(value))"
                  >
                    <template #no-option>
                      <q-item>
                        <q-item-section class="opencode-form__muted">
                          {{ $t('opencode.workspace.form.no_project_branches') }}
                        </q-item-section>
                      </q-item>
                    </template>
                  </GhSelect>

                  <GhInput
                      class="opencode-form__mono"
                      :label="$t('opencode.workspace.form.fields.local_branch')"
                      :maxlength="255"
                      size="sm"
                      :model-value="lokalnieVetki[proekt.id] ?? ''"
                      @update:model-value="(value) => obnovitLokalnuyuVetku(proekt.id, value)"
                  />
                </template>
              </div>

              <p
                  v-if="projectIds.includes(proekt.id) && oshibkaRyada(proekt) !== ''"
                  class="opencode-form__row-error"
              >
                {{ oshibkaRyada(proekt) }}
              </p>
            </div>
          </template>
        </div>
      </GhFormField>

      <GhFormField
          :label="$t('opencode.workspace.form.fields.prompt')"
          :caption="$t('opencode.workspace.form.hint_prompt')"
      >
        <!-- Промпт бывает многострочным: GhInput в режиме textarea (F2). -->
        <GhInput v-model="prompt" type="textarea" autogrow />
      </GhFormField>

      <GhBanner v-if="proektiBezPushTokena.length > 0" variant="danger">
        {{ $t('opencode.workspace.form.errors.token_required', { projects: imenaProektovBezTokena }) }}
      </GhBanner>

      <GhBanner v-if="oshibkaZagruzkiProektov" variant="danger">
        {{ oshibkaZagruzkiProektov }}
      </GhBanner>

      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
          :label="$t('common.buttons.cancel')"
          :disabled="loader"
          @click="formaStore.zakrit()"
      />
      <GhButton
          variant="primary"
          :label="podpisKnopki"
          :loading="loader"
          :disabled="!mozhnoSohranit"
          @click="sozdat()"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.opencode-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.opencode-form--workspace {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 4px;
}

.opencode-form__switch-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Шапка таблицы проектов: та же сетка, что и у строк. */
.opencode-form__projects-header,
.opencode-form__project-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.2fr) minmax(200px, 1fr) minmax(200px, 1fr);
  gap: 12px;
  align-items: center;
}

.opencode-form__projects-header {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--borderColor-muted);
}

.opencode-form__projects-header span {
  font-size: 12px;
  font-weight: 600;
  color: var(--fgColor-muted);
}

/* Общая подсказка по веткам вместо подписей у каждой строки. */
.opencode-form__hint {
  margin: 0 0 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-form__project {
  min-width: 0;
}

.opencode-form__row-error {
  margin: 2px 0 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
}

/* Узкий диалог: строки проектов встают в одну колонку. */
@media (max-width: 560px) {
  .opencode-form__projects-header {
    display: none;
  }

  .opencode-form__project-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

/* Оба поля веток в ряду — строго одна высота (компактная, 28px). */
/* Flex-обёртка GhInput не должна добавлять высоту поверх ряда. */
.opencode-form__project-row :deep(.gh-input) {
  height: var(--control-height-sm);
}

.opencode-form__project-row :deep(.gh-input .q-field) {
  flex: 1 1 auto;
  min-height: 0;
}

/* Имя локальной ветки — моноширинным шрифтом. */
.opencode-form__mono :deep(.q-field__native) {
  font-family: var(--fontStack-monospace);
}

/* Подпись GhInput внутри строки скрыта визуально; aria-label остаётся. */
.opencode-form__project-row :deep(.gh-input__label) {
  display: none;
}

/* Строки выбора проектов — 32px, выровнены по центру (F2). */
.opencode-form__switch-list :deep(.gh-switch) {
  min-height: 32px;
  align-items: center;
}

.opencode-form__muted {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
