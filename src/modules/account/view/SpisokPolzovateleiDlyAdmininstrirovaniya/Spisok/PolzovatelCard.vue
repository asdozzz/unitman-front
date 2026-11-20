<script setup lang="ts">
import {storeToRefs} from "pinia";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import {useSpisokPolzovateleiDlyAdmininstrirovaniyaStore} from "@/modules/account/store/SpisokVsehPolzovateleiDlyAdmininstrirovaniyaStore";
import PolzovatelCardHeader from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelCardHeader.vue";
import PolzovatelCardMenu from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelCardMenu.vue";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

const spisokStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const {loaderObnovleniya} = storeToRefs(spisokStore);

/** Блокировка обратима — подтверждения не требуется. */
async function blokirovat() {
  await spisokStore.blokirovatPolzovatelya(props.item.id);
}

async function razblokirovat() {
  await spisokStore.razblokirovatPolzovatelya(props.item.id);
}
</script>

<template>
  <article class="polzovatel-card">
    <PolzovatelCardHeader :item="item">
      <!-- Единственный кебаб карточки живёт в шапке-тулбаре. -->
      <template #actions>
        <PolzovatelCardMenu
            :item="item"
            @block="blokirovat"
            @unblock="razblokirovat"
        />
      </template>
    </PolzovatelCardHeader>

    <div class="polzovatel-card__body">
      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ $t('account.spisok.card.labels.id') }}</span>
        <span class="polzovatel-card__value text-tabular" :title="item.id">{{ item.id }}</span>
      </div>

      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ $t('account.spisok.card.labels.role') }}</span>
        <span class="polzovatel-card__value" :title="item.roles">{{ item.roles }}</span>
      </div>

      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ $t('account.spisok.card.labels.nickname') }}</span>
        <span class="polzovatel-card__value" :title="item.nickname ?? ''">
          {{ item.nickname ?? '—' }}
        </span>
      </div>
    </div>

    <q-linear-progress
        v-if="loaderObnovleniya"
        indeterminate
        color="primary"
        size="3px"
    />
  </article>
</template>

<style scoped>
.polzovatel-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
  transition: box-shadow var(--app-duration-base) var(--app-easing);
}

/* Border-first: тень появляется только на hover. */
.polzovatel-card:hover {
  box-shadow: var(--app-shadow-md);
}

.polzovatel-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  padding: var(--app-space-3) var(--app-space-4);
}

.polzovatel-card__row {
  display: flex;
  align-items: baseline;
  gap: var(--app-space-2);
  min-width: 0;
  font-size: var(--app-font-size-caption);
  line-height: var(--app-line-height-tight);
}

.polzovatel-card__label {
  flex: 0 0 auto;
  color: var(--app-text-secondary);
}

.polzovatel-card__value {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
