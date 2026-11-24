<script setup lang="ts">
import {GhIcon} from "@/components/ui";
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type {ProektUiState} from "@/modules/unit/utils/proektStatus";
import ProektStatusBadge from "@/modules/unit/view/Proekti/SpisokProektov/ProektStatusBadge.vue";

defineProps<{
  item: Proekt;
  state: ProektUiState;
}>();
</script>

<template>
  <!-- Шапка карточки: имя и единственный бейдж состояния на одной строке.
       Кебаб рендерит ProektCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="proekt-card__head">
    <div class="proekt-card__head-main">
      <GhIcon name="repo" :size="16" class="proekt-card__head-icon" />
      <h3 class="proekt-card__name" :title="item.name">
        {{ item.name }}
        <q-tooltip>{{ item.name }}</q-tooltip>
      </h3>
      <ProektStatusBadge :state="state" />
    </div>

    <div class="proekt-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="proekt-card__meta">
    <span class="proekt-card__meta-item">
      <GhIcon name="code" :size="14" />
      <span class="proekt-card__meta-text proekt-card__code" :title="item.code">{{ item.code }}</span>
    </span>

    <span class="proekt-card__separator">·</span>

    <span class="proekt-card__meta-item">
      <GhIcon name="git-branch" :size="14" />
      <span class="proekt-card__meta-text proekt-card__branch" :title="item.mainBranch">{{ item.mainBranch }}</span>
    </span>

  </div>
</template>

<style scoped>
.proekt-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--borderColor-default);
  background: var(--bgColor-muted);
}

.proekt-card__head-icon {
  color: var(--fgColor-muted);
}

.proekt-card__head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.proekt-card__name {
  margin: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proekt-card__head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

/* Мета-строка живёт под шапкой и получает собственные отступы карточки. */
.proekt-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  row-gap: 2px;
  min-width: 0;
  padding: 8px 16px 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
}

.proekt-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.proekt-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proekt-card__code,
.proekt-card__branch {
  font-family: var(--fontStack-monospace);
  font-size: 0.9em;
}

.proekt-card__separator {
  opacity: 0.6;
}
</style>
