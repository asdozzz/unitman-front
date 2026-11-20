<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import {useRoute, useRouter} from "vue-router";
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

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/**
 * Защита от цикла «фильтр → URL → фильтр»: пока фильтр применён из URL,
 * его изменение не должно снова писать URL.
 */
const propuskatZapisVUrl = ref(false);

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
</script>

<template>
  <div class="full-width flex column">
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

    <q-linear-progress
        v-if="loaderSpiskaHranilish"
        indeterminate
        color="primary"
        class="q-mb-md"
    />

    <div v-if="oshibkaZagruzkiSpiska" class="hranilisha-list__error" role="alert">
      <q-icon name="error_outline" size="20px" />
      <span class="hranilisha-list__error-text">{{ $t('unit.spisok_rep.list.error_title') }}</span>
      <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="$t('unit.spisok_rep.list.retry')"
          @click="hranilishaStore.poluchitSpisokHranilish()"
      />
    </div>

    <template v-else>
      <div v-if="vidimieHranilisha.length === 0" class="hranilisha-cards-grid__empty">
        <template v-if="hranilishaStore.estAktivnieFiltri">
          <span class="hranilisha-cards-grid__empty-title">
            {{ $t('unit.spisok_rep.list.empty_filtered') }}
          </span>
          <q-btn
              class="hranilisha-cards-grid__empty-action"
              flat
              dense
              no-caps
              color="primary"
              icon="filter_alt_off"
              :label="$t('unit.spisok_rep.filter.reset')"
              @click="hranilishaStore.sbrozitFiltri()"
          />
        </template>
        <template v-else>
          {{ $t('unit.spisok_rep.list.empty_result') }}
        </template>
      </div>

      <div v-else class="hranilisha-cards-grid">
        <HranilishaCard
            v-for="item in vidimieHranilisha"
            :key="'hranilisha_card_' + item.id"
            :item="item"
        />
      </div>
    </template>

    <q-dialog v-model="enableEditForm" persistent transition-show="scale" transition-hide="scale">
      <EditForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()" />
    </q-dialog>
    <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
      <AddForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()" />
    </q-dialog>
  </div>
</template>

<style scoped>
.hranilisha-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: var(--app-space-4);
}

.hranilisha-cards-grid__empty {
  padding: var(--app-space-4);
  color: var(--app-text-secondary);
}

.hranilisha-cards-grid__empty-title {
  display: block;
}

.hranilisha-cards-grid__empty-action {
  margin-top: var(--app-space-2);
}

.hranilisha-list__error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-2);
  padding: var(--app-space-3);
  border: 1px solid color-mix(in srgb, var(--app-negative) 35%, transparent);
  border-radius: var(--app-radius-md);
  background: color-mix(in srgb, var(--app-negative) 8%, transparent);
  color: var(--app-negative);
}

.hranilisha-list__error-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--app-font-size-body);
}
</style>
