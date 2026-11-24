<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Notify } from "quasar";
import i18n from "@/bootstrap/translator";
import { useFormaDobavleniyaUnitaStore } from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
import PeremenayaKonfiga from "@/modules/unit/view/Unit/Konfig/PeremenayaKonfiga.vue";
import FaylVoluma from "@/modules/unit/view/Unit/Konfig/FaylVoluma.vue";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {
  GhBanner,
  GhButton,
  GhDialog,
  GhFormField,
  GhInput,
  GhSelect,
} from "@/components/ui";

const addFormStore = useFormaDobavleniyaUnitaStore();
const {
  form,
  oshibkaOtBackenda,
  loader,
  vetki,
  initPeremenie,
  dubli,
  vetkaZashishenaDlyaFormi,
  estTokenSPushomDlyaVibrannogoProekta,
  dialogOtkrit,
  novayaVetka,
  loaderSozdaniyaVetki,
  oshibkaSozdaniyaVetki,
} = storeToRefs(addFormStore);

const unitiStore = useSpisokUnitovStore();
const { proekti } = storeToRefs(unitiStore);

const emit = defineEmits<{
  formaBilaOtpravlena: [];
}>();

const projectOptions = computed<{ value: string; label: string }[]>(() =>
  proekti.value.spisok.map((proekt) => ({
    value: proekt.value,
    label: proekt.label,
  })),
);

/** Можно ли отправить форму: выбран проект, ветка и не идёт загрузка. */
const mozhnoOtpravit = computed<boolean>(
  () =>
    Boolean(form.value.projectId) &&
    form.value.branch.trim() !== "" &&
    !loader.value,
);

/** Подсказка кнопки создания ветки: доступна ли она для выбранного проекта. */
const podskazkaSozdaniyaVetki = computed<string>(() =>
  form.value.projectId && estTokenSPushomDlyaVibrannogoProekta.value
    ? i18n.global.t("unit.form_add_unit.hints.create_branch")
    : i18n.global.t("unit.form_add_unit.hints.create_branch_disabled"),
);

/** Ошибка базовой ветки в диалоге создания ветки. */
const oshibkaOsnovi = computed<string>(() =>
  novayaVetka.value.osnova.trim() === ""
    ? i18n.global.t("unit.form_add_unit.dialog.validation.required")
    : "",
);

/** Ошибка названия новой ветки в диалоге создания ветки. */
const oshibkaNazvaniya = computed<string>(() => {
  const nazvanie = novayaVetka.value.nazvanie.trim();

  if (nazvanie === "") {
    return i18n.global.t("unit.form_add_unit.dialog.validation.required");
  }

  if (/\s/u.test(nazvanie)) {
    return i18n.global.t("unit.form_add_unit.dialog.validation.no_whitespace");
  }

  return "";
});

/** Можно ли создать ветку: оба поля заполнены корректно и нет загрузки. */
const mozhnoSozdatVetku = computed<boolean>(
  () =>
    oshibkaOsnovi.value === "" &&
    oshibkaNazvaniya.value === "" &&
    !loaderSozdaniyaVetki.value,
);

async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response?.status === "success") {
    // Юнит создан штатно, но ветка защищена: редактирование файлов
    // в нём будет запрещено. Ничего не блокируем, только предупреждаем.
    if (response.data.vetkaZashishena) {
      Notify.create({
        type: "warning",
        message: i18n.global.t("unit.form_add_unit.messages.vetka_zashishena_created"),
      });
    }

    emit("formaBilaOtpravlena");
    addFormStore.zakritFormu();
  }
}

function filterSpiskaVetok(val: string | null, update: (cb: () => void) => void): void {
  vetki.value.query = val ?? "";
  update(() => void addFormStore.poluchitVetki());
}

/**
 * Обработать выбор ветки: обновить модель, перезагрузить конфиг и
 * поискать юниты-дубли в выбранной ветке.
 */
function vetkaVibrana(): void {
  void addFormStore.poluchitPeremenieKonfiga();

  if (form.value.branch.trim() !== "") {
    void addFormStore.naitiDubliUnita();
  } else {
    addFormStore.ochistitDubliUnita();
  }
}

function izmenitVetku(znachenie: string | number | null): void {
  form.value.branch = znachenie === null ? "" : String(znachenie);
  vetkaVibrana();
}

