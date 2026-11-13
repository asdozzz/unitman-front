import {SubscriptionState, type PublicationContext, type Subscription} from "centrifuge";
import {useCentrifugo} from "@/bootstrap/centrifugeClient";
import {
    KANAL_SOBITIY_PROEKTOV,
    type ModelForChannelSpisokProektov
} from "@/modules/unit/model/websocket/ModelForChannelSpisokProektov";

/** Обработчик события канала списка проектов. */
export type SlushatelSobitiyProekta = (sobitiye: ModelForChannelSpisokProektov) => void;

/**
 * Слушатели канала `spisok_proektov`.
 *
 * Centrifugo разрешает только одну подписку на канал на клиента: второй
 * `newSubscription` бросает исключение. Поэтому подписка одна на модуль,
 * а число подписчиков считается через размер набора — последний ушедший
 * снимает подписку с клиента.
 */
const slushateli = new Set<SlushatelSobitiyProekta>();

let podpiska: Subscription | null = null;

/** Подписку создал этот модуль — значит, её и снимать в реестре клиента. */
let podpiskaSozdanaModuliem = false;

/** Проверка формы события: в канал может прийти что угодно. */
function pohozheNaSobitiyeProekta(dannie: unknown): dannie is ModelForChannelSpisokProektov {
    if (typeof dannie !== 'object' || dannie === null) {
        return false;
    }

    const zapis = dannie as Record<string, unknown>;

    return typeof zapis['id'] === 'string' && typeof zapis['eventType'] === 'string';
}

function obrabotchikPublikacii(ctx: PublicationContext): void {
    const dannie: unknown = ctx.data;

    if (!pohozheNaSobitiyeProekta(dannie)) {
        return;
    }

    // Копия набора: слушатель может отписаться прямо во время обхода.
    [...slushateli].forEach((slushatel: SlushatelSobitiyProekta) => {
        slushatel(dannie);
    });
}

/**
 * Подписаться на события проектов.
 *
 * @returns функция отписки; её нужно вызвать при уходе со страницы.
 */
export function podpisatsyaNaSobitiyaProektov(slushatel: SlushatelSobitiyProekta): () => void {
    slushateli.add(slushatel);

    if (podpiska === null) {
        const klient = useCentrifugo();
        const sushchestvuyushchaya = klient.getSubscription(KANAL_SOBITIY_PROEKTOV);

        // Подписку могли создать до нас (например, после HMR) — переиспользуем.
        podpiskaSozdanaModuliem = sushchestvuyushchaya === null;
        podpiska = sushchestvuyushchaya ?? klient.newSubscription(KANAL_SOBITIY_PROEKTOV);

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
