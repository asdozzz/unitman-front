import {defineStore} from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import {
    hodVProzesse,
    normalizovatVoprosy,
    pohozheNaProgress,
    type OtvetOpenCode,
    type ProgressHodaOpenCode,
    type VoprosOpenCode,
} from "@/modules/opencode/model/ChatOpenCode";
import {podpisatsyaNaProgressHoda} from "@/modules/opencode/model/websocket/PodpiskaNaProgressHoda";
import type {Schema} from "@/api/types";

/** Как сейчас приходят данные о шагах: через websocket, опросом или никак. */
export type RezhimProgressa = "live" | "polling" | "offline";

type StorChataOpenCodeState = {
    sessiyaId: string | null;
    hody: Schema<"OpenCodeTurn">[];
    progress: ProgressHodaOpenCode | null;
    rezhimProgressa: RezhimProgressa;
    loaderIstorii: boolean;
    oshibkaIstorii: string | null;
    otpravka: boolean;
    oshibkaOtpravki: string | null;
    /**
     * Поколение наблюдения.
     *
     * Каждый переход к другой сессии или новый запущенный ход увеличивает
     * счётчик. Асинхронные ответы сверяют его со своим снимком и молча
     * отбрасываются, если поколение уже сменилось: иначе опоздавший ответ
     * старого опроса перезаписал бы состояние новой сессии.
     */
    nomerZapuska: number;
};

/**
 * Стор чата OpenCode.
 *
 * Живой прогресс приходит двумя путями одновременно: подписка на канал
 * (`progressChannel` из ответа бэкенда) и опрос `poluchitProgressHoda`.
 * Это сделано осознанно: websocket может быть недоступен или пропустить
 * публикацию, а опрос — не даёт мгновенной реакции. Кто пришёл первым,
 * тот и обновил состояние.
 */
