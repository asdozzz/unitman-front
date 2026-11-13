<script setup lang="ts">
import {storeToRefs} from "pinia";
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {useRoute} from 'vue-router'
import {storVipolnenihZadachRunnera} from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";
import {logProgressa} from "@/modules/unit/model/websocket/LogProgressaZadachi";
import {convertDateTime, convertTime, dlitelnostShaga} from "@/utils/dates";

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

const bannerSostoyaniya = computed(() => {
  switch (sostoyanie.value) {
    case 'success':
      return {klass: 'bg-positive text-white', ikonka: 'check_circle', tekst: 'finished_success'};
    case 'error':
      return {klass: 'bg-negative text-white', ikonka: 'error', tekst: 'finished_error'};
    case 'running':
      return {klass: 'bg-primary text-white', ikonka: 'autorenew', tekst: 'running'};
    default:
      return {klass: 'bg-grey-8 text-white', ikonka: 'hourglass_empty', tekst: 'waiting'};
  }
});

const indikatorKanala = computed(() => {
  switch (channelState.value) {
    case 'live':
      return {cvet: 'green', ikonka: 'circle', tekst: 'live'};
    case 'reconnecting':
      return {cvet: 'amber', ikonka: 'circle', tekst: 'reconnecting'};
    default:
      return {cvet: 'grey', ikonka: 'circle', tekst: 'readonly'};
  }
});

