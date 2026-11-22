<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import {
  GhActionMenu,
  GhAvatar,
  GhBanner,
  GhBox,
  GhButton,
  GhCheckbox,
  GhCounter,
  GhDialog,
  GhEmptyState,
  GhFormField,
  GhIcon,
  GhInput,
  GhKbd,
  GhLabel,
  GhPageHeader,
  GhSegmentedControl,
  GhSelect,
  GhSideNav,
  GhSkeleton,
  GhSwitch,
  GhTable,
  GhUnderlineNav,
  type GhActionMenuItem,
  type GhNavItem,
  type GhSegmentedOption,
  type GhSelectOption,
  type GhSideNavGroup,
  type GhTableColumn,
  type OcticonName,
} from "@/components/ui";

const { t } = useI18n();
const $q = useQuasar();

const temaTemnaya = computed<boolean>(() => $q.dark.isActive);

function pereklyuchitTemu(): void {
  $q.dark.toggle();
}

// --- Иконки ---------------------------------------------------------------
const ikonki: { name: OcticonName; label: string }[] = [
  { name: "mark-github", label: "mark-github" },
  { name: "repo", label: "repo" },
  { name: "git-pull-request", label: "git-pull-request" },
  { name: "issue-opened", label: "issue-opened" },
  { name: "check-circle", label: "check-circle" },
  { name: "alert", label: "alert" },
  { name: "gear", label: "gear" },
  { name: "x", label: "x" },
];

// --- Поля ввода -----------------------------------------------------------
const poisk = ref<string>("");
const pochetnyyEmail = ref<string>("octocat@github.com");
const poleSOshibkoy = ref<string>("invalid-address");
const zablokirovannoePole = ref<string>("");
const parol = ref<string>("secret");
const parolViden = ref<boolean>(false);
const opisanieZadachi = ref<string>(t("ui_kit.demo.textarea_value"));
const opisanieSOshibkoy = ref<string>("");

// --- GhCheckbox -----------------------------------------------------------
const tolkoAktivnye = ref<boolean>(true);
const promezhutochnoeSostoyanie = ref<boolean>(false);
const nedostupnyyChekboks = ref<boolean>(false);

function pereklyuchitVidimostParolya(): void {
  parolViden.value = !parolViden.value;
}

// --- Форма ----------------------------------------------------------------
const nik = ref<string>("octocat");

// --- Вкладки --------------------------------------------------------------
const vkladka = ref<string>("overview");

const vkladki = computed<GhNavItem[]>(() => [
  {
    name: "overview",
    label: t("ui_kit.demo.tab_overview"),
    icon: "book",
    count: 12,
  },
  {
    name: "activity",
    label: t("ui_kit.demo.tab_activity"),
    icon: "pulse",
  },
  {
    name: "settings",
    label: t("ui_kit.demo.tab_settings"),
    icon: "gear",
  },
  {
    name: "disabled",
    label: t("ui_kit.demo.tab_disabled"),
    icon: "lock",
    disabled: true,
  },
]);

// --- Таблица --------------------------------------------------------------
type StrokTablitsi = Record<string, unknown> & {
  id: number;
  repo: string;
  status: string;
  updated: string;
};

const strokiTablitsi = computed<StrokTablitsi[]>(() => [
  {
    id: 1,
    repo: "unitman-front",
    status: t("ui_kit.demo.status_open"),
    updated: t("ui_kit.demo.time_5m"),
  },
  {
    id: 2,
    repo: "unitman-api",
    status: t("ui_kit.demo.status_in_progress"),
    updated: t("ui_kit.demo.time_20m"),
  },
  {
    id: 3,
    repo: "unitman-runner",
    status: t("ui_kit.demo.status_closed"),
    updated: t("ui_kit.demo.time_yesterday"),
  },
  {
    id: 4,
    repo: "unitman-docs",
    status: t("ui_kit.demo.status_open"),
    updated: t("ui_kit.demo.time_2d"),
  },
]);

const kolonkiTablitsi = computed<GhTableColumn<StrokTablitsi>[]>(() => [
  {
    name: "repo",
    label: t("ui_kit.demo.repo"),
    field: "repo",
    align: "left",
    sortable: true,
  },
  {
    name: "status",
    label: t("ui_kit.demo.status"),
    field: "status",
    align: "left",
  },
  {
    name: "updated",
    label: t("ui_kit.demo.updated"),
    field: "updated",
    align: "right",
    sortable: true,
  },
]);

