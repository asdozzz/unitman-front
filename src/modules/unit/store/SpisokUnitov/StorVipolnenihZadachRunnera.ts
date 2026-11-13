import {defineStore} from "pinia";
import {State, type ErrorContext, type StateContext, type Subscription} from "centrifuge";
import {useCentrifugo} from "@/bootstrap/centrifugeClient";
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Schema} from "@/api/types";
import type {ModelForChannelSpisokUnitov} from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";
import {podpisatsyaNaSobitiyaUnitov} from "@/modules/unit/model/websocket/PodpiskaNaSobitiyaUnitov";
import {
    logProgressa,
    logProgressaPreduprezhdenie,
    obrezatDlinnoe,
    opisatPayload,
} from "@/modules/unit/model/websocket/LogProgressaZadachi";

type ShagZadachi = Schema<"RunnerJobStep">;

/** Снапшот прогресса задачи runner'а. Совпадает с payload канала `unit_progress#<jobId>`. */
export type ProgressZadachi = Schema<"RunnerJobProgress">;

export type ZadachaUnitaBezShagov = Schema<"UnitProcessBriefJob">;

export type ProzesUnitaBezShagov = Schema<"UnitProcessBrief">;

/** Состояние канала доставки прогресса. */
export type SostoyanieKanala = 'live' | 'reconnecting' | 'readonly';

/** Состояние отображаемой задачи. */
export type SostoyanieZadachi = 'waiting' | 'running' | 'success' | 'error';

/** Готовый к отображению срез прогресса (push-снапшот либо данные из БД). */
export type ProgressDlyaOtobrazheniya = {
    steps: ShagZadachi[];
    finished: boolean;
    success: boolean;
    updatedAt: number;
    status: SostoyanieZadachi;
};

const TERMINALNIE_SOSTOYANIYA: ReadonlyArray<ZadachaUnitaBezShagov['state']> = ['SUCCESS', 'ERROR', 'CANCLED'];

/** Задержки перед повтором pull-запроса (без джиттера). Максимум 4 попытки суммарно. */
const ZADERZHKI_POVTORA_PULL = [1000, 2000, 4000];

/** Верхняя граница джиттера для соответствующего повтора. */
const DZHITTER_POVTORA_PULL = [250, 500, 1000];

/** Количество попыток pull, после которых канал переводится в режим «только чтение». */
const MAKSIMUM_POPITOK_PULL = 4;

/** Задержка перед pull после события `subscribed` — гасит гонку с публикацией. */
const ZADERZHKA_PULL_POSLE_PODPISKI = 350;

/** Порог давности снапшота, после которого возврат к вкладке вызывает pull. */
const POROG_AKTUALNOSTI_POSLE_FOKUSA = 5000;

/**
 * Задержка склейки серии событий об обновлении юнита, мс.
 *
 * Бэкенд публикует `OBNOVLEN` и `OBNOVLENA_STATA` подряд на одно действие,
 * поэтому запрос к бэку выполняется один раз на пачку событий.
 */
const ZADERZHKA_OBRABOTKI_SOBITIY_UNITA = 300;

/** Типы событий канала `spisok_unitov`, после которых данные юнита устарели. */
const SOBITIYA_OBNOVLENIYA_UNITA = ['OBNOVLEN', 'OBNOVLENA_STATA'];

/**
 * Сообщения бэкенда о чужой задаче.
 *
 * Бэкенд транслирует доменную ошибку `unit.runner_job_not_found` в локализованный
 * текст (см. `translations/messages.{ru,en}.php`), поэтому распознаём её по
 * тексту, а не по коду: код ответа в этом случае общий (`DEFAULT`).
 */
const SOOBSHENIYA_O_CHUZHOY_ZADACHE = [
    'unit.runner_job_not_found',
    'Задача runner не найдена',
    'The runner job was not found',
];

/**
 * Несерверные (нереактивные) ресурсы прогресса.
 *
 * Хранятся вне `state` намеренно: подписка, таймеры и промис в полёте не должны
 * попадать в реактивный граф и в devtools. Один экземпляр на модуль — ровно
 * столько же, сколько инстансов стора в приложении.
 */
type SluzhebnieResursiProgressa = {
    klient: ReturnType<typeof useCentrifugo> | null;
    podpiska: Subscription | null;
    kanal: string | null;
    obrabotchikSostoyaniyaKlienta: ((ctx: StateContext) => void) | null;
    obrabotchikVidimosti: (() => void) | null;
    /** Счётчик поколений наблюдения: защита от гонок и «протухших» ответов. */
    pokolenie: number;
    /** Отписка от канала событий юнитов (`spisok_unitov`). */
    otpiskaOtSobitiyUnita: (() => void) | null;
    tajmerSobitiyUnita: ReturnType<typeof setTimeout> | null;
    /** Промис текущего pull-запроса (single-flight). */
    pullVLetu: Promise<void> | null;
    pullVLetuPokolenie: number;
    /** Признак того, что во время полёта запросили ещё один pull (один отложенный). */
    pullOzhidaet: boolean;
    tajmerPullPoslePodpiski: ReturnType<typeof setTimeout> | null;
    tajmerPovtoraPull: ReturnType<typeof setTimeout> | null;
    obnovlenieSpiskaIdet: boolean;
};

