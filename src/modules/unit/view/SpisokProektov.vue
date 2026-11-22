<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import {useSpisokProektovStore} from "@/modules/unit/store/SpisokProekotovStore";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import AddForm from "@/modules/unit/view/Proekti/AddProjectForm.vue";
import ProektFilterBar from "@/modules/unit/view/Proekti/SpisokProektov/ProektFilterBar.vue";
import ProektCard from "@/modules/unit/view/Proekti/SpisokProektov/ProektCard.vue";
import {
  DEFAULT_PROEKT_FILTERS,
  type ProektFilterKey,
  type ProektFiltri,
} from "@/modules/unit/store/SpisokProektov/model/ProektFiltri";
import {
  prochitatFiltriIzQuery,
  serializovatFiltriVQuery,
} from "@/modules/unit/utils/proektFiltersUrl";
import {
  type ModelForChannelSpisokProektov,
  OBNOVLENIE_PROEKTA,
  SOZDANIE_PROEKTA,
  UDALENIE_PROEKTA,
} from "@/modules/unit/model/websocket/ModelForChannelSpisokProektov";
import {podpisatsyaNaSobitiyaProektov} from "@/modules/unit/model/websocket/PodpiskaNaSobitiyaProektov";
import {ozhidaetsyaVtorayaKlavishaPosledovatelnosti} from "@/utils/useHotkeys";

const proektiStore = useSpisokProektovStore();
const {
  spisok,
  nastroikiSpiska,
  loaderSpiskaProektov,
  oshibkaZagruzkiSpiska,
  vidimieProekti,
} = storeToRefs(proektiStore);

const addFormStore = useAddProjectFormStore();
const {enable: enableAddForm} = storeToRefs(addFormStore);

const route = useRoute();
const router = useRouter();
const {t} = useI18n();

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/**
 * Защита от цикла «фильтр → URL → фильтр»: пока фильтр применён из URL,
 * его изменение не должно снова писать URL.
 */
const propuskatZapisVUrl = ref(false);

/** Скелетоны показываем только на первичной загрузке — CLS остаётся нулевым. */
const pokazatSkeletony = computed<boolean>(
    () => loaderSpiskaProektov.value && spisok.value.length === 0,
);

/** Есть ли активные фильтры — от этого зависит пустое состояние. */
const estAktivnieFiltri = computed<boolean>(() => proektiStore.estAktivnieFiltri);

const KLYUCHI_FILTRA = [
  "search",
  "states",
  "onlyActive",
  "sort",
] as const;

/**
 * Обработчик `change` от тулбара: фильтрация клиентская, поэтому достаточно
 * перезаписать фильтр и сохранить настройки — запрос списка не нужен.
 */
function obrabotatIzmenenieFiltrov(payload: {filters: ProektFiltri; immediate: boolean}) {
  nastroikiSpiska.value.filter = payload.filters;
  proektiStore.sohranitNastroiki();
}

/**
 * Удаление одного чипа активного фильтра.
 *
 * Для `states` убирается конкретное значение, для остальных ключей
 * возвращается значение по умолчанию.
 */
function udalitChip(chip: {key: ProektFilterKey; value?: string}) {
  const filter = nastroikiSpiska.value.filter;

  switch (chip.key) {
    case "states":
      void proektiStore.primenitFiltri({
        states: filter.states.filter((status) => status !== chip.value),
      });
      return;
    case "search":
      void proektiStore.primenitFiltri({search: DEFAULT_PROEKT_FILTERS.search});
      return;
    case "onlyActive":
      void proektiStore.primenitFiltri({onlyActive: DEFAULT_PROEKT_FILTERS.onlyActive});
      return;
  }
}

/** Есть ли в query хоть один параметр фильтра. */
function estFiltriVQuery(query: Record<string, unknown>): boolean {
  return KLYUCHI_FILTRA.some((key) => {
    const znachenie = query[key];

    return znachenie !== undefined && znachenie !== null && znachenie !== "";
  });
}

/** Строковое представление фильтрующих параметров текущего `route.query`. */
function tekushieFiltriQuery(query: Record<string, unknown>): Record<string, string> {
  const rezultat: Record<string, string> = {};

  KLYUCHI_FILTRA.forEach((key) => {
    const znachenie = query[key];

    if (typeof znachenie === "string") {
      rezultat[key] = znachenie;
    }
  });

  return rezultat;
}

/** Эквивалентность сериализованных фильтров: одинаковый набор ключей и значений. */
function ekvivalentni(a: Record<string, string>, b: Record<string, string>): boolean {
  const klyuchiA = Object.keys(a);
  const klyuchiB = Object.keys(b);

  if (klyuchiA.length !== klyuchiB.length) {
    return false;
  }

  return klyuchiA.every((key) => a[key] === b[key]);
}

