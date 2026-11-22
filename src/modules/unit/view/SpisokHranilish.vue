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
import EditForm from "@/modules/unit/view/Hranilisha/EditForm.vue";
import AddForm from "@/modules/unit/view/Hranilisha/AddForm.vue";
import {useSpisokHranilishStore} from "@/modules/unit/store/SpisokHranilishStore";
import {useEditFormStore} from "@/modules/unit/store/SpisokHranilish/EditFormStore";
import {useAddFormStore} from "@/modules/unit/store/SpisokHranilish/AddFormStore";
import HranilishaFilterBar from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaFilterBar.vue";
import HranilishaCard from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaCard.vue";
import {
  DEFAULT_HRANILISHA_FILTERS,
  type HranilishaFilterKey,
  type HranilishaFiltri,
} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";
import {
  prochitatFiltriIzQuery,
  serializovatFiltriVQuery,
} from "@/modules/unit/utils/hranilishaFiltersUrl";
import {ozhidaetsyaVtorayaKlavishaPosledovatelnosti} from "@/utils/useHotkeys";

const hranilishaStore = useSpisokHranilishStore();
const {
  spisok,
  nastroikiSpiska,
  loaderSpiskaHranilish,
  oshibkaZagruzkiSpiska,
  vidimieHranilisha,
} = storeToRefs(hranilishaStore);

const editFormStore = useEditFormStore();
const {enable: enableEditForm} = storeToRefs(editFormStore);

const addFormStore = useAddFormStore();
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
    () => loaderSpiskaHranilish.value && spisok.value.length === 0,
);

/** Есть ли активные фильтры — от этого зависит пустое состояние. */
const estAktivnieFiltri = computed<boolean>(() => hranilishaStore.estAktivnieFiltri);

const KLYUCHI_FILTRA = [
  "search",
  "type",
  "statuses",
  "sort",
] as const;

/**
 * Обработчик `change` от тулбара: фильтрация клиентская, поэтому достаточно
 * перезаписать фильтр и сохранить настройки — запрос списка не нужен.
 */
function obrabotatIzmenenieFiltrov(payload: {filters: HranilishaFiltri; immediate: boolean}) {
  nastroikiSpiska.value.filter = payload.filters;
  hranilishaStore.sohranitNastroiki();
}

/**
 * Удаление одного чипа активного фильтра.
 *
 * Для `statuses` убирается конкретное значение, для остальных ключей
 * возвращается значение по умолчанию.
 */