const sluzhebnoe: SluzhebnieResursiProgressa = {
    klient: null,
    podpiska: null,
    kanal: null,
    obrabotchikSostoyaniyaKlienta: null,
    obrabotchikVidimosti: null,
    pokolenie: 0,
    otpiskaOtSobitiyUnita: null,
    tajmerSobitiyUnita: null,
    pullVLetu: null,
    pullVLetuPokolenie: 0,
    pullOzhidaet: false,
    tajmerPullPoslePodpiski: null,
    tajmerPovtoraPull: null,
    obnovlenieSpiskaIdet: false,
};

/** Задача из списка процессов по выбранной паре «процесс + задача». */
function naitiZadachuVSpiske(
    spisok: ProzesUnitaBezShagov[],
    selectJob: {prozesId: string; zadachaId: string},
): ZadachaUnitaBezShagov | null {
    const prozes = spisok.find((element) => element.id === selectJob.prozesId);

    if (prozes === undefined) {
        return null;
    }

    return prozes.jobs.find((zadacha) => zadacha.id === selectJob.zadachaId) ?? null;
}

/** Задача уже завершилась (успешно, с ошибкой или отменена). */
function zadachaTerminalnaya(zadacha: ZadachaUnitaBezShagov | null): boolean {
    return zadacha !== null && TERMINALNIE_SOSTOYANIYA.includes(zadacha.state);
}

/**
 * Перечислить несоответствия формы payload'а из Centrifugo.
 *
 * Отдельно от самого type guard'а, чтобы в лог попадала причина отбраковки:
 * иначе событие «пропадает» молча и невозможно понять, что именно пришло
 * (`updatedAt` строкой, `finished` числом `0/1`, отсутствие `steps`).
 */
function prichiniNesootvetstviyaProgressa(dannie: unknown): string[] {
    if (typeof dannie !== 'object' || dannie === null) {
        return [`payload не объект (получено: ${dannie === null ? 'null' : typeof dannie})`];
    }

    const zapis = dannie as Record<string, unknown>;
    const prichini: string[] = [];

    if (typeof zapis['jobId'] !== 'string') {
        prichini.push(`jobId: ожидалась строка, пришло ${znachenieDlyaLoga(zapis['jobId'])}`);
    }

    if (typeof zapis['finished'] !== 'boolean') {
        prichini.push(`finished: ожидался boolean, пришло ${znachenieDlyaLoga(zapis['finished'])}`);
    }

    if (typeof zapis['success'] !== 'boolean') {
        prichini.push(`success: ожидался boolean, пришло ${znachenieDlyaLoga(zapis['success'])}`);
    }

    if (typeof zapis['updatedAt'] !== 'number') {
        prichini.push(`updatedAt: ожидалось число (unix-секунды), пришло ${znachenieDlyaLoga(zapis['updatedAt'])}`);
    }

    if (!Array.isArray(zapis['steps'])) {
        prichini.push(`steps: ожидался массив, пришло ${znachenieDlyaLoga(zapis['steps'])}`);
    }

    return prichini;
}

/** Короткое описание значения для сообщения об отбраковке. */
function znachenieDlyaLoga(znachenie: unknown): string {
    if (znachenie === undefined) {
        return 'поле отсутствует';
    }

    if (znachenie === null) {
        return 'null';
    }

    if (typeof znachenie === 'string') {
        return `строка "${obrezatDlinnoe(znachenie)}"`;
    }

    return `${typeof znachenie} (${String(znachenie)})`;
}

/** Проверка формы payload'а из Centrifugo: в канал может прийти что угодно. */
function pohozheNaProgressZadachi(dannie: unknown): dannie is ProgressZadachi {
    return prichiniNesootvetstviyaProgressa(dannie).length === 0;
}

/**
 * Совпадают ли два снапшота с одинаковым `updatedAt`.
 *
 * `updatedAt` приходит в unix-секундах, поэтому нескольких обновлений в одну
 * секунду не различить по времени. Сравниваем содержимое последнего шага и
 * признаки завершения: если они те же — снапшот действительно дубль.
 */
function etoTotZheSnapshhot(noviy: ProgressZadachi, primenenniy: ProgressZadachi): boolean {
    if (noviy.finished !== primenenniy.finished || noviy.success !== primenenniy.success) {
        return false;
    }

    if (noviy.steps.length !== primenenniy.steps.length) {
        return false;
    }

    if (noviy.steps.length === 0) {
        return true;
    }

    const posledniyNoviy = noviy.steps[noviy.steps.length - 1];
    const posledniyPrimenenniy = primenenniy.steps[primenenniy.steps.length - 1];

    return posledniyNoviy.command === posledniyPrimenenniy.command
        && posledniyNoviy.unixtime === posledniyPrimenenniy.unixtime
        && posledniyNoviy.success === posledniyPrimenenniy.success
        && posledniyNoviy.response === posledniyPrimenenniy.response;
}

/** Ошибка означает, что задача не принадлежит процессу — повторять запрос бессмысленно. */
function etoOshibkaChuzhoyZadachi(soobshenie: string): boolean {
    const normalizovannoe = soobshenie.trim().toLowerCase();

    return SOOBSHENIYA_O_CHUZHOY_ZADACHE.some((variant) => variant.toLowerCase() === normalizovannoe);
}

