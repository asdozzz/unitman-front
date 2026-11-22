<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import type { Schema } from "@/api/types";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhIcon,
  GhKbd,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import type { OcticonName } from "@/components/ui";
import HomeProjectsTable from "@/modules/app/view/HomeProjectsTable.vue";
import { storeDashborda } from "@/modules/app/store/DashboardStore";
import { useAuthStore } from "@/modules/account/store/auth";
import {
  DEFAULT_UNIT_FILTERS,
  type UnitFilterStatus,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import { serializovatFiltriVQuery } from "@/modules/unit/utils/unitFiltersUrl";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";

/** Строка статистики проекта из сгенерированной схемы. */
type ProjectStatistics = Schema<"ProjectStatistics">;

type SortColumn = "project" | "total" | "active" | "deleted" | "activity";

type SortDirection = "asc" | "desc";

type TonPlitki = "neutral" | "success" | "danger" | "accent";

type MarshrutPlitki = {
  path: string;
  query: Record<string, string>;
};

type Plitka = {
  id: string;
  labelKey: string;
  captionKey: string;
  hintKey: string;
  icon: OcticonName;
  ton: TonPlitki;
  value: string;
  to: MarshrutPlitki;
};

const { t, locale } = useI18n();
const router = useRouter();

const store = storeDashborda();
const {
  statistikaPoProektam,
  loaderStatistikiPoProektam,
  oshibkaStatistikiPoProektam,
  obshayaStata,
} = storeToRefs(store);

const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

/** Клиентский фильтр по названию проекта; стор не затрагивается. */
const filtrProektov = ref<string>("");

/** Локальное состояние сортировки таблицы; стор не затрагивается. */
const sortColumn = ref<SortColumn>("total");
const sortDirection = ref<SortDirection>("desc");

/** Время последнего успешного обновления (мс). */
const posledneeObnovlenie = ref<number | null>(null);

/** Обёртка блока проектов — нужна для фокуса в фильтр по `/`. */
const konteynerTablitsi = ref<HTMLElement | null>(null);

const estDannie = computed<boolean>(() => statistikaPoProektam.value.length > 0);

/**
 * Скелетоны показываем только на первичной загрузке: при обновлении уже
 * показанных данных сохраняем контент, чтобы не было мигания и сдвига.
 */
const pokazatSkeletony = computed<boolean>(
  () => loaderStatistikiPoProektam.value && !estDannie.value,
);

const kolichestvoSkeletonyhPlitok = computed<number>(() =>
  isAdmin.value ? 4 : 3,
);

/** Отфильтрованные строки без мутации исходного массива стора. */
const othfiltrovannieProekti = computed<ProjectStatistics[]>(() => {
  const stroka = filtrProektov.value.trim().toLowerCase();

  if (stroka === "") {
    return statistikaPoProektam.value;
  }

  return statistikaPoProektam.value.filter((proekt: ProjectStatistics) =>
    proekt.projectName.toLowerCase().includes(stroka),
  );
});

/** Копия отфильтрованных строк с локальной сортировкой. */
const otsortirovannieProekti = computed<ProjectStatistics[]>(() => {
  const kopiya = [...othfiltrovannieProekti.value];
  const napravlenie = sortDirection.value === "asc" ? 1 : -1;

  kopiya.sort((a: ProjectStatistics, b: ProjectStatistics): number => {
    if (sortColumn.value === "project") {
      return (
        a.projectName.localeCompare(b.projectName, undefined, {
          sensitivity: "base",
        }) * napravlenie
      );
    }

    if (sortColumn.value === "activity") {
      const aktivnostA = a.total > 0 ? a.active / a.total : 0;
      const aktivnostB = b.total > 0 ? b.active / b.total : 0;
      const raznitsa = aktivnostA - aktivnostB;

      return (raznitsa !== 0 ? raznitsa : a.total - b.total) * napravlenie;
    }

    return (a[sortColumn.value] - b[sortColumn.value]) * napravlenie;
  });

  return kopiya;
});

/** Готовое время «Обновлено ЧЧ:ММ» для подвала таблицы. */
const updatedAtText = computed<string>(() => {
  if (posledneeObnovlenie.value === null) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(locale.value, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(posledneeObnovlenie.value));
});

/** Маршрут к списку юнитов с фильтром по статусам. */
function marshrutKUnitam(statuses: UnitFilterStatus[]): MarshrutPlitki {
  return {
    path: "/unit/list",
    query: serializovatFiltriVQuery({ ...DEFAULT_UNIT_FILTERS, statuses }),
  };
}

/** Плитки-показатели. При ошибке значения заменяются прочерком. */
const plitki = computed<Plitka[]>(() => {
  const znachenie = (chislo: number): string =>
    oshibkaStatistikiPoProektam.value === null ? String(chislo) : "—";

  const spisok: Plitka[] = [
    {
      id: "total",
      labelKey: "dashboard.stats.total_units",
      captionKey: "dashboard.stats.total_units_caption",
      hintKey: "dashboard.stats.total_units_hint",
      icon: "package",
      ton: "neutral",
      value: znachenie(obshayaStata.value.total),
      to: marshrutKUnitam([]),
    },
    {
      id: "active",
      labelKey: "dashboard.stats.active_units",
      captionKey: "dashboard.stats.active_units_caption",
      hintKey: "dashboard.stats.active_units_hint",
      icon: "play",
      ton: "success",
      value: znachenie(obshayaStata.value.active),
      to: marshrutKUnitam(["running"]),
    },
    {
      id: "deleted",
      labelKey: "dashboard.stats.deleted_units",
      captionKey: "dashboard.stats.deleted_units_caption",
      hintKey: "dashboard.stats.deleted_units_hint",
      icon: "trash",
      ton: "danger",
      value: znachenie(obshayaStata.value.deleted),
      // Удалённых юнитов в списке нет: ближайший доступный серверный
      // фильтр неактивного юнита — `stopped`.
      to: marshrutKUnitam(["stopped"]),
    },
  ];

  if (isAdmin.value) {
    spisok.push({
      id: "projects",
      labelKey: "dashboard.stats.projects",
      captionKey: "dashboard.stats.projects_caption",
      hintKey: "dashboard.stats.projects_hint",
      icon: "project",
      ton: "accent",
      value: znachenie(statistikaPoProektam.value.length),
      to: { path: "/unit/projects", query: {} },
    });
  }

  return spisok;
});

/** Перезагрузка статистики тем же методом стора, без изменения его логики. */
function obnovitDannie(): void {
  if (loaderStatistikiPoProektam.value) {
    return;
  }

  void store.poluchitStatistikuPoProektam();
}

function otkrytVseYuniti(): void {
  void router.push({ path: "/unit/list", query: {} });
}

function otkrytYunitiProekta(row: ProjectStatistics): void {
  void router.push({
    path: "/unit/list",
    query: serializovatFiltriVQuery({
      ...DEFAULT_UNIT_FILTERS,
      projectId: row.projectId,
    }),
  });
}

function otkrytKartochkuProekta(row: ProjectStatistics): void {
  void router.push(`/unit/projects/${row.projectId}/home`);
}

function otkrytSpisokProektov(): void {
  void router.push("/unit/projects");
}

function izmenitSortirovku(column: SortColumn): void {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    return;
  }

  sortColumn.value = column;
  sortDirection.value = "asc";
}