function udalitChip(chip: {key: HranilishaFilterKey; value?: string}) {
  const filter = nastroikiSpiska.value.filter;

  switch (chip.key) {
    case "statuses":
      hranilishaStore.primenitFiltri({
        statuses: filter.statuses.filter((status) => status !== chip.value),
      });
      return;
    case "search":
      hranilishaStore.primenitFiltri({search: DEFAULT_HRANILISHA_FILTERS.search});
      return;
    case "type":
      hranilishaStore.primenitFiltri({type: DEFAULT_HRANILISHA_FILTERS.type});
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
  hranilishaStore.sohranitNastroiki();

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
watch(loaderSpiskaHranilish, (zagruzka: boolean, bilaZagruzka: boolean | undefined) => {
  if (bilaZagruzka === true && zagruzka === false) {
    posledneeObnovlenie.value = Math.floor(Date.now() / 1000);
  }
});

onMounted(async () => {
  await hranilishaStore.poluchitSpisokHranilish();
});

function openAddForm() {
  addFormStore.otkritFormu();
}

/** Переводит фокус в поле поиска. `false`, если поля нет. */
function fokusNaPoisk(): boolean {
  const pole = document.getElementById("hranilisha-filter-search") as HTMLInputElement | null;

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
 * Страничные хоткеи: `R` — обновить, `/` — поиск, `c` — добавить репозиторий.
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
    if (!loaderSpiskaHranilish.value) {
      void hranilishaStore.poluchitSpisokHranilish();
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
  <div class="hranilisha-page">
    <GhPageHeader
        :title="t('unit.spisok_rep.page.title')"
        :description="t('unit.spisok_rep.page.description')"
        :counter="spisok.length"
    >
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="t('unit.spisok_rep.filter.refresh')"
            :loading="loaderSpiskaHranilish"
            @click="hranilishaStore.poluchitSpisokHranilish()"
        />
        <GhButton
            variant="primary"
            icon="plus"
            :label="t('unit.spisok_rep.list.create')"
            @click="openAddForm"
        />
      </template>
    </GhPageHeader>

    <HranilishaFilterBar
        :filters="nastroikiSpiska.filter"
        :types="hranilishaStore.tipiHranilish"
        :counts="hranilishaStore.statusiSoSchetchikami"
        :total="spisok.length"
        :visible-total="vidimieHranilisha.length"
        :loading="loaderSpiskaHranilish"
        :last-updated-at="posledneeObnovlenie"
        :chips="hranilishaStore.aktivnieFiltri"
        :truncated-limit="hranilishaStore.obrezanSpisok ? nastroikiSpiska.limit : null"
        @change="obrabotatIzmenenieFiltrov"
        @submit="hranilishaStore.poluchitSpisokHranilish()"
        @create="openAddForm"
        @remove-chip="udalitChip"
        @clear-filters="hranilishaStore.sbrozitFiltri()"
    />

    <GhBanner
        v-if="oshibkaZagruzkiSpiska"
        variant="danger"
        :title="t('unit.spisok_rep.list.error_title')"
        class="hranilisha-page__gap"
    >
      {{ t('unit.spisok_rep.page.error_description') }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="t('unit.spisok_rep.list.retry')"
            :loading="loaderSpiskaHranilish"
            @click="hranilishaStore.poluchitSpisokHranilish()"
        />
      </template>
    </GhBanner>

    <template v-else>
      <div v-if="pokazatSkeletony" class="hranilisha-cards-grid" aria-busy="true">
        <GhBox v-for="n in 6" :key="`hranilisha-skeleton-${n}`" padding="md">
          <div class="hranilisha-page__skeleton-lines">
            <GhSkeleton variant="text" width="60%" height="16" />
            <GhSkeleton variant="text" width="85%" height="12" />
            <GhSkeleton variant="text" width="40%" height="12" />
          </div>
        </GhBox>
      </div>

      <GhEmptyState
          v-else-if="vidimieHranilisha.length === 0"
          :icon="estAktivnieFiltri ? 'search' : 'database'"
          :title="estAktivnieFiltri
            ? t('unit.spisok_rep.list.empty_search')
            : t('unit.spisok_rep.list.empty_title')"
          :description="estAktivnieFiltri
            ? t('unit.spisok_rep.list.empty_filtered')
            : t('unit.spisok_rep.list.empty_description')"
      >
        <template #actions>
          <GhButton
              v-if="estAktivnieFiltri"
              variant="default"
              icon="filter"
              :label="t('unit.spisok_rep.filter.reset')"
              @click="hranilishaStore.sbrozitFiltri()"
          />
          <GhButton
              v-else
              variant="primary"
              icon="plus"
              :label="t('unit.spisok_rep.list.create')"
              @click="openAddForm"
          />
        </template>
      </GhEmptyState>

      <div v-else class="hranilisha-cards-grid">
        <HranilishaCard
            v-for="item in vidimieHranilisha"
            :key="'hranilisha_card_' + item.id"
            :item="item"
        />
      </div>
    </template>

    <GhDialog
        v-model="enableEditForm"
        :title="t('unit.form_edit_rep.caption')"
        width="700px"
    >
      <EditForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()" />
    </GhDialog>

    <GhDialog
        v-model="enableAddForm"
        :title="t('unit.form_add_rep.caption')"
        width="700px"
    >
      <AddForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()" />
    </GhDialog>
  </div>
</template>

<style scoped>
.hranilisha-page {
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.hranilisha-page__gap {
  margin-bottom: 16px;
}

.hranilisha-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  align-items: start;
  gap: 16px;
}

.hranilisha-page__skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