export const useStorChataOpenCode = defineStore("StorChataOpenCode", {
    state: (): StorChataOpenCodeState => {
        return {
            sessiyaId: null,
            hody: [],
            progress: null,
            rezhimProgressa: "offline",
            loaderIstorii: false,
            oshibkaIstorii: null,
            otpravka: false,
            oshibkaOtpravki: null,
            nomerZapuska: 0,
        };
    },

    getters: {
        /** Последний ход: по нему определяется, ждёт ли бэкенд ответа. */
        posledniyHod(state): Schema<"OpenCodeTurn"> | null {
            return state.hody.length === 0 ? null : state.hody[state.hody.length - 1];
        },

        /** Вопросы, на которые пользователь должен ответить прямо сейчас. */
        voprosy(): VoprosOpenCode[] {
            const hod = this.posledniyHod;

            if (hod === null || hod.status !== "AWAITING_INPUT") {
                return [];
            }

            return normalizovatVoprosy(hod.result?.Questions);
        },

        /** Ход идёт: интерфейс блокирует отправку нового промпта. */
        hodVipolnyaetsya(): boolean {
            const hod = this.posledniyHod;

            return hod !== null && hodVProzesse(hod.status);
        },
    },

    actions: {
        /**
         * Открыть сессию и восстановить наблюдение за её последним ходом.
         *
         * После перезагрузки страницы идентификатор хода и имя канала берутся
         * из истории: бэкенд возвращает их в каждом ходе, поэтому заново
         * запускать ничего не нужно.
         */
        async otkritSessiyu(sessiyaId: string) {
            this.sessiyaId = sessiyaId;
            return this.perezagruzitSessiyu();
        },

        /** Перечитать историю и заново поднять наблюдение за незавершённым ходом. */
        async perezagruzitSessiyu() {
            this.ostanovitNablyudenie();

            this.nomerZapuska += 1;
            this.hody = [];
            this.progress = null;

            const nomer = this.nomerZapuska;

            await this.zagruzitIstoriyu();

            if (nomer !== this.nomerZapuska) {
                return;
            }

            const hod = this.posledniyHod;

            if (hod !== null && hodVProzesse(hod.status)) {
                this.nachatNablyudenie(hod.id, hod.progressChannel);
            }
        },

        /** Снять таймеры и подписку текущего наблюдения. */
        ostanovitNablyudenie() {
            ostanovitAktivnoeNablyudenie();
            this.rezhimProgressa = "offline";
        },

        async zagruzitIstoriyu() {
            const sessiyaId = this.sessiyaId;

            if (sessiyaId === null) {
                return;
            }

            const nomer = this.nomerZapuska;
            this.loaderIstorii = true;
            this.oshibkaIstorii = null;

            const response = await OpenCodeService.istoriyaSessii({sessionId: sessiyaId});

            if (nomer !== this.nomerZapuska) {
                return;
            }

            this.loaderIstorii = false;

            if (response.status === "success") {
                this.hody = response.data;
            } else if (response.status === "fail") {
                this.oshibkaIstorii = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaIstorii = response.message;
            }
        },

        /** Отправить промпт в текущую сессию. */
        async otpravitPrompt(text: string) {
            const sessiyaId = this.sessiyaId;
            const soderzhanie = text.trim();

            if (sessiyaId === null || soderzhanie === "" || this.otpravka) {
                return;
            }

            await this.zapustitHod(
                () => OpenCodeService.prompt({sessionId: sessiyaId, text: soderzhanie}),
            );
        },

        /** Ответить на вопросы текущего хода. */
        async otvetit(otvety: OtvetOpenCode[]) {
            const hod = this.posledniyHod;

            if (hod === null || otvety.length === 0 || this.otpravka) {
                return;
            }

            await this.zapustitHod(
                () => OpenCodeService.otvetit({turnId: hod.id, answers: otvety}),
            );
        },

        /**
         * Общий путь запуска хода: запрос → перезагрузка истории → наблюдение.
         *
         * `otvetit` тоже запускает новый ход (со своим `progressChannel`),
         * поэтому оба сценария ведут себя одинаково.
         */
        async zapustitHod(zapros: () => ReturnType<typeof OpenCodeService.prompt>) {
            this.otpravka = true;
            this.oshibkaOtpravki = null;

            // Новое поколение: опоздавшие ответы прежнего наблюдения уже не нужны.
            this.ostanovitNablyudenie();
            this.nomerZapuska += 1;

            const nomer = this.nomerZapuska;
            const response = await zapros();

            if (nomer !== this.nomerZapuska) {
                return;
            }

            this.otpravka = false;

            if (response.status !== "success") {
                this.oshibkaOtpravki = response.status === "fail" ? response.data.message : response.message;
                return;
            }

            const zapusk = response.data;
            this.progress = null;

            // История даёт текст запроса и seq хода, которых нет в ответе запуска.
            await this.zagruzitIstoriyu();

            if (nomer !== this.nomerZapuska) {
                return;
            }

            this.nachatNablyudenie(zapusk.turnId, zapusk.progressChannel);
        },

        /**
         * Подписаться на канал прогресса и запустить оба опроса.
         *
         * @param turnId идентификатор хода для pull-запросов
         * @param kanal значение `progressChannel` ровно как его вернул бэкенд:
         *        формат имени канала — внутреннее дело бэкенда.
         */
        nachatNablyudenie(turnId: string, kanal: string) {
            ostanovitAktivnoeNablyudenie();

            const nablyudenie: Nablyudenie = {
                nomer: this.nomerZapuska,
                prekrashcheno: false,
                taimerProgressa: null,
                taimerResultata: null,
                otpiska: null,
            };

            aktivnoeNablyudenie = nablyudenie;

            // Подписка сама по себе не гарантирует событий, поэтому идёт
            // параллельно с опросом, а не вместо него.
            nablyudenie.otpiska = podpisatsyaNaProgressHoda(kanal, (progress: ProgressHodaOpenCode) => {
                if (nablyudenie.prekrashcheno || nablyudenie.nomer !== this.nomerZapuska) {
                    return;
                }

                this.progress = progress;
                this.rezhimProgressa = "live";
            });

            this.rezhimProgressa = "polling";

            oprosProgressa(this, nablyudenie, turnId, 0);
            oprosResultata(this, nablyudenie, turnId, 0);
        },
    },
});

type StorChata = ReturnType<typeof useStorChataOpenCode>;

/**
 * Одно наблюдение за одним ходом.
 *
 * Таймеры и отписка не хранятся в реактивном состоянии стора: они не
 * сериализуемы, а реактивность им не нужна. Объект наблюдения заодно служит
 * флагом отмены — все асинхронные продолжения сверяются с `prekrashcheno`.
 */
