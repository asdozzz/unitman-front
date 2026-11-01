import type { ApiPath, ApiPathParams, ApiQuery, ApiRequestBody, ApiResponseData, Schema } from "@/api/types";

// 1. ApiPath<'post'> должен содержать только пути с объявленным post.
type PostPaths = ApiPath<"post">;
const postPath: PostPaths = "/unit/list";
// @ts-expect-error — у этого пути нет post-операции
const badPost: PostPaths = "/unit/moi-not-exists";

// 2. Тело запроса берётся из components.schemas.
const listBody: ApiRequestBody<"/unit/list", "post"> = {
    filter: { branch: null, name: null, onlyMine: false, projectId: null, unitId: null },
};
// @ts-expect-error — обязательное поле unitName отсутствует
const badCreate: ApiRequestBody<"/unit/sozdat", "post"> = { branch: "x", projectId: "y" };

const createBody: ApiRequestBody<"/unit/sozdat", "post"> = {
    branch: "feature/1",
    projectId: "uuid",
    unitName: "feature-1",
};

// 3. Path-параметры.
type HookParams = ApiPathParams<"/project/{id}/hook", "post">;
const hookParams: HookParams = { id: "abc" };

// 4. ApiResponseData разворачивает конверт {status,data} до типа data.
type ListResponse = ApiResponseData<"/unit/list", "post">;
const listResponseItem: ListResponse[number] = {} as Schema<"UnitListItem">;

// 5. Схемы доступны по имени.
const value: Schema<"ZnacheniePeremenoi"> = { id: "1", type: "string", value: "v" };

// 6. ApiQuery для операции без query-параметров — undefined.
type NoQuery = ApiQuery<"/unit/list", "post">;
const noQuery: NoQuery = undefined;

// 7. Обновление токена: тело `ObnovitToken` и развёрнутый ответ из схемы.
const refreshBody: ApiRequestBody<"/account/refreshToken", "post"> = { refreshToken: "a1b2c3" };
// @ts-expect-error — обязательное поле refreshToken отсутствует
const badRefresh: ApiRequestBody<"/account/refreshToken", "post"> = {};
type RefreshResponse = ApiResponseData<"/account/refreshToken", "post">;
const refreshResponseToken: RefreshResponse["token"] = "eyJ0eXAi...";

// 8. Помощник ссылки: суффикс необязателен в запросе и есть в описании переменной.
const helperBody: ApiRequestBody<"/unit/poluchitSsylkuPoPomoschniku", "post"> = {
    port: 8080, projectId: "uuid", service: "backend", targetUnitId: "uuid", suffix: "/api/v1",
};
const helperSuffix: Schema<"ConfigVariableHelper">["suffix"] = null;

export const typecheck = {
    postPath, badPost, listBody, badCreate, createBody, hookParams, value, noQuery,
    listResponseItem, refreshBody, badRefresh, refreshResponseToken, helperBody, helperSuffix,
} as const;

export type TypecheckResult = [ListResponse, RefreshResponse];
