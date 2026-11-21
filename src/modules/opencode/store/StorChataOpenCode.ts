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
import {statusTranzitniy} from "@/modules/opencode/model/Workspace";
import type {Schema} from "@/api/types";

/** Как сейчас приходят данные о шагах: через websocket, опросом или никак. */
export type RezhimProgressa = "live" | "polling" | "offline";

/** Тип открытой сессии: обычная unit-сессия или workspace. */
export type TipSessiiChata = "unit" | "workspace";

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
    /**
     * Тип открытой сессии; `null` — тип ещё не определён.
     *
     * Workspace и unit-сессия делят маршрут чата и историю, но по-разному
     * решают, можно ли отправлять сообщения.
     */
    rezhimSessii: TipSessiiChata | null;
    /** Состояние workspace для workspace-сессии; `null` для unit-сессии. */
    workspace: Schema<"SostoyanieWorkspace"> | null;
    /** Ошибка загрузки состояния workspace (например, operation_failed). */
    oshibkaSostoyaniyaWorkspace: string | null;
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
            rezhimSessii: null,
            workspace: null,
            oshibkaSostoyaniyaWorkspace: null,
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

        /** Открыта workspace-сессия. */
        estWorkspace(): boolean {
            return this.rezhimSessii === "workspace";
        },

        /**
         * Можно ли отправить новый промпт.
         *
         * Для unit-сессии решает только идущий ход (архив проверяет экран).
         * Для workspace бэкенд отдаёт `canAcceptMessages`: он учитывает статус
         * жизненного цикла, архив и последний ход.
         */
        mozhnoOtpravlyat(): boolean {
            if (this.hodVipolnyaetsya) {
                return false;
            }

            if (this.rezhimSessii !== "workspace") {
                return true;
            }

            return this.workspace?.canAcceptMessages === true;
        },
    },

    actions: {
        /**
         * Открыть сессию и восстановить наблюдение за её последним ходом.
         *
         * @param tip тип сессии, если он уже известен (из списка или
         *   уведомления) — тогда probe-запрос не нужен.
         *
         * После перезагрузки страницы идентификатор хода и имя канала берутся
         * из истории: бэкенд возвращает их в каждом ходе, поэтому заново
         * запускать ничего не нужно.
         */
        async otkritSessiyu(sessiyaId: string, tip: TipSessiiChata | null = null) {
            this.sessiyaId = sessiyaId;
            this.rezhimSessii = tip;
            this.workspace = null;
            this.oshibkaSostoyaniyaWorkspace = null;
            this.ostanovitOprosSostoyaniyaWorkspace();

            if (this.rezhimSessii === null) {
                await this.opredelitTipSessii();
            }

            await this.perezagruzitSessiyu();

            if (this.rezhimSessii === "workspace") {
                await this.obnovitSostoyanieWorkspace();
            }
        },

        /**
         * Определить тип сессии probe-запросом.
         *
         * Workspace отвечает состоянием, unit-сессия — ошибкой
         * `opencode.workspace.not_found`. Любая ошибка означает unit-сессию:
         * для истории и ходов состояние unit-сессии не нужно.
         */
        async opredelitTipSessii() {
            const sessiyaId = this.sessiyaId;

            if (sessiyaId === null) {
                this.rezhimSessii = "unit";
                return;
            }

            const response = await OpenCodeService.sostoyanieWorkspace({workspaceId: sessiyaId});

            if (this.sessiyaId !== sessiyaId) {
                return;
            }

            if (response.status === "success") {
                this.rezhimSessii = "workspace";
                this.workspace = response.data;
                this.zaplanirovatOprosSostoyaniyaWorkspace();
                return;
            }

            this.rezhimSessii = "unit";
        },

        /**
         * Перечитать состояние workspace.
         *
         * Пока статус транзитный (контейнер создаётся, архивируется или
         * удаляется), опрос повторяется. Переход в `RUNNING` означает, что
         * бэкенд запустил первый промпт — историю нужно перечитать, чтобы
         * показать его ход.
         */
        async obnovitSostoyanieWorkspace() {
            const sessiyaId = this.sessiyaId;

            if (sessiyaId === null || this.rezhimSessii !== "workspace") {
                return;
            }

            this.ostanovitOprosSostoyaniyaWorkspace();

            const response = await OpenCodeService.sostoyanieWorkspace({workspaceId: sessiyaId});

            if (this.sessiyaId !== sessiyaId) {
                return;
            }

            if (response.status !== "success") {
                this.oshibkaSostoyaniyaWorkspace = response.status === "fail" ? response.data.message : response.message;
                return;
            }

            this.oshibkaSostoyaniyaWorkspace = null;

            const bilStatus = this.workspace?.status ?? null;
            this.workspace = response.data;

            this.zaplanirovatOprosSostoyaniyaWorkspace();

            if (bilStatus !== "RUNNING" && response.data.status === "RUNNING") {
                await this.perezagruzitSessiyu();
            }
        },

        /** Восстановить архивный workspace или workspace в ошибке. */
        async vosstanovitWorkspace() {
            const sessiyaId = this.sessiyaId;

            if (sessiyaId === null) {
                return;
            }

            const response = await OpenCodeService.vosstanovitWorkspace({workspaceId: sessiyaId});

            if (response.status !== "success") {
                this.oshibkaSostoyaniyaWorkspace = response.status === "fail" ? response.data.message : response.message;
                return;
            }

            await this.obnovitSostoyanieWorkspace();
        },

        /** Удалить workspace. Возвращает `false`, если бэкенд отказал. */
        async udalitWorkspace(): Promise<boolean> {
            const sessiyaId = this.sessiyaId;

            if (sessiyaId === null) {
                return false;
            }

            const response = await OpenCodeService.udalitWorkspace({workspaceId: sessiyaId});

            if (response.status !== "success") {
                this.oshibkaSostoyaniyaWorkspace = response.status === "fail" ? response.data.message : response.message;
                return false;
            }

            await this.obnovitSostoyanieWorkspace();

            return true;
        },

        /** Запланировать опрос состояния, пока статус workspace транзитный. */
        zaplanirovatOprosSostoyaniyaWorkspace() {
            this.ostanovitOprosSostoyaniyaWorkspace();

            const status = this.workspace?.status;

            if (status === undefined || !statusTranzitniy(status)) {
                return;
            }

            tajmerSostoyaniyaWorkspace = setTimeout(() => {
                tajmerSostoyaniyaWorkspace = null;
                void this.obnovitSostoyanieWorkspace();
            }, PAUZA_SOSTOYANIYA_WORKSPACE);
        },

        /** Снять таймер опроса состояния workspace. */
        ostanovitOprosSostoyaniyaWorkspace() {
            if (tajmerSostoyaniyaWorkspace !== null) {
                clearTimeout(tajmerSostoyaniyaWorkspace);
                tajmerSostoyaniyaWorkspace = null;
            }
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

/** Таймер опроса состояния workspace; не реактивен, как и остальные таймеры. */
let tajmerSostoyaniyaWorkspace: ReturnType<typeof setTimeout> | null = null;

/** Пауза между опросами состояния workspace в транзитном статусе, мс. */
const PAUZA_SOSTOYANIYA_WORKSPACE = 4000;

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

            // Ход завершён: у workspace мог измениться canAcceptMessages
            // (последний ход больше не RUNNING).
            if (stor.rezhimSessii === "workspace") {
                void stor.obnovitSostoyanieWorkspace();
            }
        }
    }, zaderzhkaOprosa(popitka));
}
