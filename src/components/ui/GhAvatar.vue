<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    src?: string;
    name: string;
    size?: 16 | 20 | 24 | 32 | 40;
    /** Квадратная форма вместо круглой. */
    square?: boolean;
  }>(),
  {
    src: "",
    size: 24,
    square: false,
  },
);

const zagruzheno = ref<boolean>(false);
const oshibka = ref<boolean>(false);

const inicialy = computed<string>(() => {
  const ochishchennoe = props.name.trim();

  if (ochishchennoe === "") {
    return "?";
  }

  return ochishchennoe.slice(0, 2).toUpperCase();
});

const razmer = computed<Record<string, string>>(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(10, Math.round(props.size * 0.42))}px`,
}));

const pokazyvatInicialy = computed<boolean>(
  () => props.src === "" || oshibka.value || !zagruzheno.value,
);

function obrabotatZagruzku(): void {
  zagruzheno.value = true;
}

function obrabotatOshibku(): void {
  oshibka.value = true;
  zagruzheno.value = false;
}
</script>

<template>
  <div
    class="gh-avatar primer"
    :class="{
      'gh-avatar--square': square,
      'gh-avatar--muted': pokazyvatInicialy && !!src && !oshibka,
    }"
    :style="razmer"
    role="img"
    :aria-label="name"
  >
    <img
      v-if="src && !oshibka"
      class="gh-avatar__image"
      :class="{ 'gh-avatar__image--loaded': zagruzheno }"
      :src="src"
      alt=""
      @load="obrabotatZagruzku"
      @error="obrabotatOshibku"
    />

    <span v-if="pokazyvatInicialy" class="gh-avatar__initials">
      {{ inicialy }}
    </span>
  </div>
</template>

<style scoped>
.gh-avatar {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
  font-family: var(--fontStack-system);
  font-weight: var(--fontWeight-semibold);
  line-height: 1;
}

.gh-avatar--square {
  border-radius: var(--borderRadius-medium);
}

.gh-avatar--muted {
  background-color: var(--bgColor-muted);
  color: var(--fgColor-muted);
}

.gh-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 80ms ease-out;
}

.gh-avatar__image--loaded {
  opacity: 1;
}

.gh-avatar__initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0;
}
</style>
