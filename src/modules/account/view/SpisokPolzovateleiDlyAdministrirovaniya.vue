<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhCounter,
  GhDialog,
  GhEmptyState,
  GhKbd,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import {
  useSpisokPolzovateleiDlyAdmininstrirovaniyaStore,
} from "@/modules/account/store/SpisokVsehPolzovateleiDlyAdmininstrirovaniyaStore";
import {
  useFormaRegistraziiPolzovatelya,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";
import FormaRegistraziiPolzovatelya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelya.vue";
import { useAuthStore } from "@/modules/account/store/auth";
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
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const { getLocale } = storeToRefs(authStore);

const spisokStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const {
  nastroikiSpiska,
  vidimiePolzovateli,
  loaderSpiska,
  oshibkaPolucheniyaSpiska,
} = storeToRefs(spisokStore);

const formaRegistrazii = useFormaRegistraziiPolzovatelya();
const { enable: enableAddForm } = storeToRefs(formaRegistrazii);

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/** Обёртка тулбара — нужна для фокуса в поиск по `/`. */
const konteynerFiltra = ref<HTMLElement | null>(null);

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

/** Список уже загружен — при обновлении не мигаем скелетонами. */
const estDannie = computed<boolean>(() => spisokStore.spisok.length > 0);

/** Скелетоны — только на первичной загрузке (CLS=0). */
const pokazatSkeletony = computed<boolean>(
  () => loaderSpiska.value && !estDannie.value,
);

/**
 * Обработчик `change` от тулбара: фильтр уже собран компонентом, страница лишь
 * записывает его и решает, нужен ли debounce (он живёт в сторе).
 */
function obrabotatIzmenenieFiltrov(payload: { filters: PolzovatelFiltri; immediate: boolean }) {
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
function udalitChip(chip: { key: PolzovatelFilterKey; value?: string }) {
  const filter = nastroikiSpiska.value.filter;

  switch (chip.key) {
    case "statuses":
      void spisokStore.primenitFiltri({
        statuses: filter.statuses.filter((status) => status !== chip.value),
      });
      return;
    case "role":
      void spisokStore.primenitFiltri({ role: DEFAULT_POLZOVATEL_FILTERS.role });
      return;
    case "search":
      void spisokStore.primenitFiltri({ search: DEFAULT_POLZOVATEL_FILTERS.search });
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

    void router.replace({ query: serializovannie });
  },
  { deep: true },
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

function obnovitSpisok(): void {
  if (loaderSpiska.value) {
    return;
  }

  void spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
}

/** Закрытие диалога регистрации: сбрасываем форму стора. */
function zakrytDialogRegistrazii(value: boolean): void {
  if (!value) {
    formaRegistrazii.zakritFormu();
  }
}

/** Переводит фокус в поле поиска. `false`, если поля нет. */
function fokusNaFiltr(): boolean {
  const pole = konteynerFiltra.value?.querySelector<HTMLInputElement>("input");

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
 * Страничные хоткеи: `R` — обновить, `c` — создать, `/` — фокус в поиск.
 * Учитывает `g`-последовательность глобального `useHotkeys`.
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

  if (ozhidaetsyaVtorayaKlavishaPosledovatelnosti()) {
    return;
  }

  const klavisha = event.key.toLowerCase();

  if (klavisha === "r") {
    event.preventDefault();
    obnovitSpisok();
    return;
  }

  if (klavisha === "c") {
    event.preventDefault();
    openAddForm();
    return;
  }

  if (event.key === "/" && fokusNaFiltr()) {
    event.preventDefault();
  }
}

onMounted(() => {
  void spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
  window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
  window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <div class="polzovatel-list primer">
    <GhPageHeader
      :title="t('account.spisok.header.title')"
      :description="t('account.spisok.header.description')"
    >
      <template #title-append>
        <GhCounter
          :value="spisokStore.spisok.length"
          :label="t('account.spisok.header.accounts_count')"
        />
      </template>

      <template #actions>
        <GhButton
          icon="sync"
          :loading="loaderSpiska"
          :disabled="loaderSpiska"
          @click="obnovitSpisok"
        >
          <span>{{ t("account.spisok.filter.refresh") }}</span>
          <q-tooltip>
            {{ t("account.spisok.filter.refresh") }}
            <GhKbd>R</GhKbd>
          </q-tooltip>
        </GhButton>
        <GhButton variant="primary" icon="plus" @click="openAddForm">
          {{ t("account.spisok.buttons.add") }}
          <q-tooltip>
            {{ t("account.spisok.buttons.add") }}
            <GhKbd>C</GhKbd>
          </q-tooltip>
        </GhButton>
      </template>
    </GhPageHeader>

    <div ref="konteynerFiltra" class="polzovatel-list__toolbar">
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
        @submit="obnovitSpisok"
        @remove-chip="udalitChip"
        @clear-filters="spisokStore.sbrozitFiltri()"
        @create="openAddForm"
      />
    </div>

    <GhBanner
      v-if="oshibkaPolucheniyaSpiska"
      variant="danger"
      :title="t('account.spisok.list.error_title')"
      class="polzovatel-list__banner"
    >
      <p class="polzovatel-list__banner-text">{{ oshibkaPolucheniyaSpiska }}</p>
      <template #actions>
        <GhButton
          size="sm"
          icon="sync"
          :label="t('account.spisok.list.retry')"
          @click="obnovitSpisok"
        />
      </template>
    </GhBanner>

    <template v-else>
      <div
        v-if="pokazatSkeletony"
        class="polzovatel-cards-grid"
        aria-busy="true"
      >
        <GhBox
          v-for="n in 6"
          :key="`account-skeleton-${n}`"
          padding="md"
          class="polzovatel-card-skeleton"
        >
          <div class="polzovatel-card-skeleton__lines" aria-hidden="true">
            <GhSkeleton variant="text" width="60%" height="14" />
            <GhSkeleton variant="text" width="40%" height="12" />
            <GhSkeleton variant="rect" width="100%" height="12" />
          </div>
        </GhBox>
      </div>

      <GhEmptyState
        v-else-if="vidimiePolzovateli.length === 0"
        icon="people"
        :title="
          spisokStore.estAktivnieFiltri
            ? t('account.spisok.list.empty_filtered')
            : t('account.spisok.list.empty_result')
        "
        :description="
          spisokStore.estAktivnieFiltri
            ? t('account.spisok.list.empty_filtered_description')
            : t('account.spisok.list.empty_result_description')
        "
      >
        <template #actions>
          <GhButton
            v-if="spisokStore.estAktivnieFiltri"
            variant="default"
            icon="filter"
            :label="t('account.spisok.filter.reset')"
            @click="spisokStore.sbrozitFiltri()"
          />
          <GhButton
            v-else
            variant="primary"
            icon="plus"
            :label="t('account.spisok.buttons.add')"
            @click="openAddForm"
          />
        </template>
      </GhEmptyState>

      <div v-else class="polzovatel-cards-grid">
        <PolzovatelCard
          v-for="item in vidimiePolzovateli"
          :key="'polzovatel_card_' + item.id"
          :item="item"
        />
      </div>
    </template>

    <GhDialog
      :model-value="enableAddForm"
      :title="t('account.form_add.caption')"
      width="560px"
      @update:model-value="zakrytDialogRegistrazii"
    >
      <FormaRegistraziiPolzovatelya
        @formaBilaOtpravlena="spisokStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"
      />
    </GhDialog>
  </div>
</template>

<style scoped>
.polzovatel-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.polzovatel-list__toolbar {
  min-width: 0;
}

.polzovatel-list__banner-text {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.polzovatel-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: 12px;
}

.polzovatel-card-skeleton__lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 72px;
}
</style>
