/**
 * Хелперы типов поверх сгенерированной OpenAPI-схемы.
 *
 * Схема генерируется командой `yarn gen:api` в {@link ./generated/unitman.d.ts}.
 * Пути в схеме уже без префикса `/api`, потому что он содержится в baseURL apiClient.
 */
import type { components, operations, paths } from "@/api/generated/unitman";

/** HTTP-методы, которые поддерживает apiClient. */
export type ApiMethod = "get" | "post" | "put";

type MethodOperation<P extends keyof paths, M extends ApiMethod> = paths[P] extends Record<M, infer O>
    ? O
    : never;

/** Операция, привязанная к конкретному пути и методу. */
export type ApiOperation<P extends keyof paths, M extends ApiMethod> = MethodOperation<P, M>;

/**
 * Путь из спецификации, у которого объявлен указанный метод.
 *
 * В сгенерированной схеме отсутствующий метод объявлен как `post?: never`,
 * поэтому проверяется именно обязательное наличие ключа.
 */
export type ApiPath<M extends ApiMethod = ApiMethod> = {
    [P in keyof paths]: [MethodOperation<P, M>] extends [never] ? never : P;
}[keyof paths];

/**
 * Тело запроса (`requestBody`).
 * `undefined`, если у операции тела нет — тогда второй аргумент не обязателен.
 */
export type ApiRequestBody<P extends keyof paths, M extends ApiMethod> =
    MethodOperation<P, M> extends {
        requestBody: { content: { "application/json": infer B } };
    }
        ? [B] extends [never]
            ? undefined
            : B
        : undefined;

/** Query-параметры операции (`parameters.query`). */
export type ApiQuery<P extends keyof paths, M extends ApiMethod> =
    MethodOperation<P, M> extends { parameters: { query: infer Q } } ? Q : undefined;

/** Path-параметры операции (`parameters.path`). */
export type ApiPathParams<P extends keyof paths, M extends ApiMethod> =
    MethodOperation<P, M> extends { parameters: { path: infer PP } } ? PP : undefined;

/** Схема успешного ответа (HTTP 200). */
export type ApiResponseBody<P extends keyof paths, M extends ApiMethod> =
    MethodOperation<P, M> extends {
        responses: { 200: { content: { "application/json": infer R } } };
    }
        ? R
        : never;

/**
 * Полезная нагрузка успешного ответа — содержимое поля `data` конверта.
 *
 * Бэкенд отдаёт `{status: "success", data: ...}` либо `{status: "error", ...}`.
 * apiClient разворачивает конверт, поэтому сервису нужен именно `data`.
 *
 * Спецификация описывает `data` обобщённо (`object|null`), поэтому точный тип
 * часто неизвестен. В таком случае возвращается `unknown`, и сервис задаёт тип
 * ответа явно.
 */
export type ApiResponseData<P extends keyof paths, M extends ApiMethod> =
    ApiResponseBody<P, M> extends infer R
        ? R extends { status: "success"; data: infer D }
            ? [Exclude<D, null | Record<string, never>>] extends [never]
                ? unknown
                : Exclude<D, null | Record<string, never>>
            : unknown
        : never;

/** Ссылка на именованную схему из `components.schemas`. */
export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

/** Ссылка на именованную операцию из `operations`. */
export type Operation<Id extends keyof operations> = operations[Id];

/** Коды ошибок из конверта `ErrorEnvelope`. */
export type ErrorCode = Schema<"ErrorEnvelope">["code"];

/** Статус успешного ответа. */
export type SuccessStatus = Schema<"SuccessEnvelope">["status"];

/** Статус ошибочного ответа, возвращаемого с HTTP 200. */
export type ErrorStatus = Schema<"ErrorEnvelope">["status"];
