/**
 * Модели workspace-сессии OpenCode.
 *
 * Workspace — самостоятельный агрегат. У него нет юнитов и нет поля `type`.
 */
import type { Schema } from "@/api/types";

export type WorkspaceStatus =
    | "CREATING"
    | "STARTING"
    | "RUNNING"
    | "ARCHIVING"
    | "ARCHIVED"
    | "DELETING"
    | "ERROR";

export type WorkspaceProject = {
    projectId: string;
    projectName: string;
    projectCode: string;
    canPush: boolean;
    positionIndex: number;
    branch: string;
};

/** Роль текущего пользователя (или участника) в workspace. */
export type RolUchastnikaWorkspace = "owner" | "writer" | "viewer";

export type WorkspaceSession = {
    id: string;
    name: string;
    /** Модель сессии; `null` — дефолт реквизитов. */
    model?: string | null;
    branch: string;
    status: WorkspaceStatus;
    readOnly: boolean;
    archived: boolean;
    archiveReason: string | null;
    errorKey: string | null;
    projects: WorkspaceProject[];
    ideLink: string | null;
    createdAt: number;
    updatedAt: number;
    /** Роль текущего пользователя; у старых ответов поля нет. */
    myRole?: RolUchastnikaWorkspace;
    /** Аккаунт владельца workspace. */
    ownerAccountId?: string;
    /** Количество участников, включая владельца. */
    participantsCount?: number;
    /** `true` — workspace доступен более чем одному участнику. */
    shared?: boolean;
};

/**
 * Участник workspace: роль и личные реквизиты ходов.
 *
 * Форма совпадает со схемой `UchastnikSessii`, поэтому тип берётся из
 * сгенерированной OpenAPI-схемы.
 */
export type WorkspaceParticipant = Schema<"UchastnikSessii">;

export type WorkspaceTurnResult = {
    Kind: "ANSWER" | "QUESTION" | "ERROR";
    Answer?: string | null;
    Questions?: WorkspaceQuestion[];
    /** Файлы-артефакты хода; у легаси-ходов поля нет. */
    Attachments?: WorkspaceAttachment[];
    ErrorKey?: string | null;
    ErrorMessage?: string | null;
    ExternalSessionId?: string | null;
};

/**
 * Артефакт, созданный ходом ассистента.
 *
 * Форма полностью совпадает с компонентом `VlozhenieHoda` из OpenAPI
 * (метаданные `RezultatHodaOpenCode::$Attachments`), поэтому тип берётся из
 * сгенерированной схемы, а не пишется руками.
 */
export type WorkspaceAttachment = Schema<"VlozhenieHoda">;

/** Ответ `POST /opencode/fajl/ssylka` (схема `FajlHodaSsilka`). */
export type FajlHodaSsilka = Schema<"FajlHodaSsilka">;

/** Ответ `POST /opencode/fajl/tekst` (схема `FajlHodaTekst`). */
export type FajlHodaTekst = Schema<"FajlHodaTekst">;

export type WorkspaceQuestion = {
    Id: string;
    Text: string;
    AllowFreeText: boolean;
    Options?: WorkspaceQuestionOption[];
};

export type WorkspaceQuestionOption = {
    Id: string;
    Label: string;
    Description?: string | null;
};

export type WorkspaceTurn = {
    id: string;
    sessionId: string;
    seq: number;
    /** Фактическая модель хода; отсутствует у старых записей. */
    model?: string | null;
    status: "RUNNING" | "ANSWERED" | "AWAITING_INPUT" | "FAILED";
    requestText: string;
    answers: WorkspaceAnswer[];
    result: WorkspaceTurnResult | null;
    errorKey: string | null;
    createdAt: number;
    finishedAt: number | null;
    progressChannel: string;
    /** Аккаунт автора хода; `null`/нет у легаси-ходов без автора. */
    authorAccountId?: string | null;
    /** Отображаемое имя автора хода; `null`/нет у легаси-ходов. */
    authorDisplayName?: string | null;
};

export type WorkspaceAnswer = {
    QuestionId: string;
    OptionId: string | null;
    Text: string | null;
};

export type WorkspaceState = {
    id: string;
    name: string;
    branch: string;
    status: WorkspaceStatus;
    readOnly: boolean;
    archived: boolean;
    archiveReason: string | null;
    errorKey: string | null;
    projects: WorkspaceProject[];
    ideLink: string | null;
    /** Сервер уже учёл роль и занятость: можно ли отправить сообщение. */
    canAcceptMessages: boolean;
    lastTurnId: string | null;
    lastTurnStatus: WorkspaceTurn["status"] | null;
    /** Роль текущего пользователя. */
    myRole?: RolUchastnikaWorkspace;
    /** `true` — текущий пользователь может управлять участниками. */
    canManage?: boolean;
    /** Участники workspace. */
    participants?: WorkspaceParticipant[];
    /** Личные реквизиты текущего участника по умолчанию. */
    myDefaultCredentialId?: string | null;
    /** Модель текущего участника по умолчанию. */
    myDefaultModel?: string | null;
};

export type WorkspaceLaunch = {
    turnId: string;
    status: WorkspaceTurn["status"];
    progressChannel: string;
};

/**
 * Привести результат хода к полной форме.
 *
 * У легаси-ходов поля `Attachments` нет — на экране это должно быть пустым
 * списком, а не `undefined`, иначе проверки длины требуют дополнительных
 * охранных условий в шаблонах.
 */
export function normalizovatRezultatHoda(
    result: WorkspaceTurnResult | null | undefined,
): WorkspaceTurnResult | null {
    if (result === null || result === undefined) {
        return null;
    }

    return {
        ...result,
        Attachments: result.Attachments ?? [],
    };
}

/** Нормализовать ход истории workspace. */
export function normalizovatHodWorkspace(hod: WorkspaceTurn): WorkspaceTurn {
    return {
        ...hod,
        result: normalizovatRezultatHoda(hod.result),
    };
}

/**
 * Описание авторства хода для интерфейса.
 *
 * У легаси-ходов автора нет — для них `bezAvtora = true`, а `imya = null`.
 * Если автор совпадает с текущим пользователем, интерфейс показывает «Вы»,
 * не полагаясь на `authorDisplayName` (он может отсутствовать).
 */
export type AvtorHoda = {
    /** Имя автора из read-модели; `null`, если сервер его не отдал. */
    imya: string | null;
    /** Аккаунт автора; `null` у легаси-ходов. */
    accountId: string | null;
    /** Автор — текущий пользователь. */
    etoTekushiy: boolean;
    /** Ход без автора (легаси). */
    bezAvtora: boolean;
};

export function avtorHoda(
    hod: Pick<WorkspaceTurn, "authorAccountId" | "authorDisplayName">,
    tekushiyAccountId: string | null,
): AvtorHoda {
    const accountId = hod.authorAccountId ?? null;
    const imya = (hod.authorDisplayName ?? "").trim();
    const bezAvtora = accountId === null && imya === "";

    return {
        imya: imya === "" ? null : imya,
        accountId,
        etoTekushiy: accountId !== null && accountId === tekushiyAccountId,
        bezAvtora,
    };
}

export const TRANZITNIE_STATUSY: readonly WorkspaceStatus[] = [
    "CREATING",
    "STARTING",
    "ARCHIVING",
    "DELETING",
];

export function statusTranzitniy(status: WorkspaceStatus): boolean {
    return TRANZITNIE_STATUSY.includes(status);
}
