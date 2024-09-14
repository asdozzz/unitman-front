import { Centrifuge } from 'centrifuge';

export function useCentrifugo(): Centrifuge {
    const centrifuge = new Centrifuge(import.meta.env.VITE_CENTRIFUGE_HOST);

    centrifuge.on('connecting', function (ctx) {
        console.log(`connecting: ${ctx.code}, ${ctx.reason}`);
    }).on('connected', function (ctx) {
        console.log(`connected over ${ctx.transport}`);
    }).on('disconnected', function (ctx) {
        console.log(`disconnected: ${ctx.code}, ${ctx.reason}`);
    });

    return centrifuge;
}
