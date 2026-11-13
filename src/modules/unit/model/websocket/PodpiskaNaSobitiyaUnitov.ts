import {SubscriptionState, type PublicationContext, type Subscription} from "centrifuge";
import {useCentrifugo} from "@/bootstrap/centrifugeClient";
import {
    KANAL_SOBITIY_UNITOV,
    type ModelForChannelSpisokUnitov
} from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";

/** Обработчик события канала списка юнитов. */
export type SlushatelSobitiyUnita = (sobitiye: ModelForChannelSpisokUnitov) => void;

/**
 * Слушатели канала `spisok_unitov`.
 *
 * Канал общий для нескольких экранов (список юнитов, окно задач runner'а),
 * а Centrifugo разрешает только одну подписку на канал на клиента: второй
 * `newSubscription` бросает исключение. Поэтому подписка одна на модуль,
 * а число подписчиков считается через размер набора — последний ушедший
 * снимает подписку с клиента.
 */
const slushateli = new Set<SlushatelSobitiyUnita>();

let podpiska: Subscription | null = null;

/** Подписку создал этот модуль — значит, её и снимать в реестре клиента. */
let podpiskaSozdanaModuliem = false;

/** Проверка формы события: в канал может прийти что угодно. */
function pohozheNaSobitiyeUnita(dannie: unknown): dannie is ModelForChannelSpisokUnitov {
    if (typeof dannie !== 'object' || dannie === null) {
        return false;
    }

    const zapis = dannie as Record<string, unknown>;

    return typeof zapis['id'] === 'string' && typeof zapis['eventType'] === 'string';
}

function obrabotchikPublikacii(ctx: PublicationContext): void {
    const dannie: unknown = ctx.data;

    if (!pohozheNaSobitiyeUnita(dannie)) {
        return;
    }

    // Копия набора: слушатель может отписаться прямо во время обхода.
    [...slushateli].forEach((slushatel: SlushatelSobitiyUnita) => {
        slushatel(dannie);
    });
}

/**
 * Подписаться на события юнитов.
 *
 * @returns функция отписки; её нужно вызвать при уходе со страницы.
 */
export function podpisatsyaNaSobitiyaUnitov(slushatel: SlushatelSobitiyUnita): () => void {
    slushateli.add(slushatel);

    if (podpiska === null) {
        const klient = useCentrifugo();
        const sushchestvuyushchaya = klient.getSubscription(KANAL_SOBITIY_UNITOV);

        // Подписку могли создать до нас (например, после HMR) — переиспользуем.
        podpiskaSozdanaModuliem = sushchestvuyushchaya === null;
        podpiska = sushchestvuyushchaya ?? klient.newSubscription(KANAL_SOBITIY_UNITOV);

        podpiska.on('publication', obrabotchikPublikacii);

        // Переиспользованная подписка могла оказаться снятой — иначе события не придут.
        if (podpiska.state === SubscriptionState.Unsubscribed) {
            podpiska.subscribe();
        }

        klient.connect();
    }

    return () => {
        slushateli.delete(slushatel);

        if (slushateli.size > 0 || podpiska === null) {
            return;
        }

        podpiska.off('publication', obrabotchikPublikacii);

        if (podpiskaSozdanaModuliem) {
            // Внутри снимет подписку (если нужно) и удалит её из реестра клиента.
            useCentrifugo().removeSubscription(podpiska);
        }

        podpiska = null;
        podpiskaSozdanaModuliem = false;
    };
}
