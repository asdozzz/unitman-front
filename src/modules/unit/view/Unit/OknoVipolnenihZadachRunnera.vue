<script setup lang="ts">
import { format, fromUnixTime } from "date-fns";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import {storVipolnenihZadachRunnera} from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";

const store = storVipolnenihZadachRunnera();
const { spisok, oshibkaOtBackenda, loader, enable, selectJob, selectIndex } = storeToRefs(store);

onMounted(async () => {
  await store.poluchitVipolnenieZadachiRunnera();
})

function convertDate(unixtime: number): string {
  const s = format(fromUnixTime(unixtime), 'dd.MM.yyy H:mm:ss');
  console.log("AAA", s);
  return s;
}

</script>

<template>
  <div class="q-pa-md q-gutter-sm">
    <q-dialog v-model="enable" maximized>
      <q-layout view="Lhh lpR fff" container class="bg-white text-dark">
        <q-header class="bg-primary">
          <q-toolbar>
            <q-toolbar-title>Runner jobs</q-toolbar-title>
            <q-btn flat @click="store.zakritOkno()" round dense icon="close" />
          </q-toolbar>
        </q-header>

        <q-page-container>
          <q-page>

            <div class="flex flex-center column">
              <div class="row" style="min-height: 400px; width: 100%; padding: 24px;">
                <div class="fit row inline wrap justify-start items-start content-start" style="overflow: hidden;">
                  <div class="col" style="overflow: auto;">
                    <q-card class="no-border-radius bg-grey-10">
                      <q-card-section v-if="selectJob">
                        <div v-for="(step, i) in selectJob.steps">
                          <div class="text-light-green-14">
                            <div class="row">
                              <div class="col"># {{step.command}}</div>
                              <div class="col-auto">
                                <div v-if="i===0">
                                  {{convertDate(step.unixtime)}}
                                </div>
                                <div v-if="i > 0">
                                  {{(step.unixtime - selectJob.steps[i - 1].unixtime) + ' s'}}
                                </div>
                              </div>
                            </div>

                          </div>
                          <div v-if="step.success" class="text-grey-1">{{step.response}}</div>
                          <div v-if="!step.success" class="text-red-8">{{step.response}}</div>

                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div class="col-3 bg-grey-6" style="overflow: auto;">
                    <q-card class="no-border-radius">
                      <q-card-section class="q-pt-none">
                        <q-list bordered separator :padding="false" class="rounded-borders">
                          <q-item clickable v-ripple v-for="(zadacha, i) in spisok" :key="zadacha.id" :active="i === selectIndex" @click="store.select(i)">
                            {{ zadacha.jobType }}
                          </q-item>
                        </q-list>

                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
          </q-page>
        </q-page-container>
      </q-layout>
    </q-dialog>
  </div>
</template>
