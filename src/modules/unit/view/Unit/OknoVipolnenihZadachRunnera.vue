<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storVipolnenihZadachRunnera } from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";
import { logProgressa } from "@/modules/unit/model/websocket/LogProgressaZadachi";
import { convertDateTime, convertTime, dlitelnostShaga } from "@/utils/dates";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhIcon,
  GhLabel,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import type { GhBannerVariant, GhLabelVariant, OcticonName } from "@/components/ui";

/** Порог «пользователь у нижней границы», px: в пределах него автоскролл разрешён. */
const POROG_AVTOSKROLLA = 40;

const store = storVipolnenihZadachRunnera();
const {
  spisok,
  loader,
  selectJob,
  progressOtobrazhaemiya,
  channelState,
  neUdalosObnovitProgress,
  oshibkaOtBackenda,
} = storeToRefs(store);

const route = useRoute();

/** Пользователь был у нижней границы страницы до прихода новой порции шагов. */
let polzovatelUNizhnegoKraya = true;

/** Идёт ручное обновление прогресса. */
const obnovlenieVruchnuyu = ref(false);

const shagi = computed(() => progressOtobrazhaemiya.value.steps);

/**
 * Шаги вместе с длительностью выполнения.
 *
 * Длительность считается один раз на шаг: `unixtime - unixtimeStart`.
 * Для старых записей без `unixtimeStart` хелпер откатывается на разницу
 * с `unixtime` предыдущего шага, поэтому панель логов остаётся читаемой.
 */
const shagiSDlitelnostyu = computed(() => {
  const spisokShagov = shagi.value;

  return spisokShagov.map((step, i) => ({
    step,
    dlitelnost: dlitelnostShaga(step, i > 0 ? spisokShagov[i - 1] : null),
  }));
});

const sostoyanie = computed(() => progressOtobrazhaemiya.value.status);

type VidSostoyaniya = {
  variant: GhBannerVariant;
  icon: OcticonName;
  tekst: string;
};

const bannerSostoyaniya = computed<VidSostoyaniya>(() => {
  switch (sostoyanie.value) {
    case "success":
      return { variant: "success", icon: "check-circle", tekst: "finished_success" };
    case "error":
      return { variant: "danger", icon: "x-circle", tekst: "finished_error" };
    case "running":
      return { variant: "accent", icon: "sync", tekst: "running" };
    default:
      return { variant: "accent", icon: "hourglass", tekst: "waiting" };
  }
});

type VidKanala = {
  variant: GhLabelVariant;
  tekst: string;
};

const indikatorKanala = computed<VidKanala>(() => {
  switch (channelState.value) {
    case "live":
      return { variant: "success", tekst: "live" };
    case "reconnecting":
      return { variant: "attention", tekst: "reconnecting" };
    default:
      return { variant: "neutral", tekst: "readonly" };
  }
});

/** Иконка состояния процесса/задачи по P5. */
function ikonkaSostoyaniya(sostoyanieZadachi: string): OcticonName {
  switch (sostoyanieZadachi) {
    case "SUCCESS":
      return "check-circle";
    case "ERROR":
    case "CANCLED":
      return "x-circle";
    case "PENDING":
      return "clock";
    default:
      return "plus";
  }
}

/** Класс-модификатор состояния для иконки процесса/задачи. */
function klassSostoyaniya(sostoyanieZadachi: string): string {
  switch (sostoyanieZadachi) {
    case "SUCCESS":
      return "jobs-state--success";
    case "ERROR":
    case "CANCLED":
      return "jobs-state--danger";
    case "PENDING":
      return "jobs-state--accent";
    default:
      return "jobs-state--muted";
  }
}

onMounted(async () => {
  window.addEventListener("scroll", obnovitPriznakNizhnegoKraya, { passive: true });
  obnovitPriznakNizhnegoKraya();

  logProgressa("страница выполненных задач открыта", {
    unitId: route.params.id,
    kanalSostoyanie: channelState.value,
  });

  await store.poluchitVipolnenieZadachiRunnera(route.params.id as string);

  logProgressa("страница выполненных задач загрузила список", {
    unitId: route.params.id,
    prozesov: spisok.value.length,
    vybrannayaZadacha: selectJob.value.zadachaId,
    kanalSostoyanie: channelState.value,
  });
});

