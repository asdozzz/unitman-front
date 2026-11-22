<script setup lang="ts">
/**
 * Подсказка клавиши. Текст передаётся слотом, чтобы компонент не содержал
 * локализуемых строк.
 */
</script>

<template>
  <kbd class="gh-kbd primer"><slot /></kbd>
</template>

<style scoped>
.gh-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  padding: 1px 4px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-muted);
  box-shadow: inset 0 -1px 0 var(--borderColor-default);
  color: var(--fgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: 11px;
  font-weight: var(--fontWeight-medium);
  line-height: 1.4;
  white-space: nowrap;
}
</style>