/**
 * Применяет фильтр из URL к текущему фильтру.
 *
 * Для обратной навигации достаточно перезаписать фильтр: список фильтруется
 * на клиенте, повторный запрос не нужен.
 */
function primenitFiltriIzUrl(query: Record<string, unknown>): void {
  const noviyFilter = prochitatFiltriIzQuery(query);
  const tekushiy = serializovatFiltriVQuery(nastroikiSpiska.value.filter);
  const noviy = serializovatFiltriVQuery(noviyFilter);

  if (ekvivalentni(tekushiy, noviy)) {
    return;
  }

  propuskatZapisVUrl.value = true;
  nastroikiSpiska.value.filter = noviyFilter;
  proektiStore.sohranitNastroiki();

  void nextTick(() => {
    propuskatZapisVUrl.value = false;
  });
}

// Инициализация из URL — до создания watcher'ов, чтобы применение query не
// вызвало обратную запись. Пустой query оставляет фильтр из localStorage.
if (estFiltriVQuery(route.query)) {
  primenitFiltriIzUrl(route.query);
}

// Изменение фильтра (тулбар, чипы, сброс) синхронизирует query через replace.
// Пишем только если сериализованное представление отличается от текущего URL.
watch(
    () => nastroikiSpiska.value.filter,
    () => {
      if (propuskatZapisVUrl.value) {
        return;
      }

      const serializovannie = serializovatFiltriVQuery(nastroikiSpiska.value.filter);

      if (ekvivalentni(serializovannie, tekushieFiltriQuery(route.query))) {
        return;
      }

      void router.replace({query: serializovannie});
    },
    {deep: true},
);

// Обратная навигация (back/forward): фильтр восстанавливается из URL без
// повторной записи query.
watch(
    () => route.query,
    (noviyQuery) => {
      primenitFiltriIzUrl(noviyQuery);
    },
);

// Фиксируем момент окончания загрузки, чтобы тулбар показал «обновлено …».
watch(loaderSpiskaProektov, (zagruzka: boolean, bilaZagruzka: boolean | undefined) => {
  if (bilaZagruzka === true && zagruzka === false) {
    posledneeObnovlenie.value = Math.floor(Date.now() / 1000);
  }
});

/**
 * Отписка от канала событий проектов.
 *
 * Подписка создаётся и снимается через модуль-реестр, а не напрямую через
 * клиент Centrifugo: канал общий, и подписка на клиента может быть только одна.
 */
let otpisatsyaOtSobitiyProektov: (() => void) | null = null;

onMounted(async () => {
  // Подписка ставится до запроса списка: если экран закроют, пока идёт
  // загрузка, `onUnmounted` уже должен иметь что снять.
  otpisatsyaOtSobitiyProektov = podpisatsyaNaSobitiyaProektov(obrabotatSobitiyeProekta);

  await proektiStore.poluchitSpisokProektov();
});

onUnmounted(() => {
  otpisatsyaOtSobitiyProektov?.();
  otpisatsyaOtSobitiyProektov = null;

  proektiStore.otmenitObnovleniyaProektov();
});

/**
 * Реакция на событие канала `spisok_proektov`.
 *
 * Создание и удаление меняют состав списка, поэтому список перезапрашивается
 * (для удаления достаточно убрать карточку). Обновление касается одного
 * проекта — перезапрашивается только он.
 */
function obrabotatSobitiyeProekta(sobitiye: ModelForChannelSpisokProektov) {
  switch (sobitiye.eventType) {
    case SOZDANIE_PROEKTA:
      proektiStore.poluchitSpisokProektov();
      break;
    case UDALENIE_PROEKTA:
      proektiStore.udalitProektIzSpiska(sobitiye.id);
      break;
    case OBNOVLENIE_PROEKTA:
      proektiStore.zaplanirovatObnovlenieProekta(sobitiye.id);
      break;
  }
}

function openAddForm() {
  addFormStore.otkritFormu();
}

