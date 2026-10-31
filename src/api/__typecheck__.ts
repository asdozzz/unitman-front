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

export const typecheck = {
    postPath, badPost, listBody, badCreate, createBody, hookParams, value, noQuery,
    listResponseItem,
} as const;

export type TypecheckResult = [ListResponse];
