<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { GhBanner, GhButton } from "@/components/ui";
import type { GhBannerVariant } from "@/components/ui";
import i18n from "@/bootstrap/translator";
import { useAuthStore } from "@/modules/account/store/auth";
import {
    useStorUvedomleniyOpenCode,
    type NovoeUvedomlenieHandler,
} from "@/modules/opencode/store/StorUvedomleniyOpenCode";
import { useStorChataOpenCode } from "@/modules/opencode/store/StorChataOpenCode";
import type { UvedomlenieOpenCode } from "@/modules/opencode/model/UvedomlenieOpenCode";

/**
 * Показ уведомлений OpenCode.
 *
 * Компонент регистрирует обработчик у стора уведомлений и рендерит стек
 * Primer-баннеров. Подключением к транспорту, захватом и дедупликацией
 * занимается стор (задача C1), здесь только UI. Глобальный Notify больше не
 * используется: баннеры живут в DOM и доступны скринридерам.
 */

/** Один баннер уведомления. */
type BankUvedomleniya = {
    id: string;
    variant: GhBannerVariant;
    text: string;
    href: string;
};

/** Больше баннеров одновременно держать на экране не нужно. */
const MAKSIMUM_BANKOV = 4;

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { isAuth } = storeToRefs(authStore);
const stor = useStorUvedomleniyOpenCode();
const storChata = useStorChataOpenCode();

/** Стек видимых уведомлений. */
const banki = ref<BankUvedomleniya[]>([]);

/** Отписка от набора обработчиков показа; `null` — обработчик не зарегистрирован. */
let otpiska: (() => void) | null = null;

/** Ключ i18n выбирается по виду и статусу завершения хода (раздел 8.5). */
function klyuchTeksta(uvedomlenie: UvedomlenieOpenCode): string {
    if (uvedomlenie.kind === "QUESTION" || uvedomlenie.status === "AWAITING_INPUT") {
        return "opencode.notifications.new_question";
    }

    if (uvedomlenie.kind === "ERROR" || uvedomlenie.status === "FAILED") {
        return "opencode.notifications.new_error";
    }

    return "opencode.notifications.new_answer";
}

/** Вариант баннера по типу уведомления. */
function variantUvedomleniya(uvedomlenie: UvedomlenieOpenCode): GhBannerVariant {
    if (uvedomlenie.kind === "QUESTION" || uvedomlenie.status === "AWAITING_INPUT") {
        return "attention";
    }

    if (uvedomlenie.kind === "ERROR" || uvedomlenie.status === "FAILED") {
        return "danger";
    }

    return "success";
}

/** Открыт ли сейчас интерфейс именно этой сессии. */
function segodnyaOtkrita(uvedomlenie: UvedomlenieOpenCode): boolean {
    return router.currentRoute.value.name === "opencode_chat"
        && String(route.params.id) === uvedomlenie.sessionId;
}

/** Ссылка на сессию; тип не даёт чату делать probe-запрос состояния workspace. */
function ssilkaNaSessiyu(uvedomlenie: UvedomlenieOpenCode): string {
    return router.resolve({
        name: "opencode_chat",
        params: { id: uvedomlenie.sessionId },
        query: { type: uvedomlenie.sessionType === "workspace" ? "workspace" : "unit" },
    }).href;
}

/** Убрать баннер по идентификатору уведомления. */
function zakrytBank(id: string): void {
    banki.value = banki.value.filter((bank) => bank.id !== id);
}

/** Открыть сессию уведомления в новой вкладке. */
function otkrytBank(bank: BankUvedomleniya): void {
    window.open(bank.href, "_blank", "noopener,noreferrer");
}

/**
 * Показать уведомление, если пользователь не находится в этой сессии.
 *
 * Если интерфейс сессии открыт, popup не нужен: достаточно обновить историю,
 * чтобы новый ответ появился на экране.
 */
function pokazatUvedomlenie(uvedomlenie: UvedomlenieOpenCode): void {
    if (segodnyaOtkrita(uvedomlenie)) {
        if (storChata.sessiyaId === uvedomlenie.sessionId) {
            void storChata.perezagruzitSessiyu();

            // У workspace после хода мог измениться canAcceptMessages.
            if (storChata.estWorkspace) {
                void storChata.obnovitSostoyanieWorkspace();
            }
        }

        return;
    }

    if (banki.value.some((bank) => bank.id === uvedomlenie.id)) {
        return;
    }

    const zagolovok = uvedomlenie.sessionTitle.trim() === ""
        ? uvedomlenie.sessionId
        : uvedomlenie.sessionTitle;

    const noviy: BankUvedomleniya = {
        id: uvedomlenie.id,
        variant: variantUvedomleniya(uvedomlenie),
        text: i18n.global.t(klyuchTeksta(uvedomlenie), { title: zagolovok }),
        href: ssilkaNaSessiyu(uvedomlenie),
    };

    banki.value = [...banki.value, noviy].slice(-MAKSIMUM_BANKOV);
}

const obrabotchikPokaza: NovoeUvedomlenieHandler = pokazatUvedomlenie;

/** Зарегистрировать обработчик показа, если он ещё не зарегистрирован. */
function zaregistrirovatObrabotchik(): void {
    if (otpiska !== null) {
        return;
    }

    otpiska = stor.podpisatsyaNaPokaz(obrabotchikPokaza);
}

/**
 * Слежение за авторизацией.
 *
 * `otklyuchit()` очищает набор обработчиков показа, поэтому после выхода его
 * нужно сразу зарегистрировать снова: иначе после повторного входа
 * уведомления перестанут показываться.
 */
watch(isAuth, (avtorizovan: boolean) => {
    if (avtorizovan) {
        zaregistrirovatObrabotchik();
        void stor.podklyuchit();
        return;
    }

    stor.otklyuchit();
    otpiska = null;
    zaregistrirovatObrabotchik();
}, { immediate: true });

onUnmounted(() => {
    if (otpiska !== null) {
        otpiska();
        otpiska = null;
    }

    stor.otklyuchit();
});
</script>

<template>
  <Teleport to="body">
    <div class="uvedomleniya-opencode primer" aria-live="polite">
      <GhBanner
          v-for="bank in banki"
          :key="bank.id"
          :variant="bank.variant"
          dismissible
          class="uvedomleniya-opencode__banner"
          @dismiss="zakrytBank(bank.id)"
      >
        {{ bank.text }}

        <template #actions>
          <GhButton size="sm" @click="otkrytBank(bank)">
            {{ $t('opencode.notifications.open_new_tab') }}
          </GhButton>
        </template>
      </GhBanner>
    </div>
  </Teleport>
</template>

<style scoped>
.uvedomleniya-opencode {
  position: fixed;
  top: 56px;
  right: 16px;
  z-index: 6000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.uvedomleniya-opencode__banner {
  pointer-events: auto;
  box-shadow: var(--shadow-floating-small);
}

@media (max-width: 480px) {
  .uvedomleniya-opencode {
    top: 8px;
    right: 8px;
    left: 8px;
    width: auto;
  }
}
</style>
