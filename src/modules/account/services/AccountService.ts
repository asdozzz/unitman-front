import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import {LoginResponse} from "@/modules/account/services/model/LoginResponse";
import {ApiModelPolzovatelya} from "@/modules/account/services/model/ApiModelPolzovatelya";
import {
    ApiModelPolzovatelyaDlyAdministrorovaniya
} from "@/modules/account/services/model/ApiModelPolzovatelyaDlyAdministrorovaniya";
import {
    OtvetNaPoluchenieNastroekPolzovatelya
} from "@/modules/account/services/model/OtvetNaPoluchenieNastroekPolzovatelya";

/**
 * Сервис аккаунтов.
 *
 * Типы тел запросов берутся из OpenAPI-схемы (`Schema<"...">`),
 * типы ответов задаются явно: в спецификации `SuccessEnvelope.data` описан
 * как `object|null`, поэтому полезная нагрузка из контракта не выводится.
 */
class AccountService {
    /**
     * Получение JWT.
     *
     * Контракт требует строковые `username`/`password`, поэтому `null`
     * от пустой формы приводится к пустой строке.
     */
    login(login: string | null, password: string | null) {
        // Схема тела запроса для /login объявлена inline в спецификации,
        // поэтому повторяем её минимальную форму здесь.
        const params = {
            username: login ?? "",
            password: password ?? "",
        };

        return apiClient.post<LoginResponse>('/login', params);
    }

    /**
     * ИСПРАВЛЕНО: контракт объявляет эндпоинт как GET, ранее здесь был POST.
     */
    poluchitVsehPolzovatelei() {
        return apiClient.get<ApiModelPolzovatelya[]>('/account/poluchitVsehPolzovatelei');
    }

    poluchitPolzovateleiDlyAdmininstrirovaniya(query: string | null) {
        const params: Schema<"PoluchitSpisokVsehPolzovateleiDlyAdministrirovaniya"> = {query};

        return apiClient.post<ApiModelPolzovatelyaDlyAdministrorovaniya[]>(
            '/account/poluchitVsehPolzovateleiDlyAdministrorovaniya',
            params,
        );
    }

    poluchitProektiPolzovatelya(id: string) {
        return apiClient.post<{id: string, name: string}[]>('/project/user/'+id, {});
    }

    registraziyaPolzovatelya(params: Schema<"RegisterAccount">) {
        return apiClient.post<{ id: string }>('/account/register', params);
    }

    blockirovkaPolzovatelya(params: Schema<"BlockByAdmin">) {
        return apiClient.post<null>('/account/blockByAdmin', params);
    }

    razblockirovkaPolzovatelya(params: Schema<"UnblockByAdmin">) {
        return apiClient.post<null>('/account/unblockByAdmin', params);
    }

    izmenitParolAdminom(params: Schema<"ChangePasswordByAdmin">) {
        return apiClient.post<null>('/account/changePasswordByAdmin', params);
    }

    izmenitSvoiParol(params: Schema<"ChangeMyPassword">) {
        return apiClient.post<null>('/account/changeMyPassword', params);
    }

    izmenitNickAdminom(params: Schema<"ChangeNicknameByAdmin">) {
        return apiClient.post<null>('/account/changeNicknameByAdmin', params);
    }

    izmenitRoleAdminom(params: Schema<"ChangeRoleByAdmin">) {
        return apiClient.post<null>('/account/changeRoleByAdmin', params);
    }

    izmenitSvoiNick(params: Schema<"ChangeMyNickname">) {
        return apiClient.post<null>('/account/changeMyNickname', params);
    }

    izmenitEmaildminom(params: Schema<"ChangeEmailByAdmin">) {
        return apiClient.post<null>('/account/changeEmailByAdmin', params);
    }

    izmenitYazik(params: Schema<"ChangeMyLocale">) {
        return apiClient.post<null>('/account/changeMyLocale', params);
    }

    /**
     * ИСПРАВЛЕНО: контракт объявляет эндпоинт как GET, ранее здесь был POST.
     */
    poluchitNastroikiPolzovatelya() {
        return apiClient.get<OtvetNaPoluchenieNastroekPolzovatelya>('/account/poluchitNastroikiPolzovatelya');
    }
}

export default new AccountService();
