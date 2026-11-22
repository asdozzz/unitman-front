<script setup lang="ts">
import {computed, onMounted} from "vue";
import {storeToRefs} from "pinia";
import { useRoute } from 'vue-router'
import {storVipolnenihZadachRunneraProekta} from "@/modules/unit/store/SpisokProektov/StorVipolnenihZadachRunnera";
import {convertDateTime, dlitelnostShaga} from "@/utils/dates";
import {
  GhBox,
  GhEmptyState,
  GhIcon,
  GhSkeleton,
} from "@/components/ui";

const store = storVipolnenihZadachRunneraProekta();
const { spisok, loader, selectJob } = storeToRefs(store);

const route = useRoute();

/**
 * Шаги вместе с длительностью выполнения.
 *
 * Длительность считается один раз на шаг: `unixtime - unixtimeStart`.
 * Для старых записей без `unixtimeStart` хелпер откатывается на разницу
 * с `unixtime` предыдущего шага.
 */
const shagiSDlitelnostyu = computed(() => {
  const spisokShagov = selectJob.value?.steps ?? [];

  return spisokShagov.map((step, i) => ({
    step,
    dlitelnost: dlitelnostShaga(step, i > 0 ? spisokShagov[i - 1] : null),
  }));
});

onMounted(async () => {
  await store.poluchitVipolnenieZadachiRunnera(route.params.id as string);
})

function tekstOtveta(otvet: string): string {
  return otvet;
}
</script>

<template>
  <div class="zadachi-runnera">
    <GhBox v-if="loader" padding="md" aria-busy="true">
      <div class="zadachi-runnera__skeleton">
        <GhSkeleton variant="text" width="40%" height="14" />
        <GhSkeleton variant="rect" width="100%" height="120" />
      </div>
    </GhBox>

    <GhBox v-else-if="spisok.length === 0" padding="none">
      <GhEmptyState
          icon="tasklist"
          :title="$t('unit.proekt.jobs.empty')"
          :description="$t('unit.proekt.jobs.steps')"
      />
    </GhBox>

    <div v-else class="zadachi-runnera__layout">
      <GhBox padding="none" class="zadachi-runnera__list">
        <template #header>
          {{ $t('unit.proekt.jobs.title') }}
        </template>

        <ul class="zadachi-runnera__jobs">
          <li v-for="zadacha in spisok" :key="zadacha.id">
            <button
                type="button"
                class="zadachi-runnera__job"
                :class="{'zadachi-runnera__job--active': zadacha.id === selectJob?.id}"
                :aria-pressed="zadacha.id === selectJob?.id ? 'true' : 'false'"
                @click="store.select(zadacha.id)"
            >
              <GhIcon name="tasklist" :size="14" />
              <span class="zadachi-runnera__job-name">{{ zadacha.jobType }}</span>
            </button>
          </li>
        </ul>
      </GhBox>

      <GhBox padding="none" class="zadachi-runnera__steps">
        <template #header>
          {{ $t('unit.proekt.jobs.steps') }}
        </template>

        <div v-if="selectJob" class="zadachi-runnera__steps-inner">
          <article
              v-for="({step, dlitelnost}, i) in shagiSDlitelnostyu"
              :key="i"
              class="zadachi-runnera__step"
          >
            <header class="zadachi-runnera__step-head">
              <GhIcon
                  :name="step.success ? 'check-circle' : 'x-circle'"
                  :size="14"
                  :class="step.success ? 'zadachi-runnera__ok' : 'zadachi-runnera__fail'"
              />
              <span class="zadachi-runnera__command gh-mono">{{ step.command }}</span>
              <span class="zadachi-runnera__time gh-mono">
                <template v-if="i === 0">{{ convertDateTime(step.unixtime) }}</template>
                <template v-if="dlitelnost !== null">
                  · {{ dlitelnost + ' ' + $t('common.units.seconds') }}
                </template>
              </span>
            </header>

            <pre
                class="zadachi-runnera__response gh-mono"
                :class="step.success ? 'zadachi-runnera__response--ok' : 'zadachi-runnera__response--fail'"
            >{{ tekstOtveta(step.response) }}</pre>
          </article>
        </div>

        <GhEmptyState
            v-else
            icon="tasklist"
            :title="$t('unit.proekt.jobs.empty')"
        />
      </GhBox>
    </div>
  </div>
</template>

<style scoped>
.zadachi-runnera {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.zadachi-runnera__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zadachi-runnera__layout {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 767.98px) {
  .zadachi-runnera__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.zadachi-runnera__jobs {
  margin: 0;
  padding: 4px;
  list-style: none;
}

.zadachi-runnera__job {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-medium);
  background: transparent;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  text-align: left;
  cursor: pointer;
}

.zadachi-runnera__job:hover {
  background: var(--bgColor-neutral-muted);
}

.zadachi-runnera__job--active {
  background: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
  font-weight: var(--fontWeight-semibold);
}

.zadachi-runnera__job:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.zadachi-runnera__job-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zadachi-runnera__steps-inner {
  display: flex;
  flex-direction: column;
  max-height: 520px;
  overflow: auto;
  padding: 8px 16px;
}

.zadachi-runnera__step {
  padding: 8px 0;
  border-bottom: 1px solid var(--borderColor-muted);
}

.zadachi-runnera__step:last-child {
  border-bottom: none;
}

.zadachi-runnera__step-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
}

.zadachi-runnera__command {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zadachi-runnera__time {
  margin-left: auto;
  color: var(--fgColor-muted);
}

.zadachi-runnera__ok {
  color: var(--fgColor-success);
}

.zadachi-runnera__fail {
  color: var(--fgColor-danger);
}

.zadachi-runnera__response {
  margin: 6px 0 0;
  max-height: 320px;
  overflow: auto;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.zadachi-runnera__response--fail {
  color: var(--fgColor-danger);
}
</style>
