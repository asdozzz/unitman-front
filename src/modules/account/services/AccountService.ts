import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import { buildPath } from "@/api/paths";
import type { Schema } from "@/api/types";

/** Статус активации текущего пользователя. */
export type AccountActivationStatus = {
    activationPending: boolean;
    emailVerified: boolean;
    roles: string[];
};

/**
 * Ответ OAuth-exchange: access-токен и данные пользователя.
 * Refresh-токен приходит только в HttpOnly cookie.
 */
export type OAuthTokenData = {
    token: string;
    user: {
        id: string;
        email: string;
        roles: string[];
        locale: string;
        nickname: string | null;
        activationPending: boolean;
        emailVerified: boolean;
    };
};

/**
 * Сервис аккаунтов.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`). Ручные модели ответов удалены.
 */
class AccountService {
    /**
     * Получение JWT.
     *
     * Контракт требует строковые `username`/`password`, поэтому `null`
     * от пустой формы приводится к пустой строке.
     */
    login(login: string | null, password: string | null) {
        return apiClient.post('/login', {
            username: login ?? "",
            password: password ?? "",
        });
    }

    /**
     * Обновление access-токена по HttpOnly refresh-cookie.
     *
     * Публичный эндпоинт: Authorization не требуется, refresh-токен читается
     * сервером из cookie. В теле возвращается только новый access-токен.
     */
    obnovitToken(): Promise<ApiResponse<{ token: string }>> {
        const url: string = '/account/refreshToken';

        return apiClient.post<{ token: string }>(url);
    }

    /** Завершение сессии: сервер отзывает refresh-токен и очищает cookie. */
    logout(): Promise<ApiResponse<null>> {
        const url: string = '/account/logout';

        return apiClient.post<null>(url);
    }

    /** Контракт объявляет эндпоинт как GET. */
    poluchitVsehPolzovatelei() {
        return apiClient.get('/account/poluchitVsehPolzovatelei');
    }

    poluchitPolzovateleiDlyAdmininstrirovaniya(query: string | null) {
        const params: Schema<"PoluchitSpisokVsehPolzovateleiDlyAdministrirovaniya"> = {query};

        return apiClient.post(
            '/account/poluchitVsehPolzovateleiDlyAdministrorovaniya',
            params,
        );
    }

    poluchitProektiPolzovatelya(id: string) {
        return apiClient.post(buildPath('/project/user/{id}', { id }));
    }

    registraziyaPolzovatelya(params: Schema<"RegisterAccount">) {
        return apiClient.post('/account/register', params);
    }

    /** Публичная заявка на регистрацию: аккаунт ждёт активации. */
    registraziyaZayavki(params: {
        email: string;
        password: string;
        locale?: string;
        nickname?: string | null;
    }): Promise<ApiResponse<{ id: string }>> {
        return apiClient.post<{ id: string }>('/account/requestRegistration', params);
    }

    /** Статус активации текущего пользователя. */
    moiStatus(): Promise<ApiResponse<AccountActivationStatus>> {
        return apiClient.get<AccountActivationStatus>('/account/myStatus');
    }

    /** Подтвердить email кодом из письма. */
    podtverditEmail(params: { email: string; code: string }) {
        return apiClient.post('/account/verifyEmail', params);
    }

    /** Повторно отправить код подтверждения email. */
    otpravitKodPovtorno(params: { email: string }) {
        return apiClient.post('/account/resendEmailVerification', params);
    }

    /** Активация самостоятельно зарегистрированного аккаунта. */
    aktivirovatPolzovatelya(params: { accountId: string }) {
        return apiClient.post('/account/activateByAdmin', params);
    }

    blockirovkaPolzovatelya(params: Schema<"BlockByAdmin">) {
        return apiClient.post('/account/blockByAdmin', params);
    }

    razblockirovkaPolzovatelya(params: Schema<"UnblockByAdmin">) {
        return apiClient.post('/account/unblockByAdmin', params);
    }

    izmenitParolAdminom(params: Schema<"ChangePasswordByAdmin">) {
        return apiClient.post('/account/changePasswordByAdmin', params);
    }

    izmenitSvoiParol(params: Schema<"ChangeMyPassword">) {
        return apiClient.post('/account/changeMyPassword', params);
    }

    izmenitNickAdminom(params: Schema<"ChangeNicknameByAdmin">) {
        return apiClient.post('/account/changeNicknameByAdmin', params);
    }

    izmenitRoleAdminom(params: Schema<"ChangeRoleByAdmin">) {
        return apiClient.post('/account/changeRoleByAdmin', params);
    }

    izmenitSvoiNick(params: Schema<"ChangeMyNickname">) {
        return apiClient.post('/account/changeMyNickname', params);
    }

    izmenitEmaildminom(params: Schema<"ChangeEmailByAdmin">) {
        return apiClient.post('/account/changeEmailByAdmin', params);
    }

    izmenitYazik(params: Schema<"ChangeMyLocale">) {
        return apiClient.post('/account/changeMyLocale', params);
    }

    /** Контракт объявляет эндпоинт как GET. */
    poluchitNastroikiPolzovatelya() {
        return apiClient.get('/account/poluchitNastroikiPolzovatelya');
    }
}

export default new AccountService();