/** Переводит фокус в поле фильтра таблицы. `false`, если поля нет. */
function fokusNaFiltr(): boolean {
  const pole = konteynerTablitsi.value?.querySelector<HTMLInputElement>("input");

  if (!pole) {
    return false;
  }

  pole.focus();
  pole.select();

  return true;
}

/** Селекторы, внутри которых страничные хоткеи не перехватываются. */
function ignorirovatVvod(event: KeyboardEvent): boolean {
  const cel = event.target;

  if (!(cel instanceof HTMLElement)) {
    return false;
  }

  if (cel.isContentEditable) {
    return true;
  }

  return (
    cel.closest(
      'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], .q-dialog, .q-menu',
    ) !== null
  );
}

/**
 * Страничные хоткеи: `R` — обновить статистику, `/` — фокус в фильтр.
 * Регистрируется раньше глобального `useHotkeys` из App.vue, поэтому на
 * главной `/` переводит фокус в фильтр, а не в поиск хедера.
 */
function obrabotatKlavishu(event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    ignorirovatVvod(event)
  ) {
    return;
  }

  // `g` уже нажата и глобальный `useHotkeys` ожидает вторую клавишу:
  // одиночный `R` не должен перехватывать `g r` (репозитории).
  if (ozhidaetsyaVtorayaKlavishaPosledovatelnosti()) {
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    obnovitDannie();
    return;
  }

  if (event.key === "/" && fokusNaFiltr()) {
    event.preventDefault();
  }
}

watch(loaderStatistikiPoProektam, (zagruzka: boolean, bilaZagruzka?: boolean) => {
  if (bilaZagruzka === true && !zagruzka) {
    posledneeObnovlenie.value = Date.now();
  }
});