onUnmounted(() => {
  window.removeEventListener("scroll", obnovitPriznakNizhnegoKraya);
  // Уходим со страницы — снимаем подписки на канал прогресса и на события юнита.
  store.zakritOkno();
});

watch(
  () => [progressOtobrazhaemiya.value.updatedAt, shagi.value.length] as const,
  () => {
    if (!polzovatelUNizhnegoKraya) {
      return;
    }

    void nextTick(prokrutitVNiz);
  },
  { flush: "post" },
);

/**
 * Наблюдение за отображаемым прогрессом.
 *
 * Логи здесь — уровень страницы: если события приходят, но UI не меняется,
 * значит снапшот отброшен в сторе (причина будет в логе `[unit_progress]`
 * из `primenitProgress`), а если этот watcher молчит — событие не дошло
 * до стора вовсе (подписка, фильтр payload'а или `jobId`).
 */
watch(
  () => progressOtobrazhaemiya.value,
  (novoe, staroe) => {
    logProgressa("прогресс на странице изменился", {
      bylo: {
        updatedAt: staroe.updatedAt,
        shagov: staroe.steps.length,
        status: staroe.status,
      },
      stalo: {
        updatedAt: novoe.updatedAt,
        shagov: novoe.steps.length,
        status: novoe.status,
      },
      vybrannayaZadacha: selectJob.value.zadachaId,
    });
  },
);

/** Подписка на смену выбранной задачи: видно, какая задача реально наблюдается. */
watch(
  () => selectJob.value.zadachaId,
  (novaya, staraya) => {
    logProgressa("выбранная задача изменилась", {
      bylo: staraya,
      stalo: novaya,
      kanal: novaya === "" ? null : `unit_progress#${novaya}`,
    });
  },
);

/** Индикатор канала: `readonly` после `finished` — ожидаемое поведение. */
watch(channelState, (novoe, staroe) => {
  logProgressa(`состояние канала на странице: ${staroe} → ${novoe}`);
});

function obnovitPriznakNizhnegoKraya(): void {
  const vsego = document.documentElement.scrollHeight;
  const vidno = window.scrollY + window.innerHeight;

  polzovatelUNizhnegoKraya = vsego - vidno <= POROG_AVTOSKROLLA;
}

function prokrutitVNiz(): void {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
}

async function obnovitVruchnuyu(): Promise<void> {
  obnovlenieVruchnuyu.value = true;

  try {
    await store.obnovitProgressVruchnuyu();
  } finally {
    obnovlenieVruchnuyu.value = false;
  }
}
</script>