type StorVipolnenihZadachRunneraState = {
    loader: boolean;
    spisok: ProzesUnitaBezShagov[],
    selectJob: {
        prozesId: string;
        zadachaId: string;
        steps: ShagZadachi[]
    },
    oshibkaOtBackenda: string | null;
    unitId: string | null;
    /** Последний применённый снапшот прогресса (push или pull — не важно). */
    progress: ProgressZadachi | null;
    /** Состояние канала доставки прогресса. */
    channelState: SostoyanieKanala;
    /** Количество подряд неудачных pull-запросов. */
    pullRetryCount: number;
    /** Время (ms) последнего применённого снапшота — для автоскролла и visibilitychange. */
    lastAppliedAt: number;
}

export const storVipolnenihZadachRunnera = defineStore('StorVipolnenihZadachRunnera', {
    state: (): StorVipolnenihZadachRunneraState => {
        return {
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            unitId: null,
            selectJob: {
                prozesId: "",
                zadachaId: "",
                steps: []
            },
            progress: null,
            channelState: 'readonly',
            pullRetryCount: 0,
            lastAppliedAt: 0,
        };
    },
    getters: {
        /** Задача из списка процессов, соответствующая выбранной. */
        tekushayaZadacha(state): ZadachaUnitaBezShagov | null {
            return naitiZadachuVSpiske(state.spisok, state.selectJob);
        },
        /**
         * Источник данных для панели логов.
         *
         * Приоритет у push-снапшота; если его нет (раннер ещё ничего не прислал
         * либо прогресс истёк по TTL) — используются шаги из БД и состояние
         * задачи из списка процессов.
         */
        progressOtobrazhaemiya(state): ProgressDlyaOtobrazheniya {
            const progress = state.progress;

            if (progress !== null && progress.updatedAt > 0) {
                return {
                    steps: progress.steps,
                    finished: progress.finished,
                    success: progress.success,
                    updatedAt: progress.updatedAt,
                    status: sostoyanieProgressa(progress.finished, progress.success, progress.steps.length),
                };
            }

            const zadacha = naitiZadachuVSpiske(state.spisok, state.selectJob);
            const finished = zadachaTerminalnaya(zadacha);
            const success = zadacha !== null && zadacha.state === 'SUCCESS';

            return {
                steps: state.selectJob.steps,
                finished,
                success,
                updatedAt: 0,
                status: sostoyanieProgressa(finished, success, state.selectJob.steps.length),
            };
        },
        /** Pull-ретраи исчерпаны — показываем «не удалось обновить» и кнопку ручного обновления. */
        neUdalosObnovitProgress(state): boolean {
            return state.channelState === 'readonly' && state.pullRetryCount >= MAKSIMUM_POPITOK_PULL;
        },
    },
    actions: {
        /**
         * Выбрать задачу: пересоздать подписку, сбросить прогресс и сделать один pull.
         *
         * Порядок важен: подписка создаётся до pull, чтобы не потерять публикацию,
         * пришедшую между запросом и ответом.
         */
        async select(prozesId: string, zadachaId: string) {
            this.otpisatsyaOtProgressa();

            this.selectJob = {prozesId, zadachaId, steps: []};
            this.progress = null;
            this.oshibkaOtBackenda = null;
            this.pullRetryCount = 0;
            this.lastAppliedAt = 0;
            this.channelState = 'reconnecting';
            this.loader = false;

            this.podpisatsyaNaProgress();

            await this.zaprositProgress(sluzhebnoe.pokolenie);
        },
        /**
         * Подписаться на `unit_progress#<jobId>`.
         *
         * Подписка всегда создаётся заново: объект подписки не переиспользуется,
         * поэтому предыдущую нужно снять с клиента (иначе `newSubscription`
         * бросит «Subscription to the channel already exists»).
         */
        podpisatsyaNaProgress() {
            this.otpisatsyaOtProgressa();

            const zadachaId = this.selectJob.zadachaId;

            if (zadachaId === '') {
                logProgressaPreduprezhdenie('подписка не создана: zadachaId пустой');

                return;
            }

            sluzhebnoe.pokolenie += 1;
            const pokolenie = sluzhebnoe.pokolenie;

            const klient = useCentrifugo();
            const kanal = `unit_progress#${zadachaId}`;

            // Остаток от прошлой подписки на этот же канал (например, после HMR).
            const ostavshayasya = klient.getSubscription(kanal);

            if (ostavshayasya !== null) {
                logProgressaPreduprezhdenie(`снимаю подписку-остаток от прошлого раза: канал ${kanal}`, {
                    pokolenie,
                    sostoyanie: ostavshayasya.state,
                });

                ostavshayasya.removeAllListeners();
                klient.removeSubscription(ostavshayasya);
            }

            const podpiska = klient.newSubscription(kanal);

            sluzhebnoe.klient = klient;
            sluzhebnoe.podpiska = podpiska;
            sluzhebnoe.kanal = kanal;

            logProgressa(`подписка создана: канал ${kanal}`, {
                pokolenie,
                sostoyanieKlienta: klient.state,
                prozesId: this.selectJob.prozesId,
                zadachaId,
            });

            podpiska.on('publication', (ctx) => {
                const dannie: unknown = ctx.data;

                if (pokolenie !== sluzhebnoe.pokolenie) {
                    logProgressaPreduprezhdenie(
                        `публикация отброшена: поколение подписки устарело (событие: ${pokolenie}, актуально: ${sluzhebnoe.pokolenie})`,
                        {
                            kanal: ctx.channel,
                            payload: opisatPayload(dannie),
                            prichini: prichiniNesootvetstviyaProgressa(dannie),
                        },
                    );

                    return;
                }

                if (!pohozheNaProgressZadachi(dannie)) {
                    // Самая частая причина «событие есть, а стор не обновляется».
                    logProgressaPreduprezhdenie(
                        'публикация отброшена: payload не соответствует RunnerJobProgress '
                        + `(${prichiniNesootvetstviyaProgressa(dannie).join('; ')})`,
                        {kanal: ctx.channel, payload: opisatPayload(dannie)},
                    );

                    return;
                }

                logProgressa(
                    `публикация получена: jobId=${dannie.jobId}, `
                    + `updatedAt=${dannie.updatedAt}, `
                    + `шагов=${dannie.steps.length}, `
                    + `finished=${dannie.finished}, `
                    + `success=${dannie.success}`,
                    {
                        kanal: ctx.channel,
                        pokolenie,
                        vybrannayaZadacha: this.selectJob.zadachaId,
                        rezultatPrimeneniya: this.primenitProgress(dannie),
                    },
                );
            });

            podpiska.on('subscribed', () => {
                if (pokolenie !== sluzhebnoe.pokolenie) {
                    logProgressaPreduprezhdenie('событие subscribed отброшено: подписка устарела', {pokolenie});

                    return;
                }

                logProgressa(`подписка активна: канал ${kanal}`, {
                    pokolenie,
                    sostoyanieKlienta: klient.state,
                    sostoyaniePodpiski: podpiska.state,
                });

                // Pull после каждой успешной подписки — закрывает пропущенные публикации.
                this.zaplanirovatPullPoslePodpiski(pokolenie);
            });

            podpiska.on('error', (ctx: ErrorContext) => {
                // Ошибка подписки — вторая по частоте причина отсутствия событий:
                // без токена (getToken в centrifugeClient) приватный канал не пустит.
                logProgressaPreduprezhdenie(`ошибка подписки на канал ${kanal}`, {
                    kod: ctx?.error?.code,
                    soobshenie: ctx?.error?.message,
                    tip: ctx?.type,
                    kanalOpyt: podpiska.state,
                });

                if (pokolenie !== sluzhebnoe.pokolenie || this.channelState === 'readonly') {
                    return;
                }

                this.channelState = 'reconnecting';
            });

            const obrabotchikSostoyaniyaKlienta = (ctx: StateContext): void => {
                logProgressa(`состояние клиента Centrifugo: ${ctx.oldState} → ${ctx.newState}`, {pokolenie});

                if (pokolenie !== sluzhebnoe.pokolenie || this.channelState === 'readonly') {
                    return;
                }

                this.channelState = ctx.newState === State.Connected ? 'live' : 'reconnecting';
            };

            sluzhebnoe.obrabotchikSostoyaniyaKlienta = obrabotchikSostoyaniyaKlienta;
            klient.on('state', obrabotchikSostoyaniyaKlienta);

            if (typeof document !== 'undefined') {
                const obrabotchikVidimosti = (): void => {
                    if (pokolenie !== sluzhebnoe.pokolenie || document.visibilityState !== 'visible') {
                        return;
                    }

                    const davnoNeObnovlyali = Date.now() - this.lastAppliedAt >= POROG_AKTUALNOSTI_POSLE_FOKUSA;

                    // Возврат к вкладке не должен превращаться в поток запросов.
                    if (!davnoNeObnovlyali && this.channelState === 'live') {
                        return;
                    }

                    void this.zaprositProgress(pokolenie);
                };

                sluzhebnoe.obrabotchikVidimosti = obrabotchikVidimosti;
                document.addEventListener('visibilitychange', obrabotchikVidimosti);
            }

            this.channelState = klient.state === State.Connected ? 'live' : 'reconnecting';

            podpiska.subscribe();
            klient.connect();
        },
        /**
         * Снять подписку и освободить все ресурсы наблюдения.
         *
         * Клиент Centrifugo не отключается: он общий для приложения.
         */
         otpisatsyaOtProgressa() {
            sluzhebnoe.pokolenie += 1;
            this.otmenitTajmeriPull();

            const podpiska = sluzhebnoe.podpiska;
            const klient = sluzhebnoe.klient;

            if (klient !== null && sluzhebnoe.obrabotchikSostoyaniyaKlienta !== null) {
                klient.off('state', sluzhebnoe.obrabotchikSostoyaniyaKlienta);
            }

            sluzhebnoe.obrabotchikSostoyaniyaKlienta = null;

            if (sluzhebnoe.obrabotchikVidimosti !== null && typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', sluzhebnoe.obrabotchikVidimosti);
            }

            sluzhebnoe.obrabotchikVidimosti = null;

            if (podpiska !== null) {
                podpiska.removeAllListeners();

                if (klient !== null) {
                    // Внутри снимет подписку (если нужно) и удалит её из реестра клиента.
                    klient.removeSubscription(podpiska);
                } else {
                    podpiska.unsubscribe();
                }
            }

            sluzhebnoe.podpiska = null;
            sluzhebnoe.kanal = null;
            sluzhebnoe.pullVLetu = null;
            sluzhebnoe.pullVLetuPokolenie = 0;
            sluzhebnoe.pullOzhidaet = false;
        },
        /**
         * Единственная точка применения снапшота прогресса.
         *
         * @param progress снапшот из push-публикации или из pull-ответа.
         * @returns описание исхода для лога: `применён` либо причина отказа.
         */
        primenitProgress(progress: ProgressZadachi): string {
            if (progress.jobId !== this.selectJob.zadachaId) {
                // Публикация от другой задачи (устаревшая подписка) — игнорируем.
                const prichina = `отброшен: jobId снапшота («${obrezatDlinnoe(progress.jobId, 80)}») `
                    + `не совпадает с выбранной задачей («${obrezatDlinnoe(this.selectJob.zadachaId, 80)}»)`;

                logProgressaPreduprezhdenie(`снапшот ${prichina}`, {
                    updatedAt: progress.updatedAt,
                    kolichestvoShagov: progress.steps.length,
                });

                return prichina;
            }

            const tekushiy = this.progress;

            if (tekushiy !== null) {
                const uzhePrimenen = progress.updatedAt < tekushiy.updatedAt
                    || (progress.updatedAt === tekushiy.updatedAt && etoTotZheSnapshhot(progress, tekushiy));

                if (uzhePrimenen) {
                    // `updatedAt` измеряется в секундах, поэтому два реальных изменения
                    // в одну секунду различимы только по содержимому шагов.
                    const prichina = `отброшен как устаревший: updatedAt=${progress.updatedAt} `
                        + `(применён ${tekushiy.updatedAt}), шагов ${progress.steps.length} `
                        + `(применено ${tekushiy.steps.length})`;

                    logProgressaPreduprezhdenie(`снапшот ${prichina}`);

                    if (progress.finished) {
                        // Завершение могло быть пропущено (например, страница была скрыта).
                        this.zavershitNablyudenie();
                    }

                    return prichina;
                }

                if (tekushiy.finished) {
                    // Наблюдение уже закрыто (подписка снята), но данные могли
                    // дописаться после `finished` — тогда применяем их, не
                    // переоткрывая канал.
                    logProgressa('снапшот новее завершённого: применяю данные, канал не переоткрываю', {
                        prinyatoUpdatedAt: tekushiy.updatedAt,
                        novoUpdatedAt: progress.updatedAt,
                        shagovBylo: tekushiy.steps.length,
                        shagovStalo: progress.steps.length,
                    });
                }
            }

            this.progress = progress;
            this.pullRetryCount = 0;
            this.oshibkaOtBackenda = null;
            this.lastAppliedAt = Date.now();

            const prichina = `применён: updatedAt=${progress.updatedAt}, шагов=${progress.steps.length}, `
                + `finished=${progress.finished}, success=${progress.success}`;

            if (progress.finished) {
                this.zavershitNablyudenie();
            }

            return prichina;
        },
        /**
         * Pull-запрос прогресса с single-flight.
         *
         * Параллельные вызовы не создают второй запрос: один текущий, один
         * отложенный — этого достаточно, потому что снапшот всегда полный.
         */
        zaprositProgress(pokolenie: number, uchetPopitok = true): Promise<void> {
            if (pokolenie !== sluzhebnoe.pokolenie) {
                return Promise.resolve();
            }

            if (sluzhebnoe.pullVLetu !== null) {
                sluzhebnoe.pullOzhidaet = true;

                return sluzhebnoe.pullVLetu;
            }

            const vypolnenie = this.vipolnitZaprosProgress(pokolenie, uchetPopitok).finally(() => {
                if (sluzhebnoe.pullVLetuPokolenie === pokolenie) {
                    sluzhebnoe.pullVLetu = null;
                }

                const nuzhenEsheOdin = sluzhebnoe.pullOzhidaet;
                sluzhebnoe.pullOzhidaet = false;

                if (nuzhenEsheOdin && pokolenie === sluzhebnoe.pokolenie) {
                    void this.zaprositProgress(pokolenie, uchetPopitok);
                }
            });

            sluzhebnoe.pullVLetu = vypolnenie;
            sluzhebnoe.pullVLetuPokolenie = pokolenie;

            return vypolnenie;
        },
        /** Один pull-запрос без учёта single-flight (вызывается только из `zaprositProgress`). */
        async vipolnitZaprosProgress(pokolenie: number, uchetPopitok: boolean): Promise<void> {
            const {prozesId, zadachaId} = this.selectJob;

            if (prozesId === '' || zadachaId === '') {
                return;
            }

            logProgressa('pull прогресса: запрос отправлен', {prozesId, zadachaId, pokolenie});

            const otvet = await UnitiService.poluchitProgressZadachiRunnera({prozesId, zadachaId});

            if (pokolenie !== sluzhebnoe.pokolenie) {
                // Задачу успели переключить/закрыть — ответ уже не актуален.
                logProgressaPreduprezhdenie('pull прогресса: ответ отброшен, поколение устарело', {
                    pokolenie,
                    aktualno: sluzhebnoe.pokolenie,
                });

                return;
            }

            if (otvet.status === 'success') {
                logProgressa('pull прогресса: ответ успешен', {
                    updatedAt: otvet.data.updatedAt,
                    kolichestvoShagov: otvet.data.steps.length,
                    finished: otvet.data.finished,
                    rezultatPrimeneniya: this.primenitProgress(otvet.data),
                });

                if (otvet.data.updatedAt === 0) {
                    await this.primenitDannieIzBazi(pokolenie);
                }

                return;
            }

            if (otvet.status === 'error') {
                // Ошибка конверта не лечится повтором.
                logProgressaPreduprezhdenie('pull прогресса: ошибка конверта, перехожу в readonly', {
                    soobshenie: otvet.message,
                });

                this.oshibkaOtBackenda = otvet.message;
                this.pereytiVRezhimTolkoChtenie();

                return;
            }

            const soobshenie = otvet.data.message;
            this.oshibkaOtBackenda = soobshenie;

            if (etoOshibkaChuzhoyZadachi(soobshenie)) {
                // Чужая задача: повторять бессмысленно, только ручное обновление.
                logProgressaPreduprezhdenie('pull прогресса: задача чужая, перехожу в readonly', {soobshenie});
                this.pereytiVRezhimTolkoChtenie();

                return;
            }

            if (!uchetPopitok) {
                logProgressaPreduprezhdenie('pull прогресса: фоновый запрос без учёта попыток не удался', {soobshenie});

                return;
            }

            this.pullRetryCount += 1;

            logProgressaPreduprezhdenie(`pull прогресса не удался (попытка ${this.pullRetryCount}/${MAKSIMUM_POPITOK_PULL})`, {
                soobshenie,
            });

            if (this.pullRetryCount >= MAKSIMUM_POPITOK_PULL) {
                this.pereytiVRezhimTolkoChtenie();

                return;
            }

            this.zaplanirovatPovtorPull(pokolenie, this.pullRetryCount);
        },
        /**
         * Добрать шаги из БД, когда push-снапшота нет.
         *
         * Актуально для завершённых задач (прогресс живёт в KV 2 часа, задачи —
         * дольше) и для случая, когда раннер вообще не присылал прогресс.
         */
        async primenitDannieIzBazi(pokolenie: number): Promise<void> {
            if (pokolenie !== sluzhebnoe.pokolenie) {
                return;
            }

            if (!zadachaTerminalnaya(naitiZadachuVSpiske(this.spisok, this.selectJob))) {
                return;
            }

            const {prozesId, zadachaId} = this.selectJob;
            const otvet = await UnitiService.poluchitShagiZadachiRunnera({prozesId, zadachaId});

            if (pokolenie !== sluzhebnoe.pokolenie) {
                return;
            }

            if (otvet.status === 'success') {
                this.selectJob = {...this.selectJob, steps: otvet.data};
                this.pereytiVRezhimTolkoChtenie();

                return;
            }

            this.oshibkaOtBackenda = otvet.status === 'fail' ? otvet.data.message : otvet.message;
            this.pereytiVRezhimTolkoChtenie();
        },
        /**
         * Ручное обновление прогресса (кнопка «Обновить»).
         *
         * Сбрасывает счётчик попыток: пользователь явно попросил ещё раз.
         */
        async obnovitProgressVruchnuyu(): Promise<void> {
            if (this.selectJob.zadachaId === '') {
                return;
            }

            logProgressa('ручное обновление прогресса', {
                podpiskaEst: sluzhebnoe.podpiska !== null,
                channelState: this.channelState,
            });

            this.pullRetryCount = 0;
            this.oshibkaOtBackenda = null;

            if (sluzhebnoe.podpiska === null) {
                // Наблюдение было закрыто (finished, чужая задача, исчерпаны ретраи) — поднимаем заново.
                this.podpisatsyaNaProgress();
            } else if (this.channelState === 'readonly') {
                this.channelState = sluzhebnoe.klient?.state === State.Connected ? 'live' : 'reconnecting';
            }

            await this.zaprositProgress(sluzhebnoe.pokolenie);
        },
        /** Отписаться и зафиксировать режим «только чтение». */
        pereytiVRezhimTolkoChtenie() {
            logProgressa(`переход в readonly: канал ${sluzhebnoe.kanal ?? 'нет'} снимается`);

            this.otpisatsyaOtProgressa();
            this.channelState = 'readonly';
        },
        /** Закрыть наблюдение после `finished: true` и один раз обновить список задач. */
        zavershitNablyudenie() {
            const byloNablyudenie = sluzhebnoe.podpiska !== null;

            logProgressa(
                `наблюдение завершено (${byloNablyudenie ? 'канал снят' : 'подписки уже не было'}), `
                + `дальнейшие публикации приходить не будут`,
                {kanal: sluzhebnoe.kanal},
            );

            if (byloNablyudenie) {
                this.otpisatsyaOtProgressa();
            }

            this.channelState = 'readonly';

            if (byloNablyudenie) {
                void this.obnovitSpisokZadach();
            }
        },
        /** Pull после `subscribed` с задержкой — гасит гонку подписки и публикации. */
        zaplanirovatPullPoslePodpiski(pokolenie: number) {
            this.otmenitTajmerPullPoslePodpiski();

            sluzhebnoe.tajmerPullPoslePodpiski = setTimeout(() => {
                sluzhebnoe.tajmerPullPoslePodpiski = null;

                if (pokolenie !== sluzhebnoe.pokolenie) {
                    return;
                }

                void this.zaprositProgress(pokolenie);
            }, ZADERZHKA_PULL_POSLE_PODPISKI);
        },
        /** Запланировать повтор pull с экспоненциальной задержкой и джиттером. */
        zaplanirovatPovtorPull(pokolenie: number, nomerPopitki: number) {
            const indeks = Math.min(nomerPopitki - 1, ZADERZHKI_POVTORA_PULL.length - 1);
            const zaderzhka = ZADERZHKI_POVTORA_PULL[indeks] + Math.floor(Math.random() * DZHITTER_POVTORA_PULL[indeks]);

            if (sluzhebnoe.tajmerPovtoraPull !== null) {
                clearTimeout(sluzhebnoe.tajmerPovtoraPull);
                sluzhebnoe.tajmerPovtoraPull = null;
            }

            sluzhebnoe.tajmerPovtoraPull = setTimeout(() => {
                sluzhebnoe.tajmerPovtoraPull = null;

                if (pokolenie !== sluzhebnoe.pokolenie) {
                    return;
                }

                void this.zaprositProgress(pokolenie);
            }, zaderzhka);
        },
        /** Снять таймеры pull-запросов. */
        otmenitTajmeriPull() {
            this.otmenitTajmerPullPoslePodpiski();

            if (sluzhebnoe.tajmerPovtoraPull !== null) {
                clearTimeout(sluzhebnoe.tajmerPovtoraPull);
                sluzhebnoe.tajmerPovtoraPull = null;
            }
        },
        /** Снять таймер отложенного pull после подписки. */
        otmenitTajmerPullPoslePodpiski() {
            if (sluzhebnoe.tajmerPullPoslePodpiski !== null) {
                clearTimeout(sluzhebnoe.tajmerPullPoslePodpiski);
                sluzhebnoe.tajmerPullPoslePodpiski = null;
            }
        },
        /**
         * Фоновое обновление списка процессов/задач.
         *
         * Не трогает выбранную задачу: в отличие от `poluchitVipolnenieZadachiRunnera`
         * не сбрасывает список и не переключает выбор, поэтому не рвёт наблюдение.
         */
        async obnovitSpisokZadach(): Promise<void> {
            const unitId = this.unitId;

            if (unitId === null || sluzhebnoe.obnovlenieSpiskaIdet) {
                return;
            }

            sluzhebnoe.obnovlenieSpiskaIdet = true;

            try {
                const otvet = await UnitiService.poluchitVipolnenieZadachiRunnera({id: unitId});

                // Окно закрыли или открыли для другого юнита — ответ устарел.
                if (otvet.status === 'success' && this.unitId === unitId) {
                    this.spisok = otvet.data;
                }
            } finally {
                sluzhebnoe.obnovlenieSpiskaIdet = false;
            }
        },
        otkritOkno(id: string) {
            this.otpisatsyaOtProgressa();

            this.spisok = [];
            this.unitId = id;
            this.oshibkaOtBackenda = null;
            this.loader = false;

            this.sbrositProgress();
            this.podpisatsyaNaSobitiyaUnita();
        },
        zakritOkno() {
            this.otpisatsyaOtSobitiyUnita();
            this.otpisatsyaOtProgressa();

            this.spisok = [];
            this.unitId = null;

            this.sbrositProgress();
        },
        /**
         * Подписаться на канал событий юнитов `spisok_unitov`.
         *
         * Тот же канал слушает экран списка юнитов. Реестр подписок общий
         * (`PodpiskaNaSobitiyaUnitov`), поэтому дубль подписки не создаётся,
         * а число слушателей считается на стороне модуля.
         */
        podpisatsyaNaSobitiyaUnita() {
            this.otpisatsyaOtSobitiyUnita();

            sluzhebnoe.otpiskaOtSobitiyUnita = podpisatsyaNaSobitiyaUnitov(
                (sobitiye: ModelForChannelSpisokUnitov) => this.obrabotatSobitiyeUnita(sobitiye),
            );
        },
        /** Снять подписку на события юнитов и отменить отложенную обработку. */
        otpisatsyaOtSobitiyUnita() {
            if (sluzhebnoe.tajmerSobitiyUnita !== null) {
                clearTimeout(sluzhebnoe.tajmerSobitiyUnita);
                sluzhebnoe.tajmerSobitiyUnita = null;
            }

            if (sluzhebnoe.otpiskaOtSobitiyUnita !== null) {
                sluzhebnoe.otpiskaOtSobitiyUnita();
                sluzhebnoe.otpiskaOtSobitiyUnita = null;
            }
        },
        /**
         * Разобрать событие канала и, если оно про открытый юнит, перезапросить данные.
         *
         * Серия событий на одно действие (`OBNOVLEN` + `OBNOVLENA_STATA`) склеивается
         * таймером, поэтому к бэкенду уходит один запрос на пачку.
         */
        obrabotatSobitiyeUnita(sobitiye: ModelForChannelSpisokUnitov) {
            if (!SOBITIYA_OBNOVLENIYA_UNITA.includes(sobitiye.eventType)) {
                logProgressa('событие spisok_unitov проигнорировано: тип не влияет на прогресс', {
                    eventType: sobitiye.eventType,
                    unitId: sobitiye.id,
                });

                return;
            }

            if (sobitiye.id !== this.unitId) {
                logProgressa('событие spisok_unitov проигнорировано: другой юнит', {
                    eventType: sobitiye.eventType,
                    sobitiyeUnitId: sobitiye.id,
                    otkritUnitId: this.unitId,
                });

                return;
            }

            logProgressa('событие spisok_unitov принято: перезапрошу данные', {
                eventType: sobitiye.eventType,
                unitId: sobitiye.id,
            });

            if (sluzhebnoe.tajmerSobitiyUnita !== null) {
                clearTimeout(sluzhebnoe.tajmerSobitiyUnita);
            }

            sluzhebnoe.tajmerSobitiyUnita = setTimeout(() => {
                sluzhebnoe.tajmerSobitiyUnita = null;

                void this.obnovitDanniePoSobitiyu();
            }, ZADERZHKA_OBRABOTKI_SOBITIY_UNITA);
        },
        /**
         * Перезапросить данные по событию об обновлении юнита.
         *
         * Список процессов/задач берётся заново без переключения выбранной задачи,
         * а прогресс выбранной задачи — pull-запросом: задача могла появиться,
         * продвинуться или дойти до терминального состояния.
         */
        async obnovitDanniePoSobitiyu(): Promise<void> {
            const unitId = this.unitId;

            if (unitId === null) {
                return;
            }

            const {prozesId, zadachaId} = this.selectJob;

            await this.obnovitSpisokZadach();

            // Окно закрыли или открыли для другого юнита — ответ устарел.
            if (this.unitId !== unitId) {
                return;
            }

            if (prozesId === '' || zadachaId === '') {
                return;
            }

            const zadacha = naitiZadachuVSpiske(this.spisok, {prozesId, zadachaId});

            if (zadacha === null) {
                // Выбранная задача исчезла из списка (история процессов пересобралась) —
                // без переключения на существующую задача панель осталась бы пустой.
                const perviyProzes = this.spisok.length > 0 ? this.spisok[0] : null;
                const pervayaZadacha = perviyProzes !== null && perviyProzes.jobs.length > 0
                    ? perviyProzes.jobs[0]
                    : null;

                if (perviyProzes !== null && pervayaZadacha !== null) {
                    await this.select(perviyProzes.id, pervayaZadacha.id);
                }

                return;
            }

            if (!zadachaTerminalnaya(zadacha) && sluzhebnoe.podpiska === null) {
                // Задача снова в работе, а наблюдение за прогрессом было закрыто
                // (завершение прошлого запуска, исчерпанные ретраи) — поднимаем канал.
                // Подписка начинается с нового поколения, поэтому pull идёт по нему.
                this.podpisatsyaNaProgress();

                await this.zaprositProgress(sluzhebnoe.pokolenie, false);

                return;
            }

            // Фоновое обновление не должно наращивать счётчик ретраев.
            await this.zaprositProgress(sluzhebnoe.pokolenie, false);
        },
        /** Сбросить всё, что относится к выбранной задаче (сам список процессов не трогаем). */
        sbrositProgress() {
            this.selectJob = {prozesId: '', zadachaId: '', steps: []};
            this.progress = null;
            this.pullRetryCount = 0;
            this.lastAppliedAt = 0;
            this.channelState = 'readonly';
        },
        async poluchitVipolnenieZadachiRunnera(unitId: string) {
            this.otkritOkno(unitId);
            this.loader = true;

            const otvet = await UnitiService.poluchitVipolnenieZadachiRunnera({id: unitId});

            if (this.unitId !== unitId) {
                // Окно закрыли или открыли для другого юнита, пока шёл запрос.
                return;
            }

            this.loader = false;

            if (otvet.status === 'success') {
                this.spisok = otvet.data;

                const perviyProzes = this.spisok.length > 0 ? this.spisok[0] : null;
                const pervayaZadacha = perviyProzes !== null && perviyProzes.jobs.length > 0 ? perviyProzes.jobs[0] : null;

                if (perviyProzes !== null && pervayaZadacha !== null) {
                    await this.select(perviyProzes.id, pervayaZadacha.id);
                }

                return;
            }

            this.oshibkaOtBackenda = otvet.status === 'fail' ? otvet.data.message : otvet.message;
        },
    }
});

/** Состояние задачи для баннера в UI. */
function sostoyanieProgressa(finished: boolean, success: boolean, kolichestvoShagov: number): SostoyanieZadachi {
    if (finished) {
        return success ? 'success' : 'error';
    }

    return kolichestvoShagov > 0 ? 'running' : 'waiting';
}
