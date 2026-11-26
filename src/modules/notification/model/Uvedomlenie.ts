/** Уровень важности уведомления. */
export type UrovenVazhnosti = "info" | "attention" | "critical";

/** Тип уведомления. */
export type TipUvedomleniya =
  | "runner_threat"
  | "unit_started"
  | "account_activation_request";

/** Данные уведомления об угрозе раннера. */
export type PayloadUgrozыRannera = {
  runnerId?: string;
  hostname?: string;
  level?: string;
  memoryUsedPercent?: number;
  disks?: Array<{
    path?: string;
    usedPercent?: number;
    level?: string;
  }>;
  blocked?: boolean;
  blockReason?: string | null;
  collectedAt?: number;
};

/** Данные уведомления о запуске юнита. */
export type PayloadZapuskaUnita = {
  unitId?: string;
  unitName?: string;
  projectId?: string;
  branch?: string;
  jobId?: string;
  startedAt?: number;
};

/** Данные заявки на активацию аккаунта. */
export type PayloadZaprosaAktivacii = {
  accountId?: string;
  email?: string;
  nickname?: string | null;
};

export type PayloadUvedomleniya = PayloadUgrozыRannera &
  PayloadZapuskaUnita &
  PayloadZaprosaAktivacii &
  Record<string, unknown>;

/** Уведомление текущего пользователя. */
export type Uvedomlenie = {
  id: string;
  type: TipUvedomleniya;
  severity: UrovenVazhnosti;
  requiresRead: boolean;
  payload: PayloadUvedomleniya;
  createdAt: number;
  read: boolean;
};

/** Ответ списка уведомлений. */
export type SpisokUvedomleniy = {
  items: Uvedomlenie[];
  unreadCount: number;
};

/** Настройка типа уведомления. */
export type NastroikaUvedomleniya = {
  type: TipUvedomleniya;
  enabled: boolean;
  severity: UrovenVazhnosti;
  adminOnly: boolean;
  system: boolean;
  canDisable: boolean;
};

const UROVNI: readonly string[] = ["info", "attention", "critical"];
const TIPI: readonly string[] = [
  "runner_threat",
  "unit_started",
  "account_activation_request",
];

/** Проверка формы уведомления из ответа API. */
export function pohozheNaUvedomlenie(value: unknown): value is Uvedomlenie {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.type === "string" &&
    TIPI.includes(item.type) &&
    typeof item.severity === "string" &&
    UROVNI.includes(item.severity) &&
    typeof item.requiresRead === "boolean" &&
    typeof item.createdAt === "number" &&
    typeof item.read === "boolean" &&
    !!item.payload &&
    typeof item.payload === "object"
  );
}

/** Проверка формы списка уведомлений. */
export function pohozheNaSpisok(value: unknown): value is SpisokUvedomleniy {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    Array.isArray(data.items) &&
    data.items.every(pohozheNaUvedomlenie) &&
    typeof data.unreadCount === "number"
  );
}

/** Проверка формы настройки типа. */
export function pohozheNaNastroiku(value: unknown): value is NastroikaUvedomleniya {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.type === "string" &&
    TIPI.includes(item.type) &&
    typeof item.enabled === "boolean" &&
    typeof item.severity === "string" &&
    UROVNI.includes(item.severity) &&
    typeof item.adminOnly === "boolean" &&
    typeof item.system === "boolean" &&
    typeof item.canDisable === "boolean"
  );
}