/**
 * Выбрать базовую ветку для новой ветки.
 *
 * Приоритет: `main`, затем `master`, затем текущая выбранная ветка, затем
 * первая доступная в списке.
 */
function osnovaDlyaNovoiVetki(): string {
  const spisok = vetki.value.spisok.map((vetka) => vetka.value);

  if (spisok.includes("main")) {
    return "main";
  }

  if (spisok.includes("master")) {
    return "master";
  }

  if (form.value.branch) {
    return form.value.branch;
  }

  return spisok[0] ?? "";
}

/** Открыть диалог создания ветки с базой, выбранной эвристикой. */
function otkritDialogSozdaniyaVetki(): void {
  addFormStore.otkritDialogSozdaniyaVetki();
  novayaVetka.value.osnova = osnovaDlyaNovoiVetki();
}

/** Синхронизировать состояние диалога создания ветки с формой. */
function dialogVetkiObnovlen(otkrit: boolean): void {
  if (otkrit) {
    addFormStore.dialogOtkrit = true;
    return;
  }

  addFormStore.zakritDialogSozdaniyaVetki();
}

async function sozdatVetku(): Promise<void> {
  await addFormStore.sozdatVetku(
    novayaVetka.value.nazvanie,
    novayaVetka.value.osnova,
  );
}

function otkritStranizuSDublem(dubl: Unit): void {
  window.open("/unit/list?id=" + dubl.id, "_blank");
}

function projectChanged(znachenie: string | number | null) {
  const projectId = znachenie === null ? "" : String(znachenie);
  form.value.projectId = projectId;

  const proekt = proekti.value.spisok.find((item) => item.value === projectId);

  if (proekt) {
    form.value.memoryLimit = proekt.memoryLimit;
  }

  if (projectId) {
    // Поиск относится к прежнему проекту — сбрасываем запрос, но не сам
    // список: очистка опций на лету возвращает цикл фильтрации QSelect.
    vetki.value.query = "";
    void addFormStore.poluchitVetki();
  } else {
    addFormStore.sbrositVetki();
  }
}

function izmenitNazvanie(znachenie: string | number | null) {
  form.value.unitName = znachenie === null ? "" : String(znachenie);
}

function izmenitPamyat(znachenie: string | number | null) {
  form.value.memoryLimit = Number(znachenie ?? 0);
}
</script>

