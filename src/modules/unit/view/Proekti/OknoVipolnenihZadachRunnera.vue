<script setup lang="ts">
import {computed, onMounted} from "vue";
import {storeToRefs} from "pinia";
import { useRoute } from 'vue-router'
import {storVipolnenihZadachRunneraProekta} from "@/modules/unit/store/SpisokProektov/StorVipolnenihZadachRunnera";
import {convertDateTime, dlitelnostShaga} from "@/utils/dates";

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
              <q-card-section v-if="selectJob">
                <div v-for="({step, dlitelnost}, i) in shagiSDlitelnostyu" :key="i">
                  <div class="text-light-green-14 fs-12">
                    <div class="row">
                      <div class="col"># {{step.command}}</div>
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
                  <div v-if="step.success" class="text-grey-1 fs-12" v-html="step.response.split('\n').join('<br>')"></div>
                  <div v-if="!step.success" class="text-negative fs-12" v-html="step.response.split('\n').join('<br>')"></div>

                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-3 bg-grey-6" style="overflow: auto;">
            <q-card class="no-border-radius">
              <q-card-section class="q-pt-none">
                <q-list bordered separator :padding="false" class="rounded-borders">
                  <q-item clickable v-ripple v-for="(zadacha) in spisok" :key="zadacha.id" active-class="bg-primary text-white" :active="zadacha.id === selectJob?.id" @click="store.select(zadacha.id)">
                    {{ zadacha.jobType }}
                  </q-item>
                </q-list>

              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.fs-12 {
  font-size: 12px;
}
</style>