<template>
  <div class="jobs-page primer">
    <GhPageHeader :title="$t('app.titles.unit_jobs')">
      <template #actions>
        <GhLabel :variant="indikatorKanala.variant" icon="circle">
          {{ $t("unit.okno_zadach_runnera." + indikatorKanala.tekst) }}
        </GhLabel>

        <GhButton
          v-if="channelState === 'readonly'"
          size="sm"
          icon="sync"
          :loading="obnovlenieVruchnuyu"
          :label="$t('unit.okno_zadach_runnera.refresh_button')"
          @click="obnovitVruchnuyu"
        />
      </template>
    </GhPageHeader>

    <div v-if="loader" class="jobs-page__skeleton" aria-busy="true">
      <GhSkeleton variant="rect" width="100%" height="40" />
      <GhSkeleton variant="rect" width="100%" height="220" />
    </div>

    <div v-else class="jobs-layout">
      <GhBox padding="none" class="jobs-steps">
        <div class="jobs-steps__body">
          <GhBanner :variant="bannerSostoyaniya.variant" :icon="bannerSostoyaniya.icon">
            {{ $t("unit.okno_zadach_runnera." + bannerSostoyaniya.tekst) }}
          </GhBanner>

          <p v-if="progressOtobrazhaemiya.updatedAt > 0" class="jobs-page__muted">
            {{
              $t("unit.okno_zadach_runnera.updated_at", {
                time: convertTime(progressOtobrazhaemiya.updatedAt),
              })
            }}
          </p>

          <GhBanner v-if="oshibkaOtBackenda !== null" variant="danger">
            {{ oshibkaOtBackenda }}
          </GhBanner>

          <GhBanner v-if="neUdalosObnovitProgress" variant="attention">
            {{ $t("unit.okno_zadach_runnera.refresh_failed") }}
          </GhBanner>

          <template v-if="selectJob.zadachaId !== ''">
            <div
              v-for="({ step, dlitelnost }, i) in shagiSDlitelnostyu"
              :key="i"
              class="job-step"
            >
              <div class="job-step__head">
                <GhIcon
                  :name="step.success ? 'check-circle' : 'x-circle'"
                  :class="step.success ? 'job-step__icon--ok' : 'job-step__icon--fail'"
                />

                <code class="gh-mono job-step__command">{{ step.command }}</code>

                <span class="job-step__meta">
                  <span v-if="i === 0">{{ convertDateTime(step.unixtime) }}</span>
                  <span v-if="dlitelnost !== null">
                    {{ dlitelnost + " " + $t("common.units.seconds") }}
                  </span>
                </span>
              </div>

              <pre
                class="gh-mono job-step__output"
                :class="step.success ? 'job-step__output--ok' : 'job-step__output--fail'"
              >{{ step.response }}</pre>
            </div>
          </template>

          <GhEmptyState
            v-else
            icon="tasklist"
            :title="$t('unit.okno_zadach_runnera.nothing_selected')"
          />
        </div>
      </GhBox>

      <GhBox padding="none" class="jobs-processes">
        <div class="jobs-processes__body">
          <div v-for="prozess in spisok" :key="prozess.id" class="jobs-process">
            <div class="jobs-process__header">
              <GhIcon
                :name="ikonkaSostoyaniya(prozess.state)"
                :class="klassSostoyaniya(prozess.state)"
              />
              <span class="jobs-process__title">{{ $t("unit.tipi_prozesa." + prozess.type) }}</span>
            </div>

            <div class="jobs-process__jobs">
              <button
                v-for="zadacha in prozess.jobs"
                :key="zadacha.id"
                type="button"
                class="jobs-process__job"
                :class="{ 'jobs-process__job--active': zadacha.id === selectJob.zadachaId }"
                @click="store.select(prozess.id, zadacha.id)"
              >
                <GhIcon
                  :name="ikonkaSostoyaniya(zadacha.state)"
                  :size="14"
                  :class="klassSostoyaniya(zadacha.state)"
                />
                <span>{{ $t("unit.tipi_zadach." + zadacha.type) }}</span>
              </button>
            </div>
          </div>
        </div>
      </GhBox>
    </div>

    <q-page-scroller reverse position="bottom-right" :scroll-offset="150" :offset="[18, 80]">
      <GhButton icon="arrow-down" :aria-label="$t('unit.okno_zadach_runnera.scroll_to_bottom')" />
    </q-page-scroller>
  </div>
</template>

<style scoped>
.jobs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.jobs-page__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jobs-page__muted {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.jobs-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  align-items: start;
  gap: 16px;
}

.jobs-steps__body,
.jobs-processes__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.job-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--borderColor-muted);
}

.job-step:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.job-step__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.job-step__icon--ok {
  color: var(--fgColor-success);
}

.job-step__icon--fail {
  color: var(--fgColor-danger);
}

.job-step__command {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
}

.job-step__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.job-step__output {
  margin: 0;
  padding: 8px 12px;
  overflow-x: auto;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: pre-wrap;
  word-break: break-word;
}

.job-step__output--ok {
  color: var(--fgColor-default);
}

.job-step__output--fail {
  background-color: var(--bgColor-danger-muted);
  color: var(--fgColor-danger);
}

.jobs-processes__body {
  gap: 8px;
}

.jobs-process {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jobs-process__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
}

.jobs-process__title {
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.jobs-process__jobs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
}

.jobs-process__job {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-medium);
  background: transparent;
  color: var(--fgColor-default);
  font-family: inherit;
  font-size: var(--fontSize-caption);
  text-align: left;
  cursor: pointer;
}

.jobs-process__job:hover {
  background-color: var(--bgColor-muted);
}

.jobs-process__job--active {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.jobs-process__job:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
}

.jobs-state--success {
  color: var(--fgColor-success);
}

.jobs-state--danger {
  color: var(--fgColor-danger);
}

.jobs-state--accent {
  color: var(--fgColor-accent);
}

.jobs-state--muted {
  color: var(--fgColor-muted);
}

@media (max-width: 1023.98px) {
  .jobs-layout {
    grid-template-columns: 1fr;
  }
}
</style>