onMounted(async () => {
  window.addEventListener('scroll', obnovitPriznakNizhnegoKraya, {passive: true});
  obnovitPriznakNizhnegoKraya();

  logProgressa('страница выполненных задач открыта', {
    unitId: route.params.id,
    kanalSostoyanie: channelState.value,
  });

  await store.poluchitVipolnenieZadachiRunnera(route.params.id as string);

  logProgressa('страница выполненных задач загрузила список', {
    unitId: route.params.id,
    prozesov: spisok.value.length,
    vybrannayaZadacha: selectJob.value.zadachaId,
    kanalSostoyanie: channelState.value,
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', obnovitPriznakNizhnegoKraya);
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
    {flush: 'post'},
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
      logProgressa('прогресс на странице изменился', {
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
      logProgressa('выбранная задача изменилась', {
        bylo: staraya,
        stalo: novaya,
        kanal: novaya === '' ? null : `unit_progress#${novaya}`,
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
  window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'smooth'});
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
  <div class="full-width flex column">
    <q-spinner
        v-if="loader"
        color="primary"
        size="3em"
    />
    <div v-else class="flex flex-center column">
      <div class="row" style="min-height: 400px; width: 100%;">
        <div class="full-height full-width row inline wrap justify-start items-start content-start">
          <div class="col-9" style="overflow: hidden;">
            <q-card class="no-border-radius bg-grey-10">
              <q-card-section class="q-pb-none">
                <div class="row items-center q-gutter-sm q-pb-sm">
                  <div class="col">
                    <q-banner
                        dense
                        rounded
                        :class="bannerSostoyaniya.klass"
                    >
                      <template v-slot:avatar>
                        <q-icon :name="bannerSostoyaniya.ikonka"/>
                      </template>
                      {{ $t('unit.okno_zadach_runnera.' + bannerSostoyaniya.tekst) }}
                    </q-banner>
                  </div>
                  <div class="col-auto row items-center q-gutter-xs">
                    <q-icon :name="indikatorKanala.ikonka" :color="indikatorKanala.cvet" size="12px"/>
                    <span class="text-grey-5 fs-12">
                      {{ $t('unit.okno_zadach_runnera.' + indikatorKanala.tekst) }}
                    </span>
                    <q-btn
                        v-if="channelState === 'readonly'"
                        dense
                        flat
                        size="sm"
                        color="grey-5"
                        icon="refresh"
                        :loading="obnovlenieVruchnuyu"
                        :label="$t('unit.okno_zadach_runnera.refresh_button')"
                        @click="obnovitVruchnuyu"
                    />
                  </div>
                </div>

                <div v-if="progressOtobrazhaemiya.updatedAt > 0" class="text-grey-5 fs-12 q-pb-sm">
                  {{ $t('unit.okno_zadach_runnera.updated_at', {time: convertTime(progressOtobrazhaemiya.updatedAt)}) }}
                </div>

                <q-banner
                    v-if="oshibkaOtBackenda !== null"
                    dense
                    rounded
                    class="bg-negative text-white q-mb-sm"
                >
                  <template v-slot:avatar>
                    <q-icon name="warning"/>
                  </template>
                  {{ oshibkaOtBackenda }}
                </q-banner>

                <q-banner
                    v-if="neUdalosObnovitProgress"
                    dense
                    rounded
                    class="bg-grey-9 text-grey-4 q-mb-sm"
                >
                  <template v-slot:avatar>
                    <q-icon name="cloud_off"/>
                  </template>
                  {{ $t('unit.okno_zadach_runnera.refresh_failed') }}
                </q-banner>
              </q-card-section>

              <q-card-section v-if="selectJob.zadachaId !== ''">
                <div v-for="({step, dlitelnost}, i) in shagiSDlitelnostyu" :key="i">
                  <div class="text-light-green-14 fs-12">
                    <div class="row">
                      <div class="col"><pre class="bash-output">{{step.command}}</pre></div>
                      <div class="col-auto">
                        <div v-if="i===0">
                          {{convertDateTime(step.unixtime)}}
                        </div>
                        <div v-if="dlitelnost !== null">
                          {{dlitelnost + ' s'}}
                        </div>
                      </div>
                    </div>

                  </div>
                  <div v-if="step.success" class="text-grey-1 fs-12">
                    <pre class="bash-output">{{step.response}}</pre>
                  </div>
                  <div v-if="!step.success" class="text-negative fs-12">
                    <pre class="bash-output">{{step.response}}</pre>
                  </div>

                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-3 bg-grey-6" style="overflow: auto;">
            <q-card class="no-border-radius">
              <q-card-section class="q-pt-none">
                <q-list bordered separator :padding="false" class="rounded-borders">
                  <q-expansion-item
                      expand-separator
                      v-for="(prozess) in spisok"
                      :model-value="prozess.id === selectJob.prozesId"
                      :key="prozess.id" active-class="bg-primary text-white">
                    <template v-slot:header>
                      <q-item-section avatar>
                        <q-icon v-if="prozess.state == 'NEW'  || prozess.state == 'ZADACHI_DOBAVLENI'" name="fiber_new"></q-icon>
                        <q-icon v-if="prozess.state == 'PENDING'" color="primary" name="access_time"></q-icon>
                        <q-icon v-if="prozess.state == 'ERROR' || prozess.state == 'CANCLED'"  class="text-negative" name="error"></q-icon>
                        <q-icon v-if="prozess.state == 'SUCCESS'" class="text-positive" name="check_circle"></q-icon>
                      </q-item-section>

                      <q-item-section :class="{'text-primary':prozess.id === selectJob.prozesId}">
                        <span class="text-weight-bolder">{{$t('unit.tipi_prozesa.'+prozess.type)}}</span>
                      </q-item-section>
                    </template>
                    <q-list bordered separator class="rounded-borders q-pl-md">
                      <q-item
                          clickable
                          v-for="zadacha in prozess.jobs"
                          :key="zadacha.id"
                          :active="zadacha.id === selectJob.zadachaId"
                          @click="store.select(prozess.id, zadacha.id)">
                        <q-item-section avatar>
                          <q-icon size="xs" v-if="zadacha.state == 'NEW'" color="primary" name="fiber_new"></q-icon>
                          <q-icon size="xs" v-if="zadacha.state == 'PENDING'" color="primary" name="access_time"></q-icon>
                          <q-icon size="xs" v-if="zadacha.state == 'ERROR' || zadacha.state == 'CANCLED'"  class="text-negative" name="error"></q-icon>
                          <q-icon size="xs" v-if="zadacha.state == 'SUCCESS'" class="text-positive" name="check_circle"></q-icon>
                        </q-item-section>

                        <q-item-section>
                          {{$t('unit.tipi_zadach.'+zadacha.type)}}
                        </q-item-section>

                      </q-item>
                    </q-list>
                  </q-expansion-item>
                </q-list>

              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
    <q-page-scroller
        reverse
        position="bottom-right"
        :scroll-offset="150"
        :offset="[18, 80]"
    >
      <q-btn fab icon="keyboard_arrow_down" color="accent" />
    </q-page-scroller>
  </div>
</template>

<style>
.fs-12 {
  font-size: 12px;
}

.bash-output {
  margin: 0;
  white-space: pre-wrap;
}
</style>
