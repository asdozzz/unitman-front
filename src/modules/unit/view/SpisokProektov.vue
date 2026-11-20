<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import {useRoute, useRouter} from "vue-router";
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

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/**
 * Защита от цикла «фильтр → URL → фильтр»: пока фильтр применён из URL,
 * его изменение не должно снова писать URL.
 */
const propuskatZapisVUrl = ref(false);

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
</script>

<template>
  <div class="full-width flex column">
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

    <q-linear-progress
        v-if="loaderSpiskaProektov"
        indeterminate
        color="primary"
        class="q-mb-md"
    />

    <div v-if="oshibkaZagruzkiSpiska" class="proekt-list__error" role="alert">
      <q-icon name="error_outline" size="20px" />
      <span class="proekt-list__error-text">{{ $t('unit.spisok_proektov.list.error_title') }}</span>
      <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="$t('unit.spisok_proektov.list.retry')"
          @click="proektiStore.poluchitSpisokProektov()"
      />
    </div>

    <template v-else>
      <div v-if="vidimieProekti.length === 0" class="proekt-cards-grid__empty">
        <template v-if="proektiStore.estAktivnieFiltri">
          <span class="proekt-cards-grid__empty-title">
            {{ $t('unit.spisok_proektov.list.empty_filtered') }}
          </span>
          <q-btn
              class="proekt-cards-grid__empty-action"
              flat
              dense
              no-caps
              color="primary"
              icon="filter_alt_off"
              :label="$t('unit.spisok_proektov.filter.reset')"
              @click="proektiStore.sbrozitFiltri()"
          />
        </template>
        <template v-else>
          {{ $t('unit.spisok_proektov.list.empty_result') }}
        </template>
      </div>

      <div v-else class="proekt-cards-grid">
        <ProektCard
            v-for="item in vidimieProekti"
            :key="'proekt_card_' + item.id"
            :item="item"
        />
      </div>
    </template>

    <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
      <AddForm @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov()" />
    </q-dialog>
  </div>
</template>

<style scoped>
.proekt-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: var(--app-space-4);
}

.proekt-cards-grid__empty {
  padding: var(--app-space-4);
  color: var(--app-text-secondary);
}

.proekt-cards-grid__empty-title {
  display: block;
}

.proekt-cards-grid__empty-action {
  margin-top: var(--app-space-2);
}

.proekt-list__error {
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

.proekt-list__error-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--app-font-size-body);
}
</style>
