<script setup lang="ts">
import {computed} from "vue";
import {storeToRefs} from "pinia";
import {onMounted } from "vue";
import {useI18n} from "vue-i18n";
import {useSpisokPeremenihProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPeremenihProektaStore";
import {useRoute} from "vue-router";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhFormField,
  GhInput,
  GhSelect,
  GhSkeleton,
  GhTable,
} from "@/components/ui";
import type {GhSelectOption, GhTableColumn} from "@/components/ui";
import type {PeremenayaProekta} from "@/modules/unit/store/SpisokProektov/model/Proekt";

const spisokPeremenihProekta = useSpisokPeremenihProektaStore();
const {
  spisok,
  form,
  loaderUdaleniya,
  loaderDobavleniya,
  loaderSpiskaPeremenih,
  oshibkaZagruzkiSpiska,
  tipiPeremenoi,
} = storeToRefs(spisokPeremenihProekta);

const route = useRoute();
const {t} = useI18n();

onMounted(async () => {
  spisokPeremenihProekta.pokazatSpisok(route.params.id as string)
  await spisokPeremenihProekta.poluchitSpisok();
})

async function dobavitPeremnuyu() {
  await spisokPeremenihProekta.dobavitPeremenuyu();
}

async function udalitPeremenuyu(code: string) {
  await spisokPeremenihProekta.udalitPeremenuyu(code);
}

const tipiOptions = computed<GhSelectOption[]>(() =>
  tipiPeremenoi.value.map((tip) => ({
    value: tip,
    label: tip === "hidden"
      ? t('unit.form_variables.types.hidden')
      : t('unit.form_variables.types.default'),
  })),
);

const kolonki = computed<GhTableColumn<PeremenayaProekta>[]>(() => [
  {name: "code", label: t('unit.form_variables.fields.labels.code'), field: "code", align: "left"},
  {name: "value", label: t('unit.form_variables.fields.labels.value'), field: "value", align: "left"},
  {name: "actions", label: "", align: "right"},
]);
</script>

<template>
  <div class="variables">
    <GhBox padding="md">
      <template #header>
        {{ $t('unit.proekt.variables.title') }}
      </template>

      <div class="variables__form">
        <GhFormField :label="$t('unit.form_variables.fields.labels.type')">
          <GhSelect
              :model-value="form.tip"
              :options="tipiOptions"
              @update:model-value="form.tip = $event === null ? '' : String($event)"
          />
        </GhFormField>

        <GhFormField :label="$t('unit.form_variables.fields.labels.code')">
          <GhInput v-model="form.code" />
        </GhFormField>

        <GhFormField :label="$t('unit.form_variables.fields.labels.value')">
          <GhInput v-model="form.value" />
        </GhFormField>
      </div>

      <template #footer>
        <GhButton
            variant="primary"
            icon="plus"
            :label="$t('unit.form_variables.buttons.add')"
            :loading="loaderDobavleniya"
            :disabled="!form.code"
            @click="dobavitPeremnuyu"
        />
      </template>
    </GhBox>

    <GhBanner
        v-if="oshibkaZagruzkiSpiska"
        variant="danger"
        :title="$t('common.states.error')"
        class="variables__gap"
    >
      {{ oshibkaZagruzkiSpiska }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="spisokPeremenihProekta.poluchitSpisok()"
        />
      </template>
    </GhBanner>

    <GhBox v-else-if="loaderSpiskaPeremenih" padding="md" aria-busy="true" class="variables__gap">
      <div class="variables__skeleton">
        <GhSkeleton variant="text" width="60%" height="12" />
        <GhSkeleton variant="text" width="80%" height="12" />
        <GhSkeleton variant="text" width="40%" height="12" />
      </div>
    </GhBox>

    <GhBox v-else-if="spisok.length === 0" padding="none" class="variables__gap">
      <GhEmptyState icon="code" :title="$t('unit.proekt.variables.empty')" />
    </GhBox>

    <GhBox v-else padding="none" class="variables__gap">
      <GhTable :rows="spisok" :columns="kolonki" row-key="code" borderless>
        <template #body>
          <tr v-for="variable in spisok" :key="variable.code">
            <td class="variables__code gh-mono">{{ variable.code }}</td>
            <td>
              <span v-if="variable.tip !== 'hidden'" class="variables__value gh-mono">
                {{ variable.value }}
              </span>
              <span v-else class="variables__hidden">
                {{ $t('unit.proekt.variables.hidden_value') }}
              </span>
            </td>
            <td class="variables__actions">
              <GhButton
                  variant="invisible"
                  icon="trash"
                  :aria-label="$t('unit.proekt.variables.delete_hint')"
                  :title="$t('unit.proekt.variables.delete_hint')"
                  :loading="loaderUdaleniya"
                  @click="udalitPeremenuyu(variable.code)"
              />
            </td>
          </tr>
        </template>
      </GhTable>
    </GhBox>
  </div>
</template>

<style scoped>
.variables {
  max-width: 720px;
}

.variables__form {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  align-items: end;
  gap: 16px;
}

@media (max-width: 767.98px) {
  .variables__form {
    grid-template-columns: minmax(0, 1fr);
  }
}

.variables__gap {
  margin-top: 16px;
}

.variables__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variables__code,
.variables__value {
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
}

.variables__hidden {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.variables__actions {
  width: 40px;
  text-align: right;
}
</style>
