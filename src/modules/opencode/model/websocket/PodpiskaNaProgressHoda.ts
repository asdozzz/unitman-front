import {SubscriptionState, type PublicationContext, type Subscription} from "centrifuge";
import {useCentrifugo} from "@/bootstrap/centrifugeClient";
import {pohozheNaProgress, type ProgressHodaOpenCode} from "@/modules/opencode/model/ChatOpenCode";

/**
 * Обработчик прогресса хода OpenCode.
 */
export type SlushatelProgressaHoda = (progress: ProgressHodaOpenCode) => void;

type PodpiskaNaKanal = {
    podpiska: Subscription;
    slushateli: Set<SlushatelProgressaHoda>;
    /** Подписку создал этот модуль — значит, её и снимать в реестре клиента. */
    sozdanaModuliem: boolean;
};

/**
 * Реестр подписок по каналам.
 *
 * Имя канала прогресса приходит с бэкенда (`progressChannel` у хода) и
 * содержит идентификатор workflow, поэтому каналов столько же, сколько
 * одновременно наблюдаемых ходов. Строить имя самим нельзя: формат
 * (`unit_progress#<...>`) — внутреннее дело бэкенда.
 *
 * Одна подписка на канал: Centrifugo бросает исключение на второй
 * `newSubscription` для того же имени, а переключение между ходами
 * в интерфейсе происходит часто.
 */
const podpiski = new Map<string, PodpiskaNaKanal>();

function obrabotchikPublikacii(kanal: string, ctx: PublicationContext): void {
    const dannie: unknown = ctx.data;

    if (!pohozheNaProgress(dannie)) {
        return;
    }

    const zapis = podpiski.get(kanal);

    if (zapis === undefined) {
        return;
    }

    // Копия набора: слушатель может отписаться прямо во время обхода.
    [...zapis.slushateli].forEach((slushatel: SlushatelProgressaHoda) => {
        slushatel(dannie);
    });
}

/**
 * Подписаться на прогресс конкретного хода.
 *
 * @param kanal имя канала ровно в том виде, в котором его вернул бэкенд
 *        (`progressChannel`), — без склейки префиксов на клиенте.
 * @returns функция отписки; её нужно вызвать при уходе со страницы.
 */
export function podpisatsyaNaProgressHoda(kanal: string, slushatel: SlushatelProgressaHoda): () => void {
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

        zapis = {podpiska, slushateli: new Set(), sozdanaModuliem};
        podpiski.set(kanal, zapis);

        podpiska.on('publication', (ctx: PublicationContext) => obrabotchikPublikacii(kanal, ctx));

        // Переиспользованная подписка могла оказаться снятой — иначе события не придут.
        if (podpiska.state === SubscriptionState.Unsubscribed) {
            podpiska.subscribe();
        }

        klient.connect();
    }

    const tekushchaya = zapis;
    tekushchaya.slushateli.add(slushatel);

    return () => {
        tekushchaya.slushateli.delete(slushatel);

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
