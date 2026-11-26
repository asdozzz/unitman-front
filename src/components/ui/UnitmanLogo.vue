<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Размер стороны знака в пикселях. */
    size?: number;
    /**
     * `color` — плитка с белым кубом, оранжевой верхней гранью и синими швами
     * (по умолчанию). `mono` — одноцветный силуэт без плитки, красится через
     * `currentColor`.
     */
    variant?: "color" | "mono";
    /** Текстовая метка. Если не задана, знак считается декоративным. */
    title?: string;
  }>(),
  {
    size: 16,
    variant: "color",
    title: "",
  },
);
</script>

<template>
  <svg
    class="unitman-logo"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    :role="title ? 'img' : undefined"
    :aria-label="title || undefined"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <template v-if="variant === 'color'">
      <rect width="64" height="64" rx="14" fill="#2f6fb0" />
      <polygon points="32,7 55,19.5 55,44.5 32,57 9,44.5 9,19.5" fill="#ffffff" />
      <polygon points="32,7 55,19.5 32,32 9,19.5" fill="#e89a2b" />
      <path
        d="M32 32 9 19.5M32 32l23-12.5M32 32v25"
        fill="none"
        stroke="#2f6fb0"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
    </template>
    <polygon
      v-else
      points="32,7 55,19.5 55,44.5 32,57 9,44.5 9,19.5"
      fill="currentColor"
    />
  </svg>
</template>

<style scoped>
.unitman-logo {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: text-bottom;
}
</style>