type Nablyudenie = {
    nomer: number;
    prekrashcheno: boolean;
    taimerProgressa: ReturnType<typeof setTimeout> | null;
    taimerResultata: ReturnType<typeof setTimeout> | null;
    otpiska: (() => void) | null;
};

let aktivnoeNablyudenie: Nablyudenie | null = null;

function ostanovitAktivnoeNablyudenie(): void {
    const nablyudenie = aktivnoeNablyudenie;

    if (nablyudenie === null) {
        return;
    }

    nablyudenie.prekrashcheno = true;

    if (nablyudenie.taimerProgressa !== null) {
        clearTimeout(nablyudenie.taimerProgressa);
        nablyudenie.taimerProgressa = null;
    }

    if (nablyudenie.taimerResultata !== null) {
        clearTimeout(nablyudenie.taimerResultata);
        nablyudenie.taimerResultata = null;
    }

    if (nablyudenie.otpiska !== null) {
        nablyudenie.otpiska();
        nablyudenie.otpiska = null;
    }

    aktivnoeNablyudenie = null;
}

/** Пауза до следующего опроса: от 1 с, не чаще 5 с. */
function zaderzhkaOprosa(popitka: number): number {
    return Math.min(1000 * Math.pow(1.5, popitka), 5000);
}

function nablyudenieAktivno(nablyudenie: Nablyudenie, stor: StorChata): boolean {
    return !nablyudenie.prekrashcheno && nablyudenie.nomer === stor.nomerZapuska;
}

/**
 * Опрос прогресса хода.
 *
 * `null` в ответе — нормальное состояние «прогресса ещё нет», а не ошибка,
 * поэтому уже показанные шаги не стираются.
 */
function oprosProgressa(stor: StorChata, nablyudenie: Nablyudenie, turnId: string, popitka: number): void {
    nablyudenie.taimerProgressa = setTimeout(async () => {
        if (!nablyudenieAktivno(nablyudenie, stor)) {
            return;
        }

        const response = await OpenCodeService.poluchitProgressHoda({turnId});

        if (!nablyudenieAktivno(nablyudenie, stor)) {
            return;
        }

        if (response.status === "success" && pohozheNaProgress(response.data)) {
            stor.progress = response.data;

            if (stor.rezhimProgressa !== "live") {
                stor.rezhimProgressa = "polling";
            }
        }

        // Пока ход идёт, продолжаем: подписка могла не сработать или отвалиться.
        if (stor.hodVipolnyaetsya) {
            oprosProgressa(stor, nablyudenie, turnId, popitka + 1);
        }
    }, zaderzhkaOprosa(popitka));
}

/**
 * Опрос результата хода.
 *
 * Как только статус перестал быть `RUNNING`, ход закончился и история
 * перезагружается целиком: в ней есть и `result`, и `answers`, и итоговый
 * статус — собирать ответ из отдельных полей не нужно.
 */
function oprosResultata(stor: StorChata, nablyudenie: Nablyudenie, turnId: string, popitka: number): void {
    nablyudenie.taimerResultata = setTimeout(async () => {
        if (!nablyudenieAktivno(nablyudenie, stor)) {
            return;
        }

        const response = await OpenCodeService.poluchitResultatHoda({turnId});

        if (!nablyudenieAktivno(nablyudenie, stor)) {
            return;
        }

        if (response.status !== "success") {
            // Сетевую ошибку не показываем как ошибку чата: следующая попытка повторит.
            oprosResultata(stor, nablyudenie, turnId, popitka + 1);
            return;
        }

        if (hodVProzesse(response.data.status)) {
            oprosResultata(stor, nablyudenie, turnId, popitka + 1);
            return;
        }

        await stor.zagruzitIstoriyu();

        if (!nablyudenieAktivno(nablyudenie, stor)) {
            return;
        }

        // Последний снимок прогресса: после завершения хода публикаций уже не будет.
        const progress = await OpenCodeService.poluchitProgressHoda({turnId});

        if (nablyudenieAktivno(nablyudenie, stor) && progress.status === "success" && pohozheNaProgress(progress.data)) {
            stor.progress = progress.data;
        }

        if (nablyudenieAktivno(nablyudenie, stor)) {
            stor.rezhimProgressa = "offline";
        }
    }, zaderzhkaOprosa(popitka));
}
