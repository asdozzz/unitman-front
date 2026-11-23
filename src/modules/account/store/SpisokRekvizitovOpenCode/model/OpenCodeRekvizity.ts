/**
 * Типы реквизитов OpenCode.
 *
 * Основа — сгенерированная OpenAPI-схема (`src/api/generated/unitman.d.ts`,
 * команда `yarn gen:api`). Локальные имена оставлены публичным контрактом
 * модуля, чтобы UI и сторы не зависели от имён компонентов схемы.
 */

import type { ApiRequestBody, ApiResponseData, Schema } from "@/api/types";

/** Коды провайдеров из каталога бэкенда. */
export const KODY_PROVAYDEROV_OPENCODE = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "deepseek",
  "mistral",
  "groq",
  "xai",
  "together",
  "ollama",
  "opencode",
  "opencode-go",
  "custom",
] as const;

export type KodProvayderaOpenCode = (typeof KODY_PROVAYDEROV_OPENCODE)[number];

/** Проверка, что произвольная строка — известный код провайдера. */
export function etoKodProvayderaOpenCode(
  value: string,
): value is KodProvayderaOpenCode {
  return (KODY_PROVAYDEROV_OPENCODE as readonly string[]).includes(value);
}

/** Элемент каталога провайдеров (`GET /account/opencode/providers`). */
export type ProvayderOpenCode = Schema<"ProviderOpenCode">;

/** Реквизиты OpenCode в списке (полный ключ не отдаётся — только маска). */
export type RekvizityOpenCode = Schema<"OpenCodeCredential">;

/** Источник списка моделей в ответе `spisokModelei`. */
export type IstochnikModeleiOpenCode = Schema<"SpisokModelei">["source"];

/** Тело запроса `POST /account/opencode/spisokModelei`. */
export type ZaprosSpiskaModeleiOpenCode = ApiRequestBody<
  "/account/opencode/spisokModelei",
  "post"
>;

/** Ответ `POST /account/opencode/spisokModelei`. */
export type OtvetSpiskaModeleiOpenCode = Schema<"SpisokModelei">;

/** Тело запроса `POST /account/opencode/sozdatRekvizity`. */
export type ZaprosSozdaniyaRekvizitovOpenCode = Schema<"SozdatRekvizityOpenCode">;

/** Тело запроса `POST /account/opencode/izmenitRekvizity` (`null` — не менять). */
export type ZaprosIzmeneniyaRekvizitovOpenCode = Schema<"IzmenitRekvizityOpenCode">;

/** Ответ `POST /account/opencode/sozdatRekvizity` (`IdHolder`). */
export type IdRekvizitovOpenCode = ApiResponseData<
  "/account/opencode/sozdatRekvizity",
  "post"
>;
