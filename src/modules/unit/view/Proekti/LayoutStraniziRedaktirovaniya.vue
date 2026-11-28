<script setup lang="ts">
import {computed, onMounted, watch} from "vue";
import {useI18n} from "vue-i18n";
import {RouterLink, useRoute, useRouter} from "vue-router";
import {GhIcon, GhPageHeader, GhUnderlineNav} from "@/components/ui";
import type {GhNavItem, OcticonName} from "@/components/ui";

/** Идентификатор таба совпадает с именем дочернего маршрута. */
type TabId =
  | "project_edit"
  | "project_jobs"
  | "project_users"
  | "project_variables"
  | "project_repo_event_handler"
  | "project_webhooks"
  | "project_volume_types"
  | "project_skills";

/**
 * Совместимый deep-link `?tab=<slug>`: короткий slug → имя дочернего маршрута.
 * Полные имена маршрутов тоже принимаются как алиасы.
 */
const KARTA_SLUGOV: Record<string, TabId> = {
  home: "project_edit",
  jobs: "project_jobs",
  users: "project_users",
  variables: "project_variables",
  repo_event_handler: "project_repo_event_handler",
  webhooks: "project_webhooks",
  volume_types: "project_volume_types",
  skills: "project_skills",
  project_edit: "project_edit",
  project_jobs: "project_jobs",
  project_users: "project_users",
  project_variables: "project_variables",
  project_repo_event_handler: "project_repo_event_handler",
  project_webhooks: "project_webhooks",
  project_volume_types: "project_volume_types",
  project_skills: "project_skills",
};

type OpisanieTaba = {
  id: TabId;
  labelKey: string;
  icon: OcticonName;
};

/**
 * Контракт табов сохранён: это те же именованные маршруты, что и раньше,
 * поэтому глубокие ссылки и history работают без изменений.
 */
const TABI: OpisanieTaba[] = [
  {id: "project_edit", labelKey: "unit.proekt.tabs.project_data", icon: "gear"},
  {id: "project_jobs", labelKey: "unit.proekt.tabs.jobs", icon: "tasklist"},
  {id: "project_users", labelKey: "unit.proekt.tabs.users", icon: "people"},
  {id: "project_variables", labelKey: "unit.proekt.tabs.variables", icon: "code-square"},
  {id: "project_repo_event_handler", labelKey: "unit.proekt.tabs.repo_event_handler", icon: "broadcast"},
  {id: "project_webhooks", labelKey: "unit.proekt.tabs.webhooks", icon: "broadcast"},
  {id: "project_volume_types", labelKey: "unit.proekt.tabs.volume_types", icon: "database"},
  {id: "project_skills", labelKey: "skill.project.tab", icon: "book"},
];

const route = useRoute();
const router = useRouter();
const {t} = useI18n();

const identifikatorProekta = computed<string>(() => String(route.params.id ?? ""));

/** Приводит произвольное значение `?tab=` к имени таба или `null`. */
function tabPoSlugu(znachenie: unknown): TabId | null {
  const syroe = Array.isArray(znachenie) ? znachenie[0] : znachenie;

  if (typeof syroe !== "string") {
    return null;
  }

  return KARTA_SLUGOV[syroe] ?? null;
}

/**
 * Входящий алиас `?tab=`: переводит на соответствующий именованный маршрут
 * через `router.replace`, сохраняя `params.id` и остальные query-параметры.
 * Неизвестный slug игнорируется; при отсутствии `tab` поведение прежнее.
 */
function primenitAliasTaba(): void {
  const cel = tabPoSlugu(route.query.tab);

  if (cel === null || identifikatorProekta.value === "") {
    return;
  }

  const ostalnieQuery = {...route.query};
  delete ostalnieQuery.tab;

  void router.replace({
    name: cel,
    params: {id: identifikatorProekta.value},
    query: ostalnieQuery,
  });
}

onMounted(primenitAliasTaba);

watch(
  () => route.query.tab,
  () => {
    primenitAliasTaba();
  },
);

/** Активный таб — имя текущего дочернего маршрута. */
const aktivniyTab = computed<TabId>(() => {
  const imya = String(route.name ?? "");

  const nayden = TABI.find((tab) => tab.id === imya);

  return nayden?.id ?? "project_edit";
});

const taby = computed<GhNavItem[]>(() =>
  TABI.map((tab) => ({
    name: tab.id,
    label: t(tab.labelKey),
    icon: tab.icon,
  })),
);

function vybratTab(znachenie: string): void {
  const tab = TABI.find((item) => item.id === znachenie);

  if (!tab || tab.id === aktivniyTab.value) {
    return;
  }

  void router.push({name: tab.id, params: {id: identifikatorProekta.value}});
}
</script>

<template>
  <div class="layout-redaktirovaniya">
    <nav class="layout-redaktirovaniya__breadcrumbs" :aria-label="$t('unit.proekt.page.back_to_projects')">
      <RouterLink to="/" class="layout-redaktirovaniya__crumb">
        {{ $t('app.tabs.home') }}
      </RouterLink>
      <GhIcon name="chevron-right" :size="12" class="layout-redaktirovaniya__crumb-separator" />
      <RouterLink :to="{name: 'project_list'}" class="layout-redaktirovaniya__crumb">
        {{ $t('unit.proekt.page.back_to_projects') }}
      </RouterLink>
      <GhIcon name="chevron-right" :size="12" class="layout-redaktirovaniya__crumb-separator" />
      <span class="layout-redaktirovaniya__crumb layout-redaktirovaniya__crumb--current" aria-current="page">
        {{ identifikatorProekta }}
      </span>
    </nav>

    <GhPageHeader
        :title="$t('unit.proekt.page.title', {id: identifikatorProekta})"
        :description="$t('unit.proekt.page.description')"
    />

    <div class="layout-redaktirovaniya__nav">
      <GhUnderlineNav
          :model-value="aktivniyTab"
          :items="taby"
          :aria-label="$t('unit.proekt.page.description')"
          @update:model-value="vybratTab"
      />
    </div>

    <div class="layout-redaktirovaniya__content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.layout-redaktirovaniya {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.layout-redaktirovaniya__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.layout-redaktirovaniya__crumb {
  color: var(--fgColor-accent);
  text-decoration: none;
}

.layout-redaktirovaniya__crumb:hover {
  text-decoration: underline;
}

.layout-redaktirovaniya__crumb--current {
  overflow: hidden;
  color: var(--fgColor-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-redaktirovaniya__crumb-separator {
  color: var(--fgColor-muted);
}

.layout-redaktirovaniya__nav {
  overflow-x: auto;
  border-bottom: 1px solid var(--borderColor-default);
}

.layout-redaktirovaniya__content {
  padding-top: 16px;
}
</style>