<template>
  <div class="unit-form">
    <GhFormField :label="$t('unit.form_add_unit.fields.labels.project')">
      <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
        <GhSelect
          :id="controlId"
          :aria-describedby="ariaDescribedby"
          :aria-invalid="ariaInvalid"
          :model-value="form.projectId"
          :options="projectOptions"
          :placeholder="$t('unit.form_add_unit.fields.labels.project')"
          @update:model-value="projectChanged"
        />
      </template>
    </GhFormField>

    <div v-if="form.projectId" class="unit-form__branch">
      <GhFormField :label="$t('unit.form_add_unit.fields.labels.branch')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :loading="vetki.loader"
            :model-value="form.branch"
            :options="vetki.spisok"
            :placeholder="$t('unit.form_add_unit.fields.labels.branch')"
            clearable
            use-input
            hide-selected
            fill-input
            @filter="filterSpiskaVetok"
            @update:model-value="izmenitVetku"
          >
            <template #no-option>
              <div class="unit-form__muted">{{ $t("common.no_results") }}</div>
            </template>

            <template #append>
              <GhButton
                variant="invisible"
                size="sm"
                icon="git-branch"
                :disabled="!form.projectId || !estTokenSPushomDlyaVibrannogoProekta"
                @click="otkritDialogSozdaniyaVetki"
              >
                <q-tooltip>{{ podskazkaSozdaniyaVetki }}</q-tooltip>
              </GhButton>
            </template>
          </GhSelect>
        </template>
      </GhFormField>
    </div>

    <GhBanner
      v-if="vetkaZashishenaDlyaFormi"
      variant="attention"
      :title="$t('unit.form_add_unit.messages.vetka_zashishena')"
    />

    <GhBanner
      v-if="dubli.spisok.length > 0"
      variant="attention"
      :title="$t('unit.form_add_unit.messages.duplicates')"
    >
      <div class="unit-form__duplicates">
        <GhButton
          v-for="duble in dubli.spisok"
          :key="duble.id"
          size="sm"
          icon="link"
          :label="duble.name"
          @click="otkritStranizuSDublem(duble)"
        />
      </div>
    </GhBanner>

    <GhFormField :label="$t('unit.form_add_unit.fields.labels.unitName')" required>
      <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
        <GhInput
          :id="controlId"
          :aria-describedby="ariaDescribedby"
          :aria-invalid="ariaInvalid"
          :model-value="form.unitName"
          @update:model-value="izmenitNazvanie"
        />
      </template>
    </GhFormField>

    <GhFormField :label="$t('unit.form_add_unit.fields.labels.unitContainerMemory')">
      <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
        <GhInput
          :id="controlId"
          type="number"
          :aria-describedby="ariaDescribedby"
          :aria-invalid="ariaInvalid"
          :model-value="form.memoryLimit"
          @update:model-value="izmenitPamyat"
        />
      </template>
    </GhFormField>

    <template v-if="form.peremenieKonfiga.length > 0">
      <template v-for="peremenaya in form.peremenieKonfiga" :key="peremenaya.konfig.id">
        <PeremenayaKonfiga :peremenaya="peremenaya" />
      </template>
    </template>

    <template v-if="form.volumes.length > 0">
      <div class="unit-form__section-title">{{ $t("unit.form_volume.title") }}</div>
      <template v-for="volume in form.volumes" :key="volume.volume.dir">
        <FaylVoluma
          :volume="volume"
          @zagruzit="addFormStore.zagruzitFaylToma"
          @udalit="addFormStore.udalitFaylToma"
          @vibrat="addFormStore.vibratFaylProekta"
          @ochistit="addFormStore.ochistitFaylToma"
        />
      </template>
    </template>

    <p
      v-if="initPeremenie && form.peremenieKonfiga.length == 0 && form.volumes.length == 0"
      class="unit-form__muted"
    >
      {{ $t("unit.form_add_unit.messages.no_variables") }}
    </p>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="unit-form__actions">
      <GhButton
        variant="default"
        :label="$t('common.buttons.close')"
        :disabled="loader || dubli.loader"
        @click="addFormStore.zakritFormu()"
      />
      <GhButton
        variant="primary"
        icon="plus"
        :label="$t('common.buttons.ok')"
        :loading="loader"
        :disabled="!mozhnoOtpravit"
        @click="otpravitFormu"
      />
    </div>

    <GhDialog
      :model-value="dialogOtkrit"
      :title="$t('unit.form_add_unit.dialog.title')"
      @update:model-value="dialogVetkiObnovlen"
    >
      <div class="unit-form__dialog-body">
        <GhFormField
          :label="$t('unit.form_add_unit.dialog.fields.labels.base_branch')"
          :error="oshibkaOsnovi"
        >
          <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
            <GhInput
              :id="controlId"
              :aria-describedby="ariaDescribedby"
              :aria-invalid="ariaInvalid"
              v-model="novayaVetka.osnova"
            />
          </template>
        </GhFormField>

        <GhFormField
          :label="$t('unit.form_add_unit.dialog.fields.labels.new_branch_name')"
          :error="oshibkaNazvaniya"
        >
          <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
            <GhInput
              :id="controlId"
              :aria-describedby="ariaDescribedby"
              :aria-invalid="ariaInvalid"
              v-model="novayaVetka.nazvanie"
            />
          </template>
        </GhFormField>

        <GhBanner v-if="oshibkaSozdaniyaVetki" variant="danger">
          {{ oshibkaSozdaniyaVetki }}
        </GhBanner>
      </div>

      <template #footer>
        <GhButton
          variant="default"
          :label="$t('common.buttons.cancel')"
          :disabled="loaderSozdaniyaVetki"
          @click="addFormStore.zakritDialogSozdaniyaVetki()"
        />
        <GhButton
          variant="primary"
          :label="$t('unit.form_add_unit.dialog.buttons.create')"
          :loading="loaderSozdaniyaVetki"
          :disabled="!mozhnoSozdatVetku"
          @click="sozdatVetku"
        />
      </template>
    </GhDialog>
  </div>
</template>

<style scoped>
.unit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-form__branch {
  min-width: 0;
}

.unit-form__dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-form__muted {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-form__section-title {
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.unit-form__duplicates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.unit-form__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