// --- Диалог ---------------------------------------------------------------
const dialogOtkrit = ref<boolean>(false);

// --- Меню действий --------------------------------------------------------
const posledneeDeistvie = ref<string>("");

const punktyMenyu = computed<GhActionMenuItem[]>(() => [
  { id: "edit", label: t("ui_kit.demo.action_edit"), icon: "pencil" },
  { id: "copy", label: t("ui_kit.demo.action_copy_link"), icon: "link" },
  { id: "download", label: t("ui_kit.demo.action_download"), icon: "download" },
  {
    id: "delete",
    label: t("ui_kit.demo.action_delete"),
    icon: "trash",
    danger: true,
    separatorBefore: true,
  },
  {
    id: "locked",
    label: t("ui_kit.demo.action_locked"),
    icon: "lock",
    disabled: true,
  },
]);

function obrabotatDeistvie(item: GhActionMenuItem): void {
  posledneeDeistvie.value = item.label;
}

// --- GhAvatar -------------------------------------------------------------
const avatary: { name: string }[] = [
  { name: "Octocat" },
  { name: "Hubot" },
  { name: "Mona" },
];

// --- GhSideNav ------------------------------------------------------------
const aktivnyyPunkt = ref<string>("home");
const sajdbarSvernut = ref<boolean>(false);

const gruppyNavigacii = computed<GhSideNavGroup[]>(() => [
  {
    id: "main",
    label: t("ui_kit.demo.side_group_main"),
    items: [
      {
        id: "home",
        label: t("ui_kit.demo.side_home"),
        icon: "home",
        counter: 4,
      },
      {
        id: "units",
        label: t("ui_kit.demo.side_units"),
        icon: "rocket",
        counter: 12,
      },
      {
        id: "settings",
        label: t("ui_kit.demo.side_settings"),
        icon: "gear",
      },
    ],
  },
  {
    id: "admin",
    label: t("ui_kit.demo.side_group_admin"),
    items: [
      {
        id: "accounts",
        label: t("ui_kit.demo.side_accounts"),
        icon: "people",
      },
      {
        id: "projects",
        label: t("ui_kit.demo.side_projects"),
        icon: "project",
      },
      {
        id: "init",
        label: t("ui_kit.demo.side_init"),
        icon: "tools",
        disabled: true,
      },
    ],
  },
]);

function obrabotatVyborPunkta(): void {
  // Демонстрация эмита select: состояние уже обновляется через v-model.
}

// --- GhSelect -------------------------------------------------------------
const vybrannyyProekt = ref<string | null>("front");

const variantyProektov = computed<GhSelectOption[]>(() => [
  {
    value: "front",
    label: t("ui_kit.demo.select_option_front"),
    description: t("ui_kit.demo.select_option_front_description"),
  },
  {
    value: "api",
    label: t("ui_kit.demo.select_option_api"),
    description: t("ui_kit.demo.select_option_api_description"),
  },
]);

// --- GhSegmentedControl ---------------------------------------------------
const yazik = ref<string>("ru");
const segmentTema = ref<string>("light");

const variantyYazika = computed<GhSegmentedOption[]>(() => [
  { value: "ru", label: t("ui_kit.demo.segmented_ru") },
  { value: "en", label: t("ui_kit.demo.segmented_en") },
]);

const variantyTemy = computed<GhSegmentedOption[]>(() => [
  { value: "light", label: t("ui_kit.demo.segmented_light"), icon: "sun" },
  { value: "dark", label: t("ui_kit.demo.segmented_dark"), icon: "moon" },
]);

// --- GhSwitch -------------------------------------------------------------
const uvedomleniya = ref<boolean>(true);
const vtoroySwitch = ref<boolean>(false);

// --- GhBanner -------------------------------------------------------------
const bannerViden = ref<boolean>(true);

// --- Палитра --------------------------------------------------------------
const obraztsyTokeov: { token: string; cssVar: string }[] = [
  { token: "--bgColor-default", cssVar: "--bgColor-default" },
  { token: "--bgColor-muted", cssVar: "--bgColor-muted" },
  { token: "--bgColor-neutral-muted", cssVar: "--bgColor-neutral-muted" },
  { token: "--borderColor-default", cssVar: "--borderColor-default" },
  { token: "--fgColor-default", cssVar: "--fgColor-default" },
  { token: "--fgColor-muted", cssVar: "--fgColor-muted" },
  { token: "--fgColor-accent", cssVar: "--fgColor-accent" },
  { token: "--bgColor-success-emphasis", cssVar: "--bgColor-success-emphasis" },
  { token: "--bgColor-danger-emphasis", cssVar: "--bgColor-danger-emphasis" },
  { token: "--gh-accent-coral", cssVar: "--gh-accent-coral" },
];
</script>

