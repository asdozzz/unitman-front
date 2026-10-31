import apiClient from "@/bootstrap/apiClient";
import { buildPath } from "@/api/paths";
import type { Schema } from "@/api/types";

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
     * Обновление пары токенов по refresh-токену.
     *
     * Публичный эндпоинт: заголовок Authorization не требуется.
     * Refresh-токен одноразовый — после успешного обновления старый отзывается,
     * поэтому в хранилище нужно сохранять и новый `refreshToken`.
     */
    obnovitToken(refreshToken: string) {
        return apiClient.post('/account/refreshToken', {refreshToken});
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
