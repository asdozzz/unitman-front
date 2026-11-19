import {SubscriptionState, type PublicationContext, type Subscription} from "centrifuge";
import {useCentrifugo} from "@/bootstrap/centrifugeClient";
import {pohozheNaUvedomlenie, type UvedomlenieOpenCode} from "@/modules/opencode/model/UvedomlenieOpenCode";

/**
 * Слушатель уведомлений OpenCode.
 */
export type SlushatelUvedomleniy = (uvedomlenie: UvedomlenieOpenCode) => void;

/**
 * Колбэк, который вызывается при каждой успешной подписке (в том числе после
 * reconnect): в этот момент нужно повторно забрать непрочитанные уведомления,
 * пока клиент был отключён.
 */
export type ObrabotchikPodpiski = () => void;

type PodpiskaNaKanal = {
    podpiska: Subscription;
    slushateli: Set<SlushatelUvedomleniy>;
    obrabotchikiPodpiski: Set<ObrabotchikPodpiski>;
    /** Подписку создал этот модуль — значит, её и снимать в реестре клиента. */
    sozdanaModuliem: boolean;
};

/**
 * Реестр подписок по каналам уведомлений.
 *
 * Имя канала возвращает бэкенд (`channel` из `GET /opencode/uvedomleniya`):
 * формат `opencode_notifications#<hex>` строится только на сервере. Подписка
 * одна на аккаунт и вкладку, поэтому повторное подключение переиспользует
 * уже существующую запись, а не создаёт вторую.
 */
const podpiski = new Map<string, PodpiskaNaKanal>();

function obrabotchikPublikacii(kanal: string, ctx: PublicationContext): void {
    const dannie: unknown = ctx.data;

    if (!pohozheNaUvedomlenie(dannie)) {
        return;
    }

    const zapis = podpiski.get(kanal);

    if (zapis === undefined) {
        return;
    }

    // Копия набора: слушатель может отписаться прямо во время обхода.
    [...zapis.slushateli].forEach((slushatel: SlushatelUvedomleniy) => {
        slushatel(dannie);
    });
}

function obrabotchikPodpiski(kanal: string): void {
    const zapis = podpiski.get(kanal);

    if (zapis === undefined) {
        return;
    }

    // Копия набора: колбэк может снять свою отписку прямо во время обхода.
    [...zapis.obrabotchikiPodpiski].forEach((obrabotchik: ObrabotchikPodpiski) => {
        obrabotchik();
    });
}

/**
 * Подписаться на уведомления конкретного канала.
 *
 * @param kanal имя канала ровно в том виде, в котором его вернул бэкенд
 *        (`channel`), — без склейки префиксов на клиенте.
 * @param slushatel обработчик нового уведомления.
 * @param priPodpiske необязательный колбэк; вызывается при каждом `subscribed`
 *        и сразу, если подписка уже активна. Нужен стору, чтобы забрать
 *        непрочитанные после reconnect.
 * @returns функция отписки; её нужно вызвать при отключении уведомлений.
 */
export function podpisatsyaNaUvedomleniya(
    kanal: string,
    slushatel: SlushatelUvedomleniy,
    priPodpiske?: ObrabotchikPodpiski,
): () => void {
    if (kanal === "") {
        return () => undefined;
    }

    let zapis = podpiski.get(kanal);

    if (zapis === undefined) {
        const klient = useCentrifugo();
        const sushchestvuyushchaya = klient.getSubscription(kanal);

        // Подписку могли создать до нас (например, после HMR) — переиспользуем.
        const sozdanaModuliem = sushchestvuyushchaya === null;
        const podpiska = sushchestvuyushchaya ?? klient.newSubscription(kanal);

        zapis = {
            podpiska,
            slushateli: new Set(),
            obrabotchikiPodpiski: new Set(),
            sozdanaModuliem,
        };
        podpiski.set(kanal, zapis);

        podpiska.on('publication', (ctx: PublicationContext) => obrabotchikPublikacii(kanal, ctx));
        podpiska.on('subscribed', () => obrabotchikPodpiski(kanal));

        // Переиспользованная подписка могла оказаться снятой — иначе события не придут.
        if (podpiska.state === SubscriptionState.Unsubscribed) {
            podpiska.subscribe();
        }

        klient.connect();
    }

    const tekushchaya = zapis;
    tekushchaya.slushateli.add(slushatel);

    if (priPodpiske !== undefined) {
        tekushchaya.obrabotchikiPodpiski.add(priPodpiske);

        // Подписка уже активна — событие `subscribed` не повторится.
        if (tekushchaya.podpiska.state === SubscriptionState.Subscribed) {
            priPodpiske();
        }
    }

    return () => {
        tekushchaya.slushateli.delete(slushatel);

        if (priPodpiske !== undefined) {
            tekushchaya.obrabotchikiPodpiski.delete(priPodpiske);
        }

        if (tekushchaya.slushateli.size > 0) {
            return;
        }

        podpiski.delete(kanal);

        if (tekushchaya.sozdanaModuliem) {
            // Внутри снимет подписку (если нужно) и удалит её из реестра клиента.
            useCentrifugo().removeSubscription(tekushchaya.podpiska);
        }
    };
}
