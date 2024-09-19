import { Centrifuge } from 'centrifuge';

export function useCentrifugo(): Centrifuge {
    const centrifuge = new Centrifuge(import.meta.env.VITE_CENTRIFUGE_HOST);

    centrifuge.on('connecting', function (ctx) {
        console.log(`Centrifuge connecting: ${ctx.code}, ${ctx.reason}`);
    }).on('connected', function (ctx) {
        console.log(`Centrifuge connected over ${ctx.transport}`);
    }).on('disconnected', function (ctx) {
        console.log(`Centrifuge disconnected: ${ctx.code}, ${ctx.reason}`);
    }).on('error', function(ctx) {
        console.log('Centrifuge client error', ctx);
    });;

    return centrifuge;
}
