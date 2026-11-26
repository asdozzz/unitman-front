<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { GhBox, GhSkeleton } from "@/components/ui";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import { useSpisokPolzovateleiDlyAdmininstrirovaniyaStore } from "@/modules/account/store/SpisokVsehPolzovateleiDlyAdmininstrirovaniyaStore";
import PolzovatelCardHeader from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelCardHeader.vue";
import PolzovatelCardMenu from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelCardMenu.vue";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

const { t } = useI18n();

const spisokStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const { loaderObnovleniya } = storeToRefs(spisokStore);

/** Блокировка обратима — подтверждения не требуется. */
async function blokirovat(): Promise<void> {
  await spisokStore.blokirovatPolzovatelya(props.item.id);
}

async function razblokirovat(): Promise<void> {
  await spisokStore.razblokirovatPolzovatelya(props.item.id);
}

async function aktivirovat(): Promise<void> {
  await spisokStore.aktivirovatPolzovatelya(props.item.id);
}
</script>

<template>
  <GhBox class="polzovatel-card">
    <template #header>
      <PolzovatelCardHeader :item="item">
        <template #actions>
          <PolzovatelCardMenu
            :item="item"
            @activate="aktivirovat"
            @block="blokirovat"
            @unblock="razblokirovat"
          />
        </template>
      </PolzovatelCardHeader>
    </template>

    <div class="polzovatel-card__body">
      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ t("account.spisok.card.labels.id") }}</span>
        <span class="polzovatel-card__value gh-mono" :title="item.id">{{ item.id }}</span>
      </div>

      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ t("account.spisok.card.labels.role") }}</span>
        <span class="polzovatel-card__value" :title="item.roles">{{ item.roles }}</span>
      </div>

      <div class="polzovatel-card__row">
        <span class="polzovatel-card__label">{{ t("account.spisok.card.labels.nickname") }}</span>
        <span class="polzovatel-card__value" :title="item.nickname ?? ''">
          {{ item.nickname ?? "—" }}
        </span>
      </div>

      <GhSkeleton
        v-if="loaderObnovleniya"
        class="polzovatel-card__progress"
        variant="rect"
        width="100%"
        height="3"
      />
    </div>
  </GhBox>
</template>

<style scoped>
.polzovatel-card {
  width: 100%;
  min-width: 0;
}

.polzovatel-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.polzovatel-card__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
}

.polzovatel-card__label {
  flex: 0 0 auto;
  color: var(--fgColor-muted);
}

.polzovatel-card__value {
  min-width: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polzovatel-card__progress {
  margin-top: 4px;
}
</style>