onMounted(() => {
  obnovitDannie();
  window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
  window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <div class="home primer">
    <GhPageHeader
      :title="t('dashboard.title')"
      :description="t('dashboard.subtitle')"
    >
      <template #actions>
        <GhButton
          icon="sync"
          :loading="loaderStatistikiPoProektam"
          :disabled="loaderStatistikiPoProektam"
          @click="obnovitDannie"
        >
          <span>{{ t("dashboard.refresh") }}</span>
          <q-tooltip>
            {{ t("dashboard.refresh_hint") }}
            <GhKbd>R</GhKbd>
          </q-tooltip>
        </GhButton>
      </template>
    </GhPageHeader>

    <GhBanner
      v-if="oshibkaStatistikiPoProektam !== null"
      variant="danger"
      :title="t('dashboard.projects.error')"
      class="home__banner"
    >
      <p class="home__banner-text">
        {{ t("dashboard.projects.error_description") }}
      </p>
      <p v-if="oshibkaStatistikiPoProektam" class="home__banner-reason">
        {{ oshibkaStatistikiPoProektam }}
      </p>
      <template #actions>
        <GhButton
          size="sm"
          icon="sync"
          :label="t('dashboard.projects.retry')"
          @click="obnovitDannie"
        />
      </template>
    </GhBanner>

    <section
      class="home__stats"
      :aria-busy="pokazatSkeletony ? 'true' : undefined"
    >
      <template v-if="pokazatSkeletony">
        <GhBox
          v-for="n in kolichestvoSkeletonyhPlitok"
          :key="`tile-skeleton-${n}`"
          padding="sm"
          class="home-tile home-tile--skeleton"
        >
          <div class="home-tile__body" aria-hidden="true">
            <GhSkeleton variant="text" width="55%" height="12" />
            <GhSkeleton variant="rect" width="56px" height="24" />
            <GhSkeleton variant="text" width="70%" height="12" />
          </div>
        </GhBox>
      </template>

      <template v-else>
        <router-link
          v-for="plitka in plitki"
          :key="plitka.id"
          :to="plitka.to"
          class="home-tile"
          :title="t(plitka.hintKey)"
        >
          <GhBox padding="sm">
            <div class="home-tile__body">
              <span class="home-tile__top">
                <GhIcon
                  :name="plitka.icon"
                  :size="16"
                  class="home-tile__icon"
                  :class="`home-tile__icon--${plitka.ton}`"
                />
                <span class="home-tile__label">{{ t(plitka.labelKey) }}</span>
              </span>
              <span class="home-tile__value gh-mono">{{ plitka.value }}</span>
              <span class="home-tile__caption">{{ t(plitka.captionKey) }}</span>
            </div>
          </GhBox>
        </router-link>
      </template>
    </section>

    <div v-if="oshibkaStatistikiPoProektam === null" ref="konteynerTablitsi">
      <HomeProjectsTable
        :rows="otsortirovannieProekti"
        :total-count="statistikaPoProektam.length"
        :filter="filtrProektov"
        :loading="pokazatSkeletony"
        :is-admin="isAdmin"
        :sort-column="sortColumn"
        :sort-direction="sortDirection"
        :updated-at-text="updatedAtText"
        @update:filter="filtrProektov = $event"
        @sort="izmenitSortirovku"
        @open-units="otkrytYunitiProekta"
        @open-project="otkrytKartochkuProekta"
        @create-project="otkrytSpisokProektov"
        @go-to-units="otkrytVseYuniti"
      />
    </div>
  </div>
</template>

<style scoped>
.home {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.home__banner {
  margin-bottom: 16px;
}

.home__banner-text,
.home__banner-reason {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.home__banner-reason {
  margin-top: 2px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.home__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.home-tile {
  display: block;
  border-radius: var(--borderRadius-medium);
  color: inherit;
  text-decoration: none;
}

.home-tile:hover :deep(.gh-box) {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-muted);
}

.home-tile:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.home-tile--skeleton {
  pointer-events: none;
}

.home-tile__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 72px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.home-tile__top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 16px;
}

.home-tile__icon {
  color: var(--fgColor-muted);
}

.home-tile__icon--success {
  color: var(--fgColor-success);
}

.home-tile__icon--danger {
  color: var(--fgColor-danger);
}

.home-tile__icon--accent {
  color: var(--fgColor-accent);
}

.home-tile__label {
  overflow: hidden;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-tile__value {
  color: var(--fgColor-default);
  font-size: 24px;
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.home-tile__caption {
  overflow: hidden;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .home__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .home__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
