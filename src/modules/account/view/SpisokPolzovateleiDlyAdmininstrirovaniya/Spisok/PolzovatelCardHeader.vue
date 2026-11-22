<script setup lang="ts">
import { computed } from "vue";
import { GhIcon } from "@/components/ui";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import type { PolzovatelFilterStatus } from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";
import PolzovatelStatusBadge from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelStatusBadge.vue";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

/** Статус блокировки для бейджа шапки. */
const status = computed<PolzovatelFilterStatus>(() => {
  return props.item.isBlocked ? "blocked" : "active";
});

/** Роли для мета-строки: строка `ROLE_USER,ROLE_ADMIN` → `ROLE_USER, ROLE_ADMIN`. */
const roli = computed<string>(() => {
  return props.item.roles
    .split(",")
    .map((role: string) => role.trim())
    .filter((role: string) => role !== "")
    .join(", ");
});
</script>

<template>
  <div class="polzovatel-card__header">
    <div class="polzovatel-card__head">
      <div class="polzovatel-card__head-main">
        <GhIcon name="person" :size="16" class="polzovatel-card__avatar" />
        <h3 class="polzovatel-card__name" :title="item.email">{{ item.email }}</h3>
        <PolzovatelStatusBadge :status="status" />
      </div>

      <div class="polzovatel-card__head-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="polzovatel-card__meta">
      <span class="polzovatel-card__meta-item">
        <GhIcon name="person" :size="14" />
        <span class="polzovatel-card__meta-text" :title="item.nickname ?? ''">
          {{ item.nickname ?? "—" }}
        </span>
      </span>

      <span class="polzovatel-card__separator" aria-hidden="true">·</span>

      <span class="polzovatel-card__meta-item">
        <GhIcon name="shield" :size="14" />
        <span class="polzovatel-card__meta-text" :title="roli">{{ roli }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.polzovatel-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.polzovatel-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.polzovatel-card__head-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.polzovatel-card__avatar {
  flex-shrink: 0;
  color: var(--fgColor-muted);
}

.polzovatel-card__name {
  margin: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polzovatel-card__head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.polzovatel-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
}

.polzovatel-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.polzovatel-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polzovatel-card__separator {
  opacity: 0.6;
}
</style>
