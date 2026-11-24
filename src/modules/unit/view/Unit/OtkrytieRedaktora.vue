<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import RedaktorService from "@/modules/unit/services/RedaktorService";
import { GhButton } from "@/components/ui";

/**
 * Страница открытия редактора юнита.
 *
 * IDE живёт в compose-профиле и стартует по требованию, поэтому перед
 * переходом на ссылку редактора нужно запросить её у бэкенда: этот запрос
 * запускает IDE на раннере. Открываем страницу сразу в новой вкладке,
 * чтобы не упереться в popup blocker, и после ответа заменяем location.
 */
const route = useRoute();
const zagruzka = ref(true);
const oshibka = ref<string | null>(null);

async function otkryt(): Promise<void> {
  zagruzka.value = true;
  oshibka.value = null;

  const unitId = String(route.params.id ?? "");
  if (unitId === "") {
    oshibka.value = "unit.redaktor.link.unit_not_found";
    zagruzka.value = false;
    return;
  }

  const response = await RedaktorService.poluchitSsylkuRedaktora({ unitId });

  if (response.status !== "success" || !response.data.ssylka) {
    oshibka.value = "unit.redaktor.link.start_failed";
    zagruzka.value = false;
    return;
  }

  window.location.replace(response.data.ssylka);
}

onMounted(() => {
  void otkryt();
});
</script>

<template>
  <div class="otkrytie-redaktora">
    <p v-if="zagruzka" class="otkrytie-redaktora__text">
      {{ $t("unit.redaktor.link.starting") }}
    </p>

    <div v-else-if="oshibka" class="otkrytie-redaktora__error">
      <p class="otkrytie-redaktora__text">{{ $t(oshibka) }}</p>
      <GhButton
        icon="sync"
        :label="$t('common.buttons.retry')"
        @click="otkryt"
      />
    </div>
  </div>
</template>

<style scoped>
.otkrytie-redaktora {
  display: flex;
  min-height: 60vh;
  align-items: center;
  justify-content: center;
}

.otkrytie-redaktora__text {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: 14px;
}

.otkrytie-redaktora__error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
</style>