<template>
  <div class="primer-theme ui-kit">
    <header class="ui-kit__header">
      <div>
        <h1 class="ui-kit__title">{{ t("ui_kit.title") }}</h1>
        <p class="ui-kit__subtitle">{{ t("ui_kit.subtitle") }}</p>
      </div>

      <GhButton
        variant="default"
        :icon="temaTemnaya ? 'sun' : 'moon'"
        :label="
          temaTemnaya
            ? t('ui_kit.theme.light')
            : t('ui_kit.theme.dark')
        "
        @click="pereklyuchitTemu"
      />
    </header>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.page_header") }}</template>

      <GhPageHeader
        :title="t('ui_kit.demo.page_title')"
        :description="t('ui_kit.demo.page_description')"
      >
        <template #actions>
          <GhButton
            variant="default"
            icon="sync"
            :label="t('ui_kit.demo.refresh')"
          />
        </template>
      </GhPageHeader>

      <div class="ui-kit__stack">
        <GhPageHeader
          :title="t('ui_kit.demo.counter_page_title')"
          :description="t('ui_kit.demo.counter_page_description')"
          :counter="4"
        >
          <template #title-append>
            <GhLabel variant="neutral" label="title-append" />
          </template>
          <template #actions>
            <GhButton
              variant="primary"
              icon="plus"
              :label="t('ui_kit.demo.refresh')"
            />
          </template>
        </GhPageHeader>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.avatar") }}</template>

      <div class="ui-kit__row ui-kit__row--baseline">
        <GhAvatar
          v-for="avatar in avatary"
          :key="avatar.name"
          :name="avatar.name"
          :size="32"
        />
        <GhAvatar name="Octocat" :size="24" square />
        <GhAvatar name="Hubot" :size="20" />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.kbd") }}</template>

      <p class="ui-kit__hint">
        {{ t("ui_kit.demo.kbd_hint") }}
        <GhKbd>/</GhKbd>
        {{ t("ui_kit.demo.kbd_for_search") }}
      </p>

      <div class="ui-kit__row">
        <GhKbd>Ctrl</GhKbd>
        <GhKbd>K</GhKbd>
        <GhKbd>Shift</GhKbd>
        <GhKbd>Esc</GhKbd>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.palette") }}</template>

      <div class="ui-kit__swatches">
        <div
          v-for="obrazets in obraztsyTokeov"
          :key="obrazets.token"
          class="ui-kit__swatch-item"
        >
          <span
            class="ui-kit__swatch"
            :style="{ backgroundColor: `var(${obrazets.cssVar})` }"
          />
          <code class="ui-kit__token">{{ obrazets.token }}</code>
        </div>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.icon") }}</template>

      <div class="ui-kit__icons">
        <div
          v-for="ikonka in ikonki"
          :key="ikonka.name"
          class="ui-kit__icon-item"
        >
          <GhIcon :name="ikonka.name" :size="16" />
          <span class="ui-kit__icon-label">{{ ikonka.label }}</span>
        </div>
      </div>

      <div class="ui-kit__icons ui-kit__icons--large">
        <GhIcon name="mark-github" :size="24" />
        <GhIcon name="rocket" :size="24" />
        <GhIcon name="people" :size="24" />
        <GhIcon name="shield-check" :size="24" />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.button") }}</template>

      <h3 class="ui-kit__label">{{ t("ui_kit.labels.variants") }}</h3>
      <div class="ui-kit__row">
        <GhButton variant="default" label="Default" icon="repo" />
        <GhButton variant="primary" label="Primary" icon="plus" />
        <GhButton variant="danger" label="Danger" icon="trash" />
        <GhButton variant="invisible" label="Invisible" icon="pencil" />
      </div>

      <h3 class="ui-kit__label">{{ t("ui_kit.labels.sizes") }}</h3>
      <div class="ui-kit__row ui-kit__row--baseline">
        <GhButton size="sm" variant="primary" label="Small 28" icon="plus" />
        <GhButton size="md" variant="primary" label="Medium 32" icon="plus" />
        <GhButton size="lg" variant="primary" label="Large 40" icon="plus" />
      </div>

      <h3 class="ui-kit__label">{{ t("ui_kit.labels.icon_counter_slot") }}</h3>
      <div class="ui-kit__row">
        <GhButton
          variant="default"
          label="Issues"
          icon="issue-opened"
          :count="24"
        />
        <GhButton variant="default" :count="12">
          <GhIcon name="download" />
          <span>{{ t("common.buttons.copy") }}</span>
        </GhButton>
        <GhButton
          variant="default"
          label="With icon"
          icon-right="arrow-right"
        />
      </div>

      <h3 class="ui-kit__label">{{ t("ui_kit.labels.states") }}</h3>
      <div class="ui-kit__row">
        <GhButton variant="primary" label="Loading" :loading="true" />
        <GhButton variant="default" label="Disabled" :disabled="true" />
        <GhButton
          variant="invisible"
          icon="gear"
          :aria-label="t('ui_kit.demo.side_settings')"
        />
      </div>

      <div class="ui-kit__stack">
        <GhButton variant="primary" :label="t('ui_kit.labels.block')" block />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.input") }}</template>

      <div class="ui-kit__fields">
        <GhInput
          v-model="poisk"
          :label="t('ui_kit.demo.search')"
          :placeholder="t('ui_kit.demo.search_placeholder')"
          icon="search"
        />

        <GhInput
          v-model="pochetnyyEmail"
          :label="t('ui_kit.demo.email')"
          type="email"
          icon="mail"
          autocomplete="email"
        />

        <GhInput
          v-model="poleSOshibkoy"
          :label="t('ui_kit.demo.error_field')"
          icon="alert"
          :error="true"
          :error-message="t('ui_kit.demo.error_message')"
        />

        <GhInput
          v-model="zablokirovannoePole"
          :label="t('ui_kit.demo.disabled_field')"
          :placeholder="t('ui_kit.demo.disabled_field')"
          icon="lock"
          :disabled="true"
        />

        <GhInput
          v-model="poisk"
          :label="t('ui_kit.demo.compact')"
          size="sm"
          icon="search"
        />

        <GhInput
          v-model="poisk"
          :label="t('ui_kit.demo.large')"
          size="lg"
          icon="search"
        />

        <GhInput
          v-model="parol"
          :label="t('ui_kit.labels.password')"
          :type="parolViden ? 'text' : 'password'"
          icon="lock"
          autocomplete="current-password"
        >
          <template #append>
            <GhButton
              variant="invisible"
              size="sm"
              :icon="parolViden ? 'eye-closed' : 'eye'"
              :aria-label="
                parolViden
                  ? t('ui_kit.labels.hide_password')
                  : t('ui_kit.labels.show_password')
              "
              @click="pereklyuchitVidimostParolya"
            />
          </template>
        </GhInput>

        <GhInput
          v-model="opisanieZadachi"
          :label="t('ui_kit.demo.textarea_label')"
          :placeholder="t('ui_kit.demo.textarea_placeholder')"
          type="textarea"
          :rows="3"
        />

        <GhInput
          v-model="opisanieZadachi"
          :label="t('ui_kit.demo.textarea_autogrow_label')"
          :placeholder="t('ui_kit.demo.textarea_placeholder')"
          type="textarea"
          autogrow
          :rows="2"
        />

        <GhInput
          v-model="opisanieSOshibkoy"
          :label="t('ui_kit.demo.textarea_label')"
          :placeholder="t('ui_kit.demo.textarea_placeholder')"
          type="textarea"
          :error="true"
          :error-message="t('ui_kit.demo.textarea_error_message')"
        />
      </div>

      <p class="ui-kit__hint">{{ t("ui_kit.labels.append") }}</p>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.control_heights") }}</template>

      <div class="ui-kit__column">
        <div class="ui-kit__row ui-kit__row--controls">
          <GhInput v-model="poisk" size="sm" placeholder="sm" icon="search" />
          <GhSelect
            :model-value="null"
            :options="variantyProektov"
            size="sm"
            placeholder="sm"
          />
          <GhButton size="sm" variant="default" label="sm" icon="plus" />
        </div>

        <div class="ui-kit__row ui-kit__row--controls">
          <GhInput v-model="poisk" size="md" placeholder="md" icon="search" />
          <GhSelect
            :model-value="null"
            :options="variantyProektov"
            size="md"
            placeholder="md"
          />
          <GhButton size="md" variant="default" label="md" icon="plus" />
        </div>

        <div class="ui-kit__row ui-kit__row--controls">
          <GhInput v-model="poisk" size="lg" placeholder="lg" icon="search" />
          <GhSelect
            :model-value="null"
            :options="variantyProektov"
            size="lg"
            placeholder="lg"
          />
          <GhButton size="lg" variant="default" label="lg" icon="plus" />
        </div>
      </div>

      <p class="ui-kit__hint">{{ t("ui_kit.demo.heights_note") }}</p>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.form_field") }}</template>

      <div class="ui-kit__fields">
        <GhFormField
          v-slot="{ controlId, ariaDescribedby, ariaInvalid }"
          :label="t('ui_kit.demo.form_label')"
          :caption="t('ui_kit.demo.form_caption')"
          :required="true"
        >
          <GhInput
            v-model="nik"
            :id="controlId"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :placeholder="t('ui_kit.demo.form_placeholder')"
          />
        </GhFormField>

        <GhFormField
          v-slot="{ controlId, ariaDescribedby, ariaInvalid }"
          :label="t('ui_kit.demo.form_label')"
          :error="t('ui_kit.demo.form_error')"
          :required="true"
        >
          <GhInput
            v-model="nik"
            :id="controlId"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :error="true"
            icon="alert"
          />
        </GhFormField>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.select") }}</template>

      <div class="ui-kit__fields">
        <GhSelect
          v-model="vybrannyyProekt"
          :options="variantyProektov"
          :label="t('ui_kit.demo.select_label')"
          :placeholder="t('ui_kit.demo.select_placeholder')"
          clearable
        />

        <GhSelect
          :model-value="null"
          :options="variantyProektov"
          :label="t('ui_kit.demo.select_label')"
          :placeholder="t('ui_kit.demo.select_placeholder')"
          size="sm"
        />

        <GhSelect
          :model-value="'front'"
          :options="variantyProektov"
          :label="t('ui_kit.demo.select_label')"
          :disabled="true"
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.segmented") }}</template>

      <div class="ui-kit__stack ui-kit__column">
        <GhSegmentedControl
          v-model="yazik"
          :options="variantyYazika"
          :aria-label="t('ui_kit.demo.segmented_language')"
        />

        <GhSegmentedControl
          v-model="segmentTema"
          :options="variantyTemy"
          size="sm"
          :aria-label="t('ui_kit.demo.segmented_theme')"
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.switch") }}</template>

      <div class="ui-kit__column">
        <GhSwitch
          v-model="uvedomleniya"
          :label="t('ui_kit.demo.switch_label')"
          :description="t('ui_kit.demo.switch_description')"
        />

        <GhSwitch v-model="vtoroySwitch" :label="t('ui_kit.demo.switch_label')" />

        <GhSwitch
          :model-value="true"
          :label="t('ui_kit.demo.switch_disabled')"
          :disabled="true"
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.checkbox") }}</template>

      <div class="ui-kit__column">
        <GhCheckbox
          v-model="tolkoAktivnye"
          :label="t('ui_kit.demo.checkbox_label')"
          :description="t('ui_kit.demo.checkbox_description')"
        />

        <GhCheckbox
          v-model="promezhutochnoeSostoyanie"
          :label="t('ui_kit.demo.checkbox_indeterminate')"
          indeterminate
        />

        <GhCheckbox
          v-model="nedostupnyyChekboks"
          :label="t('ui_kit.demo.checkbox_disabled')"
          disabled
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.label") }}</template>

      <div class="ui-kit__row">
        <GhLabel variant="neutral" label="neutral" />
        <GhLabel variant="accent" label="accent" icon="info" />
        <GhLabel variant="success" label="success" icon="check-circle" />
        <GhLabel variant="danger" label="danger" icon="alert" />
        <GhLabel variant="attention" label="attention" icon="shield-check" />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.counter") }}</template>

      <div class="ui-kit__row ui-kit__row--baseline">
        <GhCounter :value="0" />
        <GhCounter :value="12" />
        <GhCounter :value="999" />
        <GhCounter value="999+" variant="accent" />
        <GhCounter :value="3" variant="primary" />
        <GhButton variant="default" label="In tab" :count="42" />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.banner") }}</template>

      <div class="ui-kit__column">
        <GhBanner variant="accent" :title="t('ui_kit.demo.banner_accent')">
          {{ t("ui_kit.demo.banner_accent_text") }}
        </GhBanner>

        <GhBanner variant="success" :title="t('ui_kit.demo.banner_success')">
          {{ t("ui_kit.demo.banner_success_text") }}
        </GhBanner>

        <GhBanner
          variant="attention"
          :title="t('ui_kit.demo.banner_attention')"
        >
          {{ t("ui_kit.demo.banner_attention_text") }}
        </GhBanner>

        <GhBanner
          v-if="bannerViden"
          variant="danger"
          :title="t('ui_kit.demo.banner_danger')"
          dismissible
          @dismiss="bannerViden = false"
        >
          {{ t("ui_kit.demo.banner_danger_text") }}
          <template #actions>
            <GhButton
              variant="default"
              size="sm"
              :label="t('ui_kit.demo.banner_retry')"
            />
          </template>
        </GhBanner>

        <GhButton
          v-if="!bannerViden"
          variant="default"
          size="sm"
          :label="t('ui_kit.demo.banner_retry')"
          @click="bannerViden = true"
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.skeleton") }}</template>

      <div class="ui-kit__column" aria-busy="true">
        <GhSkeleton variant="circle" :width="32" :height="32" />
        <GhSkeleton variant="rect" :width="240" :height="80" />
        <GhSkeleton variant="text" :width="320" :height="16" />
        <GhSkeleton variant="text" :width="240" :height="16" animation="pulse" />
      </div>

      <p class="ui-kit__hint">{{ t("ui_kit.demo.skeleton_note") }}</p>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.empty_state") }}</template>

      <GhEmptyState
        icon="project"
        :title="t('ui_kit.demo.empty_title')"
        :description="t('ui_kit.demo.empty_description')"
      >
        <template #actions>
          <GhButton
            variant="primary"
            icon="plus"
            :label="t('ui_kit.demo.empty_create')"
          />
          <GhButton
            variant="default"
            :label="t('ui_kit.demo.empty_units')"
          />
        </template>
      </GhEmptyState>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.box") }}</template>

      <div class="ui-kit__boxes">
        <GhBox>
          <template #header>
            <GhIcon name="repo" />
            {{ t("ui_kit.demo.box_title") }}
          </template>
          <p>
            {{ t("ui_kit.demo.box_body") }}
            <code class="ui-kit__token">--bgColor-muted</code>
            {{ t("ui_kit.demo.box_and_border") }}
          </p>
          <template #footer>
            <GhButton
              size="sm"
              variant="default"
              :label="t('ui_kit.demo.cancel')"
            />
            <GhButton
              size="sm"
              variant="primary"
              :label="t('ui_kit.demo.confirm')"
            />
          </template>
        </GhBox>

        <GhBox padding="none">
          <template #header>{{ t("ui_kit.demo.flush_title") }}</template>
          <div class="ui-kit__flush">
            {{ t("ui_kit.demo.flush_body") }}
          </div>
        </GhBox>

        <GhBox padding="sm">
          <template #header>{{ t("ui_kit.demo.compact_title") }}</template>
          {{ t("ui_kit.demo.compact_body") }}
        </GhBox>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.underline_nav") }}</template>

      <GhUnderlineNav v-model="vkladka" :items="vkladki" />

      <p class="ui-kit__hint">
        {{ t("ui_kit.demo.hint_active_tab") }}
        <code class="ui-kit__token">{{ vkladka }}</code>.
        {{ t("ui_kit.demo.hint_underline") }}
        <code class="ui-kit__token">#fd8c73</code>.
      </p>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.side_nav") }}</template>

      <div class="ui-kit__row ui-kit__row--baseline">
        <div class="ui-kit__side-nav">
          <GhSideNav
            v-model="aktivnyyPunkt"
            :groups="gruppyNavigacii"
            @select="obrabotatVyborPunkta"
          />
        </div>

        <div class="ui-kit__side-nav ui-kit__side-nav--collapsed">
          <GhSideNav
            v-model="aktivnyyPunkt"
            :groups="gruppyNavigacii"
            collapsed
            @select="obrabotatVyborPunkta"
          />
        </div>

        <GhButton
          variant="default"
          size="sm"
          :label="
            sajdbarSvernut
              ? t('ui_kit.labels.side_nav_collapsed')
              : t('app.sidebar.collapse')
          "
          @click="sajdbarSvernut = !sajdbarSvernut"
        />
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.table") }}</template>

      <GhTable
        :rows="strokiTablitsi"
        :columns="kolonkiTablitsi"
        row-key="id"
      />

      <div class="ui-kit__stack">
        <GhTable :rows="[]" :columns="kolonkiTablitsi" row-key="id" />
      </div>

      <div class="ui-kit__stack">
        <GhTable
          :rows="strokiTablitsi"
          :columns="kolonkiTablitsi"
          row-key="id"
          borderless
        >
          <template #head>
            <tr>
              <th
                v-for="kolonka in kolonkiTablitsi"
                :key="kolonka.name"
                scope="col"
                :style="{ textAlign: kolonka.align }"
              >
                {{ kolonka.label }}
              </th>
            </tr>
          </template>

          <template #body>
            <tr v-for="row in strokiTablitsi" :key="row.id">
              <td><code class="gh-mono">{{ row.repo }}</code></td>
              <td>{{ row.status }}</td>
              <td>{{ row.updated }}</td>
            </tr>
          </template>
        </GhTable>
      </div>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.dialog") }}</template>

      <div class="ui-kit__row">
        <GhButton
          variant="primary"
          icon="info"
          :label="t('ui_kit.demo.open_dialog')"
          @click="dialogOtkrit = true"
        />
      </div>

      <p class="ui-kit__hint">{{ t("ui_kit.labels.dialog_hint") }}</p>

      <GhDialog v-model="dialogOtkrit" :title="t('ui_kit.demo.dialog_title')">
        <p>{{ t("ui_kit.demo.dialog_body") }}</p>

        <template #footer>
          <GhButton
            variant="default"
            :label="t('ui_kit.demo.cancel')"
            @click="dialogOtkrit = false"
          />
          <GhButton
            variant="primary"
            :label="t('ui_kit.demo.confirm')"
            @click="dialogOtkrit = false"
          />
        </template>
      </GhDialog>
    </GhBox>

    <GhBox class="ui-kit__block">
      <template #header>{{ t("ui_kit.sections.action_menu") }}</template>

      <div class="ui-kit__row ui-kit__row--baseline">
        <GhActionMenu :items="punktyMenyu" @select="obrabotatDeistvie" />

        <GhActionMenu
          :items="punktyMenyu"
          icon="gear"
          :aria-label="t('ui_kit.demo.side_settings')"
          @select="obrabotatDeistvie"
        />

        <GhLabel v-if="posledneeDeistvie" variant="accent">
          {{ t("ui_kit.demo.selected") }} {{ posledneeDeistvie }}
        </GhLabel>
      </div>
    </GhBox>
  </div>
