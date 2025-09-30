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
import {ZaprosNaIzmenenieYazika} from "@/modules/account/services/model/ZaprosNaIzmenenieYazika";
import {ZaprosNaIzmenenieParolya} from "@/modules/account/services/model/ZaprosNaIzmenenieParolya";
import {ZaprosNaIzmenenieNika} from "@/modules/account/services/model/ZaprosNaIzmenenieNika";
import {
    OtvetNaPoluchenieNastroekPolzovatelya
} from "@/modules/account/services/model/OtvetNaPoluchenieNastroekPolzovatelya";
import {ZaprosNaIzmenenieNikaAdminom} from "@/modules/account/services/model/ZaprosNaIzmenenieNikaAdminom";
import {ZaprosNaIzmenenieRoliAdminom} from "@/modules/account/services/model/ZaprosNaIzmenenieRoliAdminom";

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

    izmenitParolAdminom(form: ApiModelDlyIzmeneniyaParolya) {
        return apiClient.post<null>('/account/changePasswordByAdmin', form);
    }

    izmenitSvoiParol(form: ZaprosNaIzmenenieParolya) {
        return apiClient.post<null>('/account/changeMyPassword', form);
    }

    izmenitNickAdminom(form: ZaprosNaIzmenenieNikaAdminom) {
        return apiClient.post<null>('/account/changeNicknameByAdmin', form);
    }

    izmenitRoleAdminom(form: ZaprosNaIzmenenieRoliAdminom) {
        return apiClient.post<null>('/account/changeRoleByAdmin', form);
    }

    izmenitSvoiNick(form: ZaprosNaIzmenenieNika) {
        return apiClient.post<null>('/account/changeMyNickname', form);
    }

    izmenitEmaildminom(form: ApiModelDlyIzmeneniyaEmail) {
        return apiClient.post<null>('/account/changeEmailByAdmin', form);
    }

    izmenitYazik(form: ZaprosNaIzmenenieYazika) {
        return apiClient.post<null>('/account/changeMyLocale', form);
    }

    poluchitNastroikiPolzovatelya() {
        return apiClient.post<OtvetNaPoluchenieNastroekPolzovatelya>('/account/poluchitNastroikiPolzovatelya', {});
    }
}

export default new AccountService();