/** Переводит фокус в поле поиска. `false`, если поля нет. */
function fokusNaPoisk(): boolean {
  const pole = document.getElementById("proekt-filter-search") as HTMLInputElement | null;

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
 * Страничные хоткеи: `R` — обновить, `/` — поиск, `c` — создать проект.
 * Уступаем `g`-последовательностям глобального обработчика.
 */
function obrabotatKlavishu(event: KeyboardEvent): void {
  if (
      event.defaultPrevented
      || event.isComposing
      || event.ctrlKey
      || event.metaKey
      || event.altKey
      || ignorirovatVvod(event)
      || ozhidaetsyaVtorayaKlavishaPosledovatelnosti()
  ) {
    return;
  }

  const klavisha = event.key.toLowerCase();

  if (klavisha === "r" && !event.shiftKey) {
    event.preventDefault();
    if (!loaderSpiskaProektov.value) {
      void proektiStore.poluchitSpisokProektov();
    }
    return;
  }

  if (event.key === "/") {
    if (fokusNaPoisk()) {
      event.preventDefault();
    }
    return;
  }

  if (klavisha === "c" && !event.shiftKey) {
    event.preventDefault();
    openAddForm();
  }
}

onMounted(() => {
  window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
  window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <div class="proekt-page">
    <GhPageHeader
        :title="t('unit.spisok_proektov.page.title')"
        :description="t('unit.spisok_proektov.page.description')"
        :counter="spisok.length"
    >
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="t('unit.spisok_proektov.filter.refresh')"
            :loading="loaderSpiskaProektov"
            @click="proektiStore.poluchitSpisokProektov()"
        />
        <GhButton
            variant="primary"
            icon="plus"
            :label="t('unit.spisok_proektov.list.create')"
            @click="openAddForm"
        />
      </template>
    </GhPageHeader>

    <ProektFilterBar
        :filters="nastroikiSpiska.filter"
        :counts="proektiStore.statusiSoSchetchikami"
        :total="spisok.length"
        :visible-total="vidimieProekti.length"
        :loading="loaderSpiskaProektov"
        :last-updated-at="posledneeObnovlenie"
        :chips="proektiStore.aktivnieFiltri"
        :truncated-limit="proektiStore.obrezanSpisok ? nastroikiSpiska.limit : null"
        @change="obrabotatIzmenenieFiltrov"
        @submit="proektiStore.poluchitSpisokProektov()"
        @create="openAddForm"
        @remove-chip="udalitChip"
        @clear-filters="proektiStore.sbrozitFiltri()"
    />

    <GhBanner
        v-if="oshibkaZagruzkiSpiska"
        variant="danger"
        :title="t('unit.spisok_proektov.list.error_title')"
        class="proekt-page__gap"
    >
      {{ t('unit.spisok_proektov.page.error_description') }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="t('unit.spisok_proektov.list.retry')"
            :loading="loaderSpiskaProektov"
            @click="proektiStore.poluchitSpisokProektov()"
        />
      </template>
    </GhBanner>

    <template v-else>
      <div v-if="pokazatSkeletony" class="proekt-cards-grid" aria-busy="true">
        <GhBox v-for="n in 6" :key="`proekt-skeleton-${n}`" padding="md">
          <div class="proekt-page__skeleton-lines">
            <GhSkeleton variant="text" width="60%" height="16" />
            <GhSkeleton variant="text" width="85%" height="12" />
            <GhSkeleton variant="text" width="40%" height="12" />
          </div>
        </GhBox>
      </div>

      <GhEmptyState
          v-else-if="vidimieProekti.length === 0"
          :icon="estAktivnieFiltri ? 'search' : 'project'"
          :title="estAktivnieFiltri
            ? t('unit.spisok_proektov.list.empty_search')
            : t('unit.spisok_proektov.list.empty_title')"
          :description="estAktivnieFiltri
            ? t('unit.spisok_proektov.list.empty_filtered')
            : t('unit.spisok_proektov.list.empty_description')"
      >
        <template #actions>
          <GhButton
              v-if="estAktivnieFiltri"
              variant="default"
              icon="filter"
              :label="t('unit.spisok_proektov.filter.reset')"
              @click="proektiStore.sbrozitFiltri()"
          />
          <GhButton
              v-else
              variant="primary"
              icon="plus"
              :label="t('unit.spisok_proektov.list.create')"
              @click="openAddForm"
          />
        </template>
      </GhEmptyState>

      <div v-else class="proekt-cards-grid">
        <ProektCard
            v-for="item in vidimieProekti"
            :key="'proekt_card_' + item.id"
            :item="item"
        />
      </div>
    </template>

    <GhDialog
        v-model="enableAddForm"
        :title="t('unit.form_add_project.caption')"
        width="700px"
    >
      <AddForm @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov()" />
    </GhDialog>
  </div>
</template>

<style scoped>
.proekt-page {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.proekt-page__gap {
  margin-bottom: 16px;
}

.proekt-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  align-items: start;
  gap: 16px;
}

.proekt-page__skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
