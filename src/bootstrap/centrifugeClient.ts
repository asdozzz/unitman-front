import { Centrifuge } from 'centrifuge';
import {
    logProgressa,
    logProgressaOshibka,
    logProgressaPreduprezhdenie,
} from '@/modules/unit/model/websocket/LogProgressaZadachi';

/**
 * Единственный экземпляр клиента Centrifugo на всё приложение.
 *
 * Клиент хранит реестр подписок и транспортное соединение, поэтому создавать
 * его повторно на каждый вызов нельзя: иначе на один канал появлялось бы
 * несколько подписок, а `connect()`/`disconnect()` конкурировали бы между
 * собой. Соединение устанавливается лениво — при первом обращении.
 */
let instance: Centrifuge | null = null;

/** Подписаться на транспортные события клиента: без них «нет событий» неотличимо от «нет связи». */
function podklyuchitLogirovanie(klient: Centrifuge): void {
    klient.on('connecting', (ctx) => {
        logProgressa('Centrifugo: подключение', {kod: ctx.code, prichina: ctx.reason});
    });

    klient.on('connected', (ctx) => {
        logProgressa('Centrifugo: соединение установлено', {
            klient: ctx.client,
            transport: ctx.transport,
        });
    });

    klient.on('disconnected', (ctx) => {
        logProgressaPreduprezhdenie('Centrifugo: соединение потеряно', {
            kod: ctx.code,
            prichina: ctx.reason,
        });
    });

    klient.on('error', (ctx) => {
        // Частая причина: сервер требует токен, а клиент создан без getToken.
        logProgressaOshibka('Centrifugo: ошибка клиента', {
            tip: ctx.type,
            kod: ctx.error?.code,
            soobshenie: ctx.error?.message,
        });
    });
}

export function useCentrifugo(): Centrifuge {
    if (instance === null) {
        const adres = window._env_?.VITE_CENTRIFUGE_HOST || import.meta.env.VITE_CENTRIFUGE_HOST;

        logProgressa('Centrifugo: создаю клиент', {adres, estToken: false});

        instance = new Centrifuge(adres);
        podklyuchitLogirovanie(instance);
    }

    return instance;
}
