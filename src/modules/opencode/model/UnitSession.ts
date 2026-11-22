/**
 * Модели unit-сессии OpenCode.
 *
 * Это самостоятельный агрегат: здесь нет `type`, вложенного workspace и списка
 * юнитов. У сессии ровно один юнит, он же является рабочим каталогом хода.
 */

export type UnitSession = {
    id: string;
    credentialId: string;
    title: string;
    externalSessionId: string | null;
    unitId: string;
    unitProjectId: string;
    archived: boolean;
    archiveReason: string | null;
    createdAt: number;
    updatedAt: number;
};

export type UnitSessionTurnResult = {
    Kind: "ANSWER" | "QUESTION" | "ERROR";
    Answer?: string | null;
    Questions?: UnitSessionQuestion[];
    ErrorKey?: string | null;
    ErrorMessage?: string | null;
    ExternalSessionId?: string | null;
};

export type UnitSessionQuestion = {
    Id: string;
    Text: string;
    AllowFreeText: boolean;
    Options?: UnitSessionQuestionOption[];
};

export type UnitSessionQuestionOption = {
    Id: string;
    Label: string;
    Description?: string | null;
};

export type UnitSessionTurn = {
    id: string;
    sessionId: string;
    seq: number;
    workflowId: string;
    status: "RUNNING" | "ANSWERED" | "AWAITING_INPUT" | "FAILED";
    requestText: string;
    answers: UnitSessionAnswer[];
    result: UnitSessionTurnResult | null;
    errorKey: string | null;
    createdAt: number;
    finishedAt: number | null;
};

export type UnitSessionAnswer = {
    QuestionId: string;
    OptionId: string | null;
    Text: string | null;
};

export type UnitSessionNotification = {
    id: string;
    sessionId: string;
    turnId: string;
    sessionTitle: string;
    status: UnitSessionTurn["status"];
    kind: UnitSessionTurnResult["Kind"] | null;
    createdAt: number;
};

export type UnitSessionState = {
    sessionId: string;
    unitId: string;
    unitProjectId: string;
    archived: boolean;
    archiveReason: string | null;
    canAcceptMessages: boolean;
    unit: {
        unitId: string;
        unitProjectId: string;
        code: string | null;
        group: "ready" | "blocked" | "archived";
        archived: boolean;
        ready: boolean;
    } | null;
    redaktirovanieVklucheno: boolean;
    vetkaZashishena: boolean;
    mozhnoRedaktirovat: boolean;
    readOnlyReason: "edit_disabled" | "protected_branch" | "no_token" | "not_editor" | null;
};

export type UnitSessionLaunch = {
    id: string;
    status: UnitSessionTurn["status"];
    progressChannel: string;
};