</template>

<style scoped>
.ui-kit {
  box-sizing: border-box;
  width: 100%;
  min-height: calc(100vh - 50px);
  padding: 24px;
}

.ui-kit__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.ui-kit__title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.ui-kit__subtitle {
  max-width: 640px;
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.ui-kit__block {
  margin-bottom: 24px;
}

.ui-kit__label {
  margin: 16px 0 8px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ui-kit__label:first-child {
  margin-top: 0;
}

.ui-kit__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ui-kit__row--baseline {
  align-items: baseline;
}

.ui-kit__row--controls {
  align-items: center;
}

.ui-kit__row--controls > * {
  flex: 0 1 180px;
  min-width: 140px;
}

.ui-kit__stack {
  margin-top: 16px;
}

.ui-kit__column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-kit__fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.ui-kit__boxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.ui-kit__side-nav {
  width: 232px;
  padding-right: 8px;
}

.ui-kit__side-nav--collapsed {
  width: 48px;
  padding-right: 0;
}

.ui-kit__flush {
  padding: 12px 16px;
  border-bottom: 1px solid var(--borderColor-muted);
}

.ui-kit__hint {
  margin: 12px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
}

.ui-kit__token {
  padding: 1px 4px;
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: 12px;
}

.ui-kit__icons {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.ui-kit__icons--large {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--borderColor-muted);
}

.ui-kit__icon-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--fgColor-default);
}

.ui-kit__icon-label {
  color: var(--fgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: 12px;
}

.ui-kit__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.ui-kit__swatch-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ui-kit__swatch {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

@media (max-width: 599px) {
  .ui-kit {
    padding: 16px;
  }

  .ui-kit__header {
    flex-direction: column;
  }
}
</style>
