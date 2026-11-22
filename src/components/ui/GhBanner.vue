<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import GhButton from "./GhButton.vue";
import GhIcon from "./GhIcon.vue";
import type { GhBannerVariant, OcticonName } from "./types";

const props = withDefaults(
  defineProps<{
    variant?: GhBannerVariant;
    title?: string;
    dismissible?: boolean;
    icon?: OcticonName;
  }>(),
  {
    variant: "accent",
    title: "",
    dismissible: false,
    icon: undefined,
  },
);

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();

const { t } = useI18n();

const ikonyPoVariantu: Record<GhBannerVariant, OcticonName> = {
  accent: "info",
  success: "check-circle",
  attention: "alert",
  danger: "stop",
};

const itogovayaIkonka = computed<OcticonName>(
  () => props.icon ?? ikonyPoVariantu[props.variant],
);

const rol = computed<"alert" | "status">(() =>
  props.variant === "danger" || props.variant === "attention"
    ? "alert"
    : "status",
);

const podpisZakrytiya = computed<string>(() => t("common.buttons.close"));

function zakryt(): void {
  emit("dismiss");
}
</script>

<template>
  <div
    class="gh-banner primer"
    :class="`gh-banner--${variant}`"
    :role="rol"
  >
    <GhIcon :name="itogovayaIkonka" class="gh-banner__icon" />

    <div class="gh-banner__body">
      <p v-if="title" class="gh-banner__title">{{ title }}</p>
      <div v-if="$slots.default" class="gh-banner__text">
        <slot />
      </div>
    </div>

    <div v-if="$slots.actions" class="gh-banner__actions">
      <slot name="actions" />
    </div>

    <GhButton
      v-if="dismissible"
      variant="invisible"
      size="sm"
      :aria-label="podpisZakrytiya"
      class="gh-banner__close"
      @click="zakryt"
    >
      <GhIcon name="x" />
    </GhButton>
  </div>
</template>

<style scoped>
.gh-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-banner__icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.gh-banner__body {
  min-width: 0;
  flex: 1 1 auto;
}

.gh-banner__title {
  margin: 0;
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-banner__text {
  color: inherit;
}

.gh-banner__title + .gh-banner__text {
  margin-top: 2px;
}

.gh-banner__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.gh-banner__close {
  flex-shrink: 0;
  margin: -2px -8px -2px 0;
}

.gh-banner--accent {
  background-color: var(--bgColor-accent-muted);
  border-color: var(--borderColor-accent-muted);
  color: var(--fgColor-accent);
}

.gh-banner--success {
  background-color: var(--bgColor-success-muted);
  border-color: var(--borderColor-success-muted);
  color: var(--fgColor-success);
}

.gh-banner--attention {
  background-color: var(--bgColor-attention-muted);
  border-color: var(--borderColor-attention-muted);
  color: var(--fgColor-attention);
}

.gh-banner--danger {
  background-color: var(--bgColor-danger-muted);
  border-color: var(--borderColor-danger-muted);
  color: var(--fgColor-danger);
}

.gh-banner__title,
.gh-banner__text {
  color: var(--fgColor-default);
}
</style>
