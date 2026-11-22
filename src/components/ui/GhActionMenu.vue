<script setup lang="ts">
import GhButton from "./GhButton.vue";
import GhIcon from "./GhIcon.vue";
import type { GhActionMenuItem, OcticonName } from "./types";

withDefaults(
  defineProps<{
    items: GhActionMenuItem[];
    /** Иконка кнопки-триггера по умолчанию. */
    icon?: OcticonName;
    ariaLabel?: string;
    disabled?: boolean;
  }>(),
  {
    icon: "kebab-horizontal",
    ariaLabel: "Действия",
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "select", item: GhActionMenuItem): void;
}>();

function vybrat(item: GhActionMenuItem): void {
  if (item.disabled) {
    return;
  }

  emit("select", item);
}
</script>

<template>
  <div class="gh-action-menu primer">
    <slot name="trigger">
      <GhButton
        variant="invisible"
        :icon="icon"
        :aria-label="ariaLabel"
        :disabled="disabled"
      />
    </slot>

    <q-menu auto-close class="gh-action-menu__menu primer">
      <q-list class="gh-action-menu__list">
        <template v-for="item in items" :key="item.id">
          <q-separator
            v-if="item.separatorBefore"
            class="gh-action-menu__separator"
          />

          <q-item
            clickable
            :disable="item.disabled"
            :ripple="false"
            class="gh-action-menu__item"
            :class="{ 'gh-action-menu__item--danger': item.danger }"
            @click="vybrat(item)"
          >
            <q-item-section v-if="item.icon" avatar class="gh-action-menu__icon">
              <GhIcon :name="item.icon" />
            </q-item-section>

            <q-item-section class="gh-action-menu__label">
              {{ item.label }}
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-menu>
  </div>
</template>

<style scoped>
.gh-action-menu {
  display: inline-flex;
}

.gh-action-menu__menu {
  min-width: 200px;
  padding: 4px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-floating-small);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-action-menu__list {
  padding: 0;
}

.gh-action-menu__item {
  min-height: 32px;
  padding: 6px 8px;
  border-radius: var(--borderRadius-medium);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-tight);
}

.gh-action-menu__item:hover {
  background-color: var(--bgColor-neutral-muted);
}

.gh-action-menu__item--danger,
.gh-action-menu__item--danger .gh-action-menu__icon {
  color: var(--fgColor-danger);
}

.gh-action-menu__icon {
  min-width: 24px;
  padding-right: 8px;
  color: var(--fgColor-muted);
}

.gh-action-menu__label {
  font-size: var(--fontSize-body);
}

.gh-action-menu__separator {
  margin: 4px 0;
}
</style>
