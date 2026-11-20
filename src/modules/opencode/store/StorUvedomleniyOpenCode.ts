import {defineStore} from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import {podpisatsyaNaUvedomleniya} from "@/modules/opencode/model/websocket/PodpiskaNaUvedomleniya";
import {
    pohozheNaOtvetUvedomleniy,
    pohozheNaUvedomlenie,
    pohozheNaZahvatUvedomleniy,
    type UvedomlenieOpenCode,
} from "@/modules/opencode/model/UvedomlenieOpenCode";
import i18n from '@/bootstrap/translator';

/** Обработчик, которому стор отдаёт уведомление для показа. */
export type NovoeUvedomlenieHandler = (u: UvedomlenieOpenCode) => void;

type StorUvedomleniyOpenCodeState = {
    kanal: string | null;
    zagruzhaem: boolean;
    oshibka: string | null;
};

/** Бэкенд принимает не более 100 идентификаторов за один запрос захвата. */
const RAZMER_PACHKI_ZAHVATA = 100;

/** Размер выборки непрочитанных по умолчанию (см. раздел 6.1 контракта). */
const LIMIT_NEPROCHITANNIH = 50;

/**
 * Не реактивное служебное состояние.
 *
 * Подписка, обработчики и набор уже переданных id не сериализуемы и не нужны
 * шаблонам, поэтому держатся вне Pinia-state. `pokolenie` — счётчик попыток
 * подключения: после `otklyuchit()` опоздавшие асинхронные ответы молча
 * отбрасываются.
 */
const obrabotchikiPokaza = new Set<NovoeUvedomlenieHandler>();
const peredannieId = new Set<string>();
let otpiska: (() => void) | null = null;
let podklyuchenie: Promise<void> | null = null;
let pokolenie = 0;

type StorUvedomleniy = ReturnType<typeof useStorUvedomleniyOpenCode>;

function otfiltrovatUvedomleniya(dannye: unknown[]): UvedomlenieOpenCode[] {
    return dannye.filter(pohozheNaUvedomlenie);
}

/**
 * Захватить идентификаторы пачками.
 *
 * @returns список реально захваченных id либо `null`, если хотя бы один
 *          запрос завершился неудачей — тогда стор переходит к локальной
 *          доставке с дедупликацией.
 */
async function zahvatitIds(ids: string[]): Promise<string[] | null> {
    const rezultat: string[] = [];

    for (let i = 0; i < ids.length; i += RAZMER_PACHKI_ZAHVATA) {
        const pachka = ids.slice(i, i + RAZMER_PACHKI_ZAHVATA);
        const response = await OpenCodeService.otmetitUvedomleniyaProchitannimi({ids: pachka});

        if (response.status !== "success" || !pohozheNaZahvatUvedomleniy(response.data)) {
            return null;
        }

        rezultat.push(...response.data.ids);
    }

    return rezultat;
}

/**
 * Передать уведомление обработчикам показа ровно один раз в пределах вкладки.
 */
function peredatObrabotchikam(uvedomlenie: UvedomlenieOpenCode): void {
    if (peredannieId.has(uvedomlenie.id)) {
        return;
    }

    peredannieId.add(uvedomlenie.id);

    // Копия набора: обработчик может отписаться прямо во время обхода.
    [...obrabotchikiPokaza].forEach((handler: NovoeUvedomlenieHandler) => {
        handler(uvedomlenie);
    });
}

/**
 * Захватить уведомления на сервере и отдать обработчикам только захваченные.
 *
 * Если запрос захвата упал, уведомления всё равно доставляются, но с
 * локальной дедупликацией по `id`: молча терять сообщения хуже, чем
 * потенциальный дубль между вкладками.
 */
async function zahvatitIPeredat(uvedomleniya: UvedomlenieOpenCode[]): Promise<void> {
    const unikalnie = new Map<string, UvedomlenieOpenCode>();

    uvedomleniya.forEach((uvedomlenie: UvedomlenieOpenCode) => {
        if (!pohozheNaUvedomlenie(uvedomlenie) || unikalnie.has(uvedomlenie.id)) {
            return;
        }

        unikalnie.set(uvedomlenie.id, uvedomlenie);
    });

    const spisok = [...unikalnie.values()];

    if (spisok.length === 0) {
        return;
    }

    const nomer = pokolenie;
    const zahvachennie = await zahvatitIds(spisok.map((uvedomlenie: UvedomlenieOpenCode) => uvedomlenie.id));

    if (nomer !== pokolenie) {
        return;
    }

    if (zahvachennie === null) {
        spisok.forEach(peredatObrabotchikam);
        return;
    }

    const nabor = new Set(zahvachennie);

    spisok
        .filter((uvedomlenie: UvedomlenieOpenCode) => nabor.has(uvedomlenie.id))
        .forEach(peredatObrabotchikam);
}

