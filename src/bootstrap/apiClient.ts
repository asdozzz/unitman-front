import axios, {AxiosError, AxiosInstance} from "axios";
import {ApiResponse, ApiResponseFactory, FailApiResponse} from "@/bootstrap/apiClient/ApiResponse";
import type {ApiPath, ApiQueryArgs, ApiRequestArgs, ApiResponseData} from "@/api/types";
import {useAuthStore} from "@/modules/account/store/auth";

/**
 * Запросы, для которых нельзя запускать обновление токена:
 * `/login` — сессии ещё нет, `/account/refreshToken` — обновление уже идёт
 * (иначе рекурсия и повторное использование одноразового refresh-токена).
 */
const REFRESH_EXCLUDED_URLS = ['/login', '/account/refreshToken'];

/**
 * Публичные эндпоинты, которые не должны получать заголовок Authorization.
 */
const ANONYMOUS_URLS = ['/login', '/account/refreshToken'];

type HttpMethod = 'get' | 'post' | 'put';

class ApiClient {

    private static readonly CLIENT: AxiosInstance = axios.create({
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Pragma": "no-cache",
        },
    });

    /** Токен, актуальный на момент отправки запроса. */
    private static currentToken(): string | null {
        const raw = localStorage.getItem('tokenData');

        if (!raw) {
            return null;
        }

        try {
            const tokenData = JSON.parse(raw);

            return tokenData && tokenData.token ? tokenData.token : null;
        } catch {
            return null;
        }
    }

    /** Текст ошибки из тела ответа бэкенда. */
    private extractMessage(body: unknown): string {
        if (typeof body === "string") {
            return body;
        }

        if (!body || typeof body !== "object") {
            return "";
        }

        if ("message" in body && typeof body['message'] === "string") {
            return body['message'];
        }

        if ("data" in body && body['data'] && typeof body['data'] === "object" && "message" in body['data']) {
            const data = body['data'] as Record<"message", unknown>;

            return typeof data['message'] === "string" ? data['message'] : "";
        }

        return "";
    }

    private handleError(error: AxiosError | {data?: unknown; message?: string}): FailApiResponse {
        const body = "response" in error ? error.response?.data : (error as {data?: unknown}).data;
        const message = this.extractMessage(body);

        if (message) {
            return ApiResponseFactory.makeFail(message);
        }

        return ApiResponseFactory.makeFail(error.message || "Unknown error");
    }

    /** Признак того, что сервер отклонил запрос из-за невалидного/просроченного токена. */
    private isUnauthorized(error: AxiosError): boolean {
        if (error.response?.status === 401) {
            return true;
        }

        const data = error.response?.data as {code?: string | number} | undefined;

        return data?.code === 401 || data?.code === "401";
    }

    /**
     * Приводит тело ответа к конверту `ApiResponse`.
     *
     * Бэкенд отвечает либо `{status, data}`, либо `{status, message, code}`,
     * либо «плоским» телом без конверта — в этом случае оно отдаётся как есть.
     */
    private toApiResponse<T>(body: any): ApiResponse<T> {
        if (!body || typeof body !== "object") {
            return ApiResponseFactory.makeSuccess(body);
        }

        if ("status" in body && body.status != "success") {
            return this.handleError(body);
        }

        if ("data" in body) {
            return ApiResponseFactory.makeSuccess(body.data);
        }

        return ApiResponseFactory.makeSuccess(body);
    }

    /**
     * Низкоуровневый вызов с автоматическим обновлением токена.
     *
     * Сценарии:
     * 1. Access-токен уже истёк (по `exp`) — обновляется до отправки запроса,
     *    чтобы не тратить запрос на заведомо 401.
     * 2. Сервер ответил 401 — токены обновляются и запрос повторяется один раз
     *    (бэкенд мог отозвать токен раньше `exp`).
     *
     * Если обновить токен не удалось, сессия сбрасывается и возвращается
     * исходная ошибка авторизации.
     */
    /**
     * Хранилище авторизации или `null`, если Pinia ещё не инициализирована
     * (например, запрос ушёл до `app.use(pinia)`).
     */
    private authStoreOrNull(): ReturnType<typeof useAuthStore> | null {
        try {
            return useAuthStore();
        } catch {
            return null;
        }
    }

    private async request<T>(
        method: HttpMethod,
        url: string,
        data?: unknown,
        params?: Record<string, unknown>,
    ): Promise<ApiResponse<T>> {
        const canRefresh = !REFRESH_EXCLUDED_URLS.includes(url);
        const authStore = this.authStoreOrNull();

        if (canRefresh && authStore?.getToken) {
            await authStore.obespechitAktualniyToken();
        }

        const send = () => ApiClient.CLIENT.request({
            method,
            url,
            data,
            params,
            baseURL: window._env_?.VITE_API_HOST || import.meta.env.VITE_API_HOST,
            headers: this.headersFor(url),
        });

        try {
            return this.toApiResponse<T>((await send()).data);
        } catch (error) {
            const axiosError = error as AxiosError;

            if (!canRefresh || !this.isUnauthorized(axiosError)) {
                return this.handleError(axiosError);
            }

            if (!authStore) {
                return this.handleError(axiosError);
            }

            const obnovleno = await authStore.obnovitToken();

            if (!obnovleno) {
                return this.handleError(axiosError);
            }

            try {
                return this.toApiResponse<T>((await send()).data);
            } catch (retryError) {
                return this.handleError(retryError as AxiosError);
            }
        }
    }

    private headersFor(url: string): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Pragma": "no-cache",
        };

        if (!ANONYMOUS_URLS.includes(url)) {
            const token = ApiClient.currentToken();

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Типизированный вызов по сгенерированной OpenAPI-схеме.
     * Путь проверяется по ключам `paths`, тело — по `requestBody` операции.
     * Если у операции нет `requestBody`, тело не передаётся.
     */
    post<P extends ApiPath<"post">>(
        url: P,
        ...args: ApiRequestArgs<P, "post">
    ): Promise<ApiResponse<ApiResponseData<P, "post">>>;
    /** Нетипизированный вызов (совместимость с существующим кодом). */
    post<T>(url: string, data?: unknown): Promise<ApiResponse<T>>;
    post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('post', url, data);
    }

    /** Типизированный вызов по сгенерированной OpenAPI-схеме. */
    put<P extends ApiPath<"put">>(
        url: P,
        ...args: ApiRequestArgs<P, "put">
    ): Promise<ApiResponse<ApiResponseData<P, "put">>>;
    /** Нетипизированный вызов (совместимость с существующим кодом). */
    put<T>(url: string, data?: unknown): Promise<ApiResponse<T>>;
    put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('put', url, data);
    }

    /** Типизированный вызов по сгенерированной OpenAPI-схеме. */
    get<P extends ApiPath<"get">>(
        url: P,
        ...args: ApiQueryArgs<P, "get">
    ): Promise<ApiResponse<ApiResponseData<P, "get">>>;
    /** Нетипизированный вызов (совместимость с существующим кодом). */
    get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>>;
    get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
        return this.request<T>('get', url, undefined, params);
    }
}

const apiClient = new ApiClient();
export default apiClient;
