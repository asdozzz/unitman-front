<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import {useRoute, useRouter} from "vue-router";
import {
  useSpisokPolzovateleiDlyAdmininstrirovaniyaStore,
} from "@/modules/account/store/SpisokVsehPolzovateleiDlyAdmininstrirovaniyaStore";
import {
  useFormaRegistraziiPolzovatelya,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";
import FormaRegistraziiPolzovatelya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelya.vue";
import {useAuthStore} from "@/modules/account/store/auth";
import PolzovatelFilterBar
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelFilterBar.vue";
import PolzovatelCard
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelCard.vue";
import {
  DEFAULT_POLZOVATEL_FILTERS,
  type PolzovatelFilterKey,
  type PolzovatelFiltri,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";
import {
  prochitatFiltriIzQuery,
  serializovatFiltriVQuery,
} from "@/modules/account/utils/polzovatelFiltersUrl";

const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const {getLocale} = storeToRefs(authStore);

const spisokStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const {
  nastroikiSpiska,
  vidimiePolzovateli,
  loaderSpiska,
  oshibkaPolucheniyaSpiska,
} = storeToRefs(spisokStore);

const formaRegistrazii = useFormaRegistraziiPolzovatelya();
const {enable: enableAddForm} = storeToRefs(formaRegistrazii);

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/**
 * Защита от цикла «фильтр → URL → фильтр»: пока фильтр применён из URL,
 * его изменение не должно снова писать URL.
 */
const propuskatZapisVUrl = ref(false);

const KLYUCHI_FILTRA = [
  "search",
  "statuses",
  "role",
  "sort",
] as const;

/**
 * Обработчик `change` от тулбара: фильтр уже собран компонентом, страница лишь
 * записывает его и решает, нужен ли debounce (он живёт в сторе).
 */
function obrabotatIzmenenieFiltrov(payload: {filters: PolzovatelFiltri; immediate: boolean}) {
  nastroikiSpiska.value.filter = payload.filters;
  spisokStore.sohranitNastroiki();

  if (payload.immediate) {
    void spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
  } else {
    spisokStore.zaprositPolzovateleiDlyAdmininstrirovaniya();
  }
}

/**
 * Удаление одного чипа активного фильтра.
 *
 * Для `statuses` убирается конкретное значение, для `role`/`search` —
 * возвращается значение по умолчанию.
 */
function udalitChip(chip: {key: PolzovatelFilterKey; value?: string}) {
  const filter = nastroikiSpiska.value.filter;

  switch (chip.key) {
    case "statuses":
      void spisokStore.primenitFiltri({
        statuses: filter.statuses.filter((status) => status !== chip.value),
      });
      return;
    case "role":
      void spisokStore.primenitFiltri({role: DEFAULT_POLZOVATEL_FILTERS.role});
      return;
    case "search":
      void spisokStore.primenitFiltri({search: DEFAULT_POLZOVATEL_FILTERS.search});
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
 * При обратной навигации (`zaprositSpisok = true`) фильтр применяется, только
 * если сериализованные значения отличаются, и без повторной записи URL.
 */
function primenitFiltriIzUrl(query: Record<string, unknown>, zaprositSpisok: boolean): void {
  const noviyFilter = prochitatFiltriIzQuery(query);
  const tekushiy = serializovatFiltriVQuery(nastroikiSpiska.value.filter);
  const noviy = serializovatFiltriVQuery(noviyFilter);

  if (ekvivalentni(tekushiy, noviy)) {
    return;
  }

  propuskatZapisVUrl.value = true;
  nastroikiSpiska.value.filter = noviyFilter;

  void nextTick(() => {
    propuskatZapisVUrl.value = false;
  });

  if (zaprositSpisok) {
    void spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
  }
}

// Инициализация из URL — до создания watcher'ов, чтобы применение query не
// вызвало обратную запись. Пустой query оставляет фильтр из localStorage.
if (estFiltriVQuery(route.query)) {
  primenitFiltriIzUrl(route.query, false);
}

// Изменение фильтра (тулбар, чипы, сброс) синхронизирует query через replace.
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
      primenitFiltriIzUrl(noviyQuery, true);
    },
);

// Фиксируем момент окончания загрузки, чтобы тулбар показал «обновлено …».
watch(loaderSpiska, (zagruzka: boolean, bilaZagruzka: boolean | undefined) => {
  if (bilaZagruzka === true && zagruzka === false) {
    posledneeObnovlenie.value = Math.floor(Date.now() / 1000);
  }
});

function openAddForm() {
  formaRegistrazii.otkritFormu(getLocale.value);
}

onMounted(() => {
  void spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
});
</script>

<template>
  <div class="full-width flex column">
    <PolzovatelFilterBar
        :filters="nastroikiSpiska.filter"
        :roles="spisokStore.roliPolzovatelei"
        :counts="spisokStore.statusiSoSchetchikami"
        :total="spisokStore.spisok.length"
        :loading="loaderSpiska"
        :last-updated-at="posledneeObnovlenie"
        :chips="spisokStore.aktivnieFiltri"
        :truncated-limit="spisokStore.obrezanSpisok ? nastroikiSpiska.limit : null"
        @change="obrabotatIzmenenieFiltrov"
        @submit="spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"
        @remove-chip="udalitChip"
        @clear-filters="spisokStore.sbrozitFiltri()"
        @create="openAddForm"
    />

    <q-linear-progress
        v-if="loaderSpiska"
        indeterminate
        color="primary"
        class="q-mb-md"
    />

    <div v-if="oshibkaPolucheniyaSpiska" class="polzovatel-list__error" role="alert">
      <q-icon name="error_outline" size="20px" />
      <span class="polzovatel-list__error-text">
        {{ $t('account.spisok.list.error_title') }}
      </span>
      <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="$t('account.spisok.list.retry')"
          @click="spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"
      />
    </div>

    <template v-else>
      <div v-if="vidimiePolzovateli.length === 0" class="polzovatel-cards-grid__empty">
        <template v-if="spisokStore.estAktivnieFiltri">
          <span class="polzovatel-cards-grid__empty-title">
            {{ $t('account.spisok.list.empty_filtered') }}
          </span>
          <q-btn
              class="polzovatel-cards-grid__empty-action"
              flat
              dense
              no-caps
              color="primary"
              icon="filter_alt_off"
              :label="$t('account.spisok.filter.reset')"
              @click="spisokStore.sbrozitFiltri()"
          />
        </template>
        <template v-else>
          {{ $t('account.spisok.list.empty_result') }}
        </template>
      </div>

      <div v-else class="polzovatel-cards-grid">
        <PolzovatelCard
            v-for="item in vidimiePolzovateli"
            :key="'polzovatel_card_' + item.id"
            :item="item"
        />
      </div>
    </template>

    <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
      <FormaRegistraziiPolzovatelya
          @formaBilaOtpravlena="spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"
      />
    </q-dialog>
  </div>
</template>

<style scoped>
.polzovatel-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: var(--app-space-4);
}

.polzovatel-cards-grid__empty {
  padding: var(--app-space-4);
  color: var(--app-text-secondary);
}

.polzovatel-cards-grid__empty-title {
  display: block;
}

.polzovatel-cards-grid__empty-action {
  margin-top: var(--app-space-2);
}

.polzovatel-list__error {
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

.polzovatel-list__error-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--app-font-size-body);
}
</style>
