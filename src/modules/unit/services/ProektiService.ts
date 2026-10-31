import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import ModelDlySpiskaProektov from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaProektov";
import {
    ModelDlySpiskaPolzovateleiProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPolzovateleiProekta";
import ModelDlySpiskaVetok from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaVetok";
import {
    ModelDlySpiskaPeremenihProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPeremenihProekta";
import {
    OtvetNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieZadachRunneraUnita";
import {
    OtvetNaPoluchenieShagovZadachiRunnera
} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieShagovZadachiRunnera";
import {
    ModelDlySpiskaWebhookovProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaWebhookovProekta";
import {OtvetNaPoluchenieSpiskaSobitiiWebhooka} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieSpiskaSobitiiWebhooka";
import {OtvetNaProverkuProxyHost} from "@/modules/unit/services/ProektiServices/model/OtvetNaProverkuProxyHost";

/**
 * Сервис проектов.
 *
 * Тела запросов типизированы по OpenAPI-схеме. Типы ответов задаются явно:
 * в спецификации `SuccessEnvelope.data` описан как `object|null`.
 */
class ProektiService {
    list() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/list', {});
    }

    poluchitMoiProekti() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/my', {});
    }

    poluchitAktivnieProekti() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/activeList', {});
    }

    add(params: Schema<"AddProject">) {
        return apiClient.post<null>('/project/add', params);
    }

    proveritProxyHost(params: Schema<"ProveritProxyHost">) {
        return apiClient.post<OtvetNaProverkuProxyHost>('/project/proverkaProxyHost', params);
    }

    read(id: string) {
        return apiClient.post<ModelDlySpiskaProektov>('/project/read/'+id, {});
    }

    updateData(params: Schema<"UpdateProjectData">) {
        return apiClient.post<null>('/project/updateData', params);
    }

    udalit(params: Schema<"PostavitVOcheredNaUdalenie">) {
        return apiClient.post<null>('/project/remove', params);
    }

    udalitSlomaniiProekt(params: Schema<"ForceRemoveProject">) {
        return apiClient.post<null>('/project/forceRemove', params);
    }

    aktivirovat(params: Schema<"EnableProject">) {
        return apiClient.post<null>('/project/enable', params);
    }

    deaktivirovat(params: Schema<"DisableProject">) {
        return apiClient.post<null>('/project/disable', params);
    }

    sobrat(params: Schema<"PostavitVOcheredNaSborku">) {
        return apiClient.post<null>('/project/build', params);
    }

    poluchitSpisokPolzovatelei(params: Schema<"PoluchitSpisokPolzovateleiProekta">) {
        return apiClient.post<ModelDlySpiskaPolzovateleiProekta[]>('/project/usersList', params);
    }

    dobavitPolzovatelyaKProektu(params: Schema<"AddUserToProject">) {
        return apiClient.post<null>('/project/addUser', params);
    }

    udalitPolzovatelyaIzProekta(params: Schema<"RemoveUserFromProject">) {
        return apiClient.post<null>('/project/removeUser', params);
    }

    poluchitSpisokPeremenih(params: Schema<"PoluchitSpisokPeremenihProekta">) {
        return apiClient.post<ModelDlySpiskaPeremenihProekta[]>('/project/spisokPeremenihProekta', params);
    }

    dobavitPeremenuyu(params: Schema<"DobavitPeremenuyuVProekt">) {
        return apiClient.post<null>('/project/dobavitPeremenuyu', params);
    }

    udalitPeremenuyu(params: Schema<"UdalitPeremenuyuIzProekta">) {
        return apiClient.post<null>('/project/udalitPeremenuyu', params);
    }

    /**
     * ВНИМАНИЕ: расхождение с контрактом.
     *
     * Схема `IzmenitZnacheniePeremenoiProekta` ожидает поля
     * `projectId`, `code`, `newValue`, а вызывающий код (класс `EditForm`
     * в `SpisokPeremenihProektaStore`) отправляет `value`.
     * Здесь намеренно сохранён прежний контракт фронта, чтобы не сломать
     * работу формы; поле нужно согласовать с бэкендом.
     */
    izmenitPeremenuyu(params: { projectId: string; code: string; value: string }) {
        return apiClient.post<null>('/project/izmenitPeremenuyu', params);
    }

    poluchitVetkiProekta(params: Schema<"PoluchitSpisokVetokProekta">) {
        return apiClient.post<ModelDlySpiskaVetok[]>('/project/branchesList', params);
    }

    obnovitNastroikiHuka(params: Schema<"ObnovitNastroikiHuka">) {
        return apiClient.post<null>('/project/obnovitNastroikiHuka', params);
    }

    poluchitVipolnenieZadachiRunnera(params: Schema<"GetProjectRunnerJobs">) {
        return apiClient.post<OtvetNaPoluchenieZadachRunneraUnita[]>('/project/poluchitVipolnenieZadachiRunnera', params);
    }

    poluchitShagiZadachiRunnera(params: Schema<"GetProjectRunnerJobSteps">) {
        return apiClient.post<OtvetNaPoluchenieShagovZadachiRunnera>('/project/poluchitShagiZadachiRunnera', params);
    }

    dobavitWebhook(params: Schema<"SozdatWebhookProekta">) {
        return apiClient.post<null>('/project/webhook/dobavit', params);
    }

    readWebhook(id: string) {
        return apiClient.post<ModelDlySpiskaWebhookovProekta>('/project/webhook/'+id+'/read', {});
    }

    obnovitWebhooka(params: Schema<"IzmenitUrlWebhooka">) {
        return apiClient.post<null>('/project/webhook/obnovit', params);
    }

    otkluchitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/otkluchit', {});
    }

    vkluchitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/vkluchit', {});
    }

    udalitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/udalit', {});
    }

    spisokWebhookovDlyProekta(projectId: string) {
        return apiClient.post<ModelDlySpiskaWebhookovProekta[]>('/project/webhook/'+projectId+'/spisok', {});
    }

    poluchitSobitiyaWebhooka(params: Schema<"PoluchitSobitiyaWebhooka">) {
        return apiClient.post<OtvetNaPoluchenieSpiskaSobitiiWebhooka>('/project/webhook/poluchitSobitiyaWebhooka', params);
    }
}

export default new ProektiService();
