<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import GhCounter from "./GhCounter.vue";
import GhIcon from "./GhIcon.vue";
import type { GhSideNavGroup, GhSideNavItem } from "./types";

const props = withDefaults(
  defineProps<{
    groups: GhSideNavGroup[];
    /** id активного пункта. */
    modelValue: string;
    collapsed?: boolean;
    ariaLabel?: string;
  }>(),
  {
    collapsed: false,
    ariaLabel: "",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "select", item: GhSideNavItem): void;
}>();

const { t } = useI18n();

const podpisNavigacii = computed<string>(
  () => props.ariaLabel || t("app.sidebar.navigation"),
);

function vybrat(item: GhSideNavItem): void {
  if (item.disabled) {
    return;
  }

  emit("update:modelValue", item.id);
  emit("select", item);
}
</script>

<template>
  <nav
    class="gh-side-nav primer"
    :class="{ 'gh-side-nav--collapsed': collapsed }"
    :aria-label="podpisNavigacii"
  >
    <q-list class="gh-side-nav__list" aria-orientation="vertical">
      <template v-for="group in groups" :key="group.id">
        <div v-if="group.label && !collapsed" class="gh-side-nav__caption">
          {{ group.label }}
        </div>

        <q-item
          v-for="item in group.items"
          :key="item.id"
          class="gh-side-nav__item"
          :class="{
            'gh-side-nav__item--active': item.id === modelValue,
            'gh-side-nav__item--collapsed': collapsed,
          }"
          :to="item.to"
          :disable="item.disabled"
          :ripple="false"
          clickable
          :aria-current="item.id === modelValue ? 'true' : undefined"
          @click="vybrat(item)"
        >
          <q-tooltip
            v-if="collapsed && item.label"
            anchor="center right"
            self="center left"
            class="gh-side-nav__tooltip"
          >
            {{ item.label }}
          </q-tooltip>

          <q-item-section v-if="item.icon" avatar class="gh-side-nav__icon">
            <GhIcon :name="item.icon" />
          </q-item-section>

          <q-item-section v-if="!collapsed" class="gh-side-nav__label">
            {{ item.label }}
          </q-item-section>

          <q-item-section
            v-if="!collapsed && item.counter !== null && item.counter !== undefined"
            side
            class="gh-side-nav__counter"
          >
            <GhCounter :value="item.counter" />
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </nav>
</template>

<style scoped>
.gh-side-nav {
  width: 100%;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-side-nav__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
}

.gh-side-nav__caption {
  padding: 12px 8px 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-side-nav__item {
  position: relative;
  min-height: 32px;
  padding: 4px 8px;
  border-radius: var(--borderRadius-medium);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-tight);
  text-decoration: none;
}

.gh-side-nav__item:hover {
  background-color: var(--bgColor-neutral-muted);
}

.gh-side-nav__item--active {
  background-color: var(--bgColor-neutral-muted);
  box-shadow: inset 2px 0 0 var(--gh-accent-coral);
  font-weight: var(--fontWeight-semibold);
}

.gh-side-nav__item--collapsed {
  justify-content: center;
  padding-right: 4px;
  padding-left: 4px;
}

.gh-side-nav__icon {
  min-width: 24px;
  padding-right: 8px;
  color: var(--fgColor-muted);
}

.gh-side-nav__item--active .gh-side-nav__icon {
  color: var(--fgColor-default);
}

.gh-side-nav__label {
  font-size: var(--fontSize-body);
}

.gh-side-nav__counter {
  padding-left: 8px;
}

.gh-side-nav--collapsed .gh-side-nav__icon {
  padding-right: 0;
}

.gh-side-nav__tooltip {
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-floating-small);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
}
</style>