async function vypolnitPodklyuchenie(stor: StorUvedomleniy, nomer: number): Promise<void> {
    stor.zagruzhaem = true;
    stor.oshibka = null;

    try {
        const response = await OpenCodeService.uvedomleniya({limit: LIMIT_NEPROCHITANNIH});

        if (nomer !== pokolenie) {
            return;
        }

        if (response.status !== "success") {
            stor.oshibka = response.status === "fail" ? response.data.message : response.message;
            return;
        }

        if (!pohozheNaOtvetUvedomleniy(response.data)) {
            stor.oshibka = i18n.global.t('opencode.errors.invalid_notifications_response');
            return;
        }

        const dannye = response.data;
        stor.kanal = dannye.channel;

        otpiska = podpisatsyaNaUvedomleniya(
            dannye.channel,
            (uvedomlenie: UvedomlenieOpenCode) => {
                void zahvatitIPeredat([uvedomlenie]);
            },
            () => {
                void zagruzitNeprochitannieDlya(stor);
            },
        );

        await zahvatitIPeredat(otfiltrovatUvedomleniya(dannye.notifications));
    } finally {
        if (nomer === pokolenie) {
            stor.zagruzhaem = false;
        }
    }
}

/**
 * Повторно получить непрочитанные (после `subscribed`/reconnect), захватить и
 * передать обработчикам.
 */
async function zagruzitNeprochitannieDlya(stor: StorUvedomleniy): Promise<void> {
    if (stor.kanal === null) {
        return;
    }

    const nomer = pokolenie;
    const response = await OpenCodeService.uvedomleniya({limit: LIMIT_NEPROCHITANNIH});

    if (nomer !== pokolenie) {
        return;
    }

    if (response.status !== "success" || !pohozheNaOtvetUvedomleniy(response.data)) {
        // Ошибка фоновой догрузки не должна затирать уже показанное состояние.
        return;
    }

    await zahvatitIPeredat(otfiltrovatUvedomleniya(response.data.notifications));
}

/**
 * Стор уведомлений OpenCode.
 *
 * Отвечает только за транспорт: получение канала и непрочитанных, подписку,
 * захват на сервере и доставку данных зарегистрированным обработчикам.
 * Форматирование и показ — ответственность UI-слоя.
 */
export const useStorUvedomleniyOpenCode = defineStore("StorUvedomleniyOpenCode", {
    state: (): StorUvedomleniyOpenCodeState => {
        return {
            kanal: null,
            zagruzhaem: false,
            oshibka: null,
        };
    },

    actions: {
        /**
         * Идемпотентно подключиться к уведомлениям.
         *
         * Повторный вызов во время подключения возвращает тот же promise,
         * а после успешного подключения — не создаёт вторую подписку.
         */
        async podklyuchit(): Promise<void> {
            if (this.kanal !== null && otpiska !== null) {
                return;
            }

            if (podklyuchenie !== null) {
                return podklyuchenie;
            }

            const nomer = ++pokolenie;
            const tekushchee = vypolnitPodklyuchenie(this, nomer);
            podklyuchenie = tekushchee;

            try {
                await tekushchee;
            } finally {
                if (nomer === pokolenie && podklyuchenie === tekushchee) {
                    podklyuchenie = null;
                }
            }
        },

        /** Отписаться от уведомлений и очистить состояние (общий клиент не трогаем). */
        otklyuchit(): void {
            pokolenie += 1;

            if (otpiska !== null) {
                otpiska();
                otpiska = null;
            }

            podklyuchenie = null;
            obrabotchikiPokaza.clear();
            peredannieId.clear();

            this.kanal = null;
            this.zagruzhaem = false;
            this.oshibka = null;
        },

        /** Повторно получить непрочитанные после reconnect. */
        async zagruzitNeprochitannie(): Promise<void> {
            await zagruzitNeprochitannieDlya(this);
        },

        /**
         * Зарегистрировать обработчик показа.
         *
         * @returns функция снятия обработчика.
         */
        podpisatsyaNaPokaz(handler: NovoeUvedomlenieHandler): () => void {
            obrabotchikiPokaza.add(handler);

            return () => {
                obrabotchikiPokaza.delete(handler);
            };
        },
    },
});
