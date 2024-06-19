import apiClient from "@/bootstrap/apiClient";
import {LoginResponse} from "@/modules/account/services/model/LoginResponse";
import {ApiModelPolzovatelya} from "@/modules/account/services/model/ApiModelPolzovatelya";
import {
    ApiModelPolzovatelyaDlyAdministrorovaniya
} from "@/modules/account/services/model/ApiModelPolzovatelyaDlyAdministrorovaniya";
import {ApiModelDlyRegistraziiPolzovatelya} from "@/modules/account/services/model/ApiModelDlyRegistraziiPolzovatelya";
import {ApiModelDlyBlockirovkiPolzovatelya} from "@/modules/account/services/model/ApiModelDlyBlockirovkiPolzovatelya";
import {
    ApiModelDlyRazblockirovkiPolzovatelya
} from "@/modules/account/services/model/ApiModelDlyRazblockirovkiPolzovatelya";
import {ApiModelDlyIzmeneniyaParolya} from "@/modules/account/services/model/ApiModelDlyIzmeneniyaParolya";
import {ApiModelDlyIzmeneniyaEmail} from "@/modules/account/services/model/ApiModelDlyIzmeneniyaEmail";

class AccountService {
    login(login: string|null, password: string|null) {
        return apiClient.post<LoginResponse>('/login', {"username":login, "password":password});
    }

    poluchitVsehPolzovatelei() {
        return apiClient.post<ApiModelPolzovatelya[]>('/account/poluchitVsehPolzovatelei', {});
    }

    poluchitPolzovateleiDlyAdmininstrirovaniya() {
        return apiClient.post<ApiModelPolzovatelyaDlyAdministrorovaniya[]>('/account/poluchitVsehPolzovateleiDlyAdministrorovaniya', {});
    }

    registraziyaPolzovatelya(form: ApiModelDlyRegistraziiPolzovatelya) {
        return apiClient.post<null>('/account/register', form);
    }

    blockirovkaPolzovatelya(form: ApiModelDlyBlockirovkiPolzovatelya) {
        return apiClient.post<null>('/account/blockByAdmin', form);
    }

    razblockirovkaPolzovatelya(form: ApiModelDlyRazblockirovkiPolzovatelya) {
        return apiClient.post<null>('/account/unblockByAdmin', form);
    }

    izmenitParol(form: ApiModelDlyIzmeneniyaParolya) {
        return apiClient.post<null>('/account/changePasswordByAdmin', form);
    }

    izmenitEmail(form: ApiModelDlyIzmeneniyaEmail) {
        return apiClient.post<null>('/account/changeEmailByAdmin', form);
    }
}

export default new AccountService();
