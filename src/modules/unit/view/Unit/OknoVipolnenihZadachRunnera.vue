<script setup lang="ts">
import { format, fromUnixTime } from "date-fns";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import { useRoute } from 'vue-router'
import {storVipolnenihZadachRunnera} from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";

const store = storVipolnenihZadachRunnera();
const { spisok, loader, selectJob } = storeToRefs(store);

const route = useRoute();

onMounted(async () => {
  await store.poluchitVipolnenieZadachiRunnera(route.params.id as string);
})

function convertDate(unixtime: number): string {
  const s = format(fromUnixTime(unixtime), 'dd.MM.yyy H:mm:ss');
  console.log("AAA", s);
  return s;
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
              <q-card-section v-if="selectJob">
                <div v-for="(step, i) in selectJob.steps">
                  <div class="text-light-green-14 fs-12">
                    <div class="row">
                      <div class="col"><pre class="bash-output">{{step.command}}</pre></div>
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
