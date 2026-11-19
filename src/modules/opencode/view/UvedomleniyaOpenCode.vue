<template></template>

<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { Notify } from "quasar";
import { useRoute, useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import { useAuthStore } from "@/modules/account/store/auth";
import {
    useStorUvedomleniyOpenCode,
    type NovoeUvedomlenieHandler,
} from "@/modules/opencode/store/StorUvedomleniyOpenCode";
import { useStorChataOpenCode } from "@/modules/opencode/store/StorChataOpenCode";
import type { UvedomlenieOpenCode } from "@/modules/opencode/model/UvedomlenieOpenCode";

/**
 * Невидимый компонент показа уведомлений OpenCode.
 *
 * Рендерит пустой шаблон: вся его работа — зарегистрировать обработчик у стора
 * уведомлений и вовремя показывать Quasar `Notify`. Подключением к транспорту,
 * захватом и дедупликацией занимается стор (задача C1), здесь только UI.
 */

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { isAuth } = storeToRefs(authStore);
const stor = useStorUvedomleniyOpenCode();
const storChata = useStorChataOpenCode();

/** Отписка от набора обработчиков показа; `null` — обработчик не зарегистрирован. */
let otpiska: (() => void) | null = null;

/**
 * Экранирование строки для вставки в HTML.
 *
 * Используется и для текста ссылки, и для значения `href`: `Notify` создаётся
 * с `html: true`, поэтому данные из сети без экранирования стали бы вектором
 * XSS. Заголовок сессии приходит от пользователя и не является доверенным.
 */
const PRAVILA_EKRANIROVANIYA: ReadonlyArray<readonly [RegExp, string]> = [
    [/&/g, "\u0026amp;"],
    [/</g, "\u0026lt;"],
    [/>/g, "\u0026gt;"],
    [/\x22/g, "\u0026quot;"],
    [/'/g, "\u0026#39;"],
];

function ekranirovatHtml(znachenie: string): string {
    return PRAVILA_EKRANIROVANIYA.reduce(
        (rezultat: string, [shablon, zamena]: readonly [RegExp, string]) => rezultat.replace(shablon, zamena),
        znachenie,
    );
}

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

/** Открыт ли сейчас интерфейс именно этой сессии. */
function segodnyaOtkrita(uvedomlenie: UvedomlenieOpenCode): boolean {
    return router.currentRoute.value.name === "opencode_chat"
        && String(route.params.id) === uvedomlenie.sessionId;
}

/** Абсолютная ссылка на сессию в новой вкладке, экранированная для атрибута. */
function ssilkaNaSessiyu(uvedomlenie: UvedomlenieOpenCode): string {
    const href = router.resolve({
        name: "opencode_chat",
        params: { id: uvedomlenie.sessionId },
    }).href;

    return ekranirovatHtml(new URL(href, window.location.origin).href);
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
        }

        return;
    }

    const zagolovok = uvedomlenie.sessionTitle.trim() === ""
        ? uvedomlenie.sessionId
        : uvedomlenie.sessionTitle;

    const tekst = i18n.global.t(klyuchTeksta(uvedomlenie), {
        title: ekranirovatHtml(zagolovok),
    });

    Notify.create({
        html: true,
        message: `<a href="${ssilkaNaSessiyu(uvedomlenie)}" target="_blank" rel="noopener noreferrer">${tekst}</a>`,
        caption: i18n.global.t("opencode.notifications.open_new_tab"),
        icon: "forum",
        color: "primary",
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
    });
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
