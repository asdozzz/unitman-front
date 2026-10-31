import apiClient from "@/bootstrap/apiClient";
import { buildPath } from "@/api/paths";
import type { Schema } from "@/api/types";

/**
 * Сервис проектов.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`). Ручные модели ответов удалены.
 */
class ProektiService {
    list(params: Schema<"GetProjectList"> = {}) {
        return apiClient.post('/project/list', params);
    }

    poluchitMoiProekti(params: Schema<"PoluchitMoiProekti"> = {}) {
        return apiClient.post('/project/my', params);
    }

    poluchitAktivnieProekti(params: Schema<"GetActiveProjectList"> = {}) {
        return apiClient.post('/project/activeList', params);
    }

    add(params: Schema<"AddProject">) {
        return apiClient.post('/project/add', params);
    }

    proveritProxyHost(params: Schema<"ProveritProxyHost">) {
        return apiClient.post('/project/proverkaProxyHost', params);
    }

    read(id: string) {
        return apiClient.post(buildPath('/project/read/{id}', { id }));
    }

    updateData(params: Schema<"UpdateProjectData">) {
        return apiClient.post('/project/updateData', params);
    }

    udalit(params: Schema<"PostavitVOcheredNaUdalenie">) {
        return apiClient.post('/project/remove', params);
    }

    udalitSlomaniiProekt(params: Schema<"ForceRemoveProject">) {
        return apiClient.post('/project/forceRemove', params);
    }

    aktivirovat(params: Schema<"EnableProject">) {
        return apiClient.post('/project/enable', params);
    }

    deaktivirovat(params: Schema<"DisableProject">) {
        return apiClient.post('/project/disable', params);
    }

    sobrat(params: Schema<"PostavitVOcheredNaSborku">) {
        return apiClient.post('/project/build', params);
    }

    poluchitSpisokPolzovatelei(params: Schema<"PoluchitSpisokPolzovateleiProekta">) {
        return apiClient.post('/project/usersList', params);
    }

    dobavitPolzovatelyaKProektu(params: Schema<"AddUserToProject">) {
        return apiClient.post('/project/addUser', params);
    }

    udalitPolzovatelyaIzProekta(params: Schema<"RemoveUserFromProject">) {
        return apiClient.post('/project/removeUser', params);
    }

    poluchitSpisokPeremenih(params: Schema<"PoluchitSpisokPeremenihProekta">) {
        return apiClient.post('/project/spisokPeremenihProekta', params);
    }

    dobavitPeremenuyu(params: Schema<"DobavitPeremenuyuVProekt">) {
        return apiClient.post('/project/dobavitPeremenuyu', params);
    }

    udalitPeremenuyu(params: Schema<"UdalitPeremenuyuIzProekta">) {
        return apiClient.post('/project/udalitPeremenuyu', params);
    }

    izmenitPeremenuyu(params: Schema<"IzmenitZnacheniePeremenoiProekta">) {
        return apiClient.post('/project/izmenitPeremenuyu', params);
    }

    poluchitVetkiProekta(params: Schema<"PoluchitSpisokVetokProekta">) {
        return apiClient.post('/project/branchesList', params);
    }

    obnovitNastroikiHuka(params: Schema<"ObnovitNastroikiHuka">) {
        return apiClient.post('/project/obnovitNastroikiHuka', params);
    }

    poluchitVipolnenieZadachiRunnera(params: Schema<"GetProjectRunnerJobs">) {
        return apiClient.post('/project/poluchitVipolnenieZadachiRunnera', params);
    }

    poluchitShagiZadachiRunnera(params: Schema<"GetProjectRunnerJobSteps">) {
        return apiClient.post('/project/poluchitShagiZadachiRunnera', params);
    }

    dobavitWebhook(params: Schema<"SozdatWebhookProekta">) {
        return apiClient.post('/project/webhook/dobavit', params);
    }

    readWebhook(id: string) {
        return apiClient.post(buildPath('/project/webhook/{id}/read', { id }));
    }

    obnovitWebhooka(params: Schema<"IzmenitUrlWebhooka">) {
        return apiClient.post('/project/webhook/obnovit', params);
    }

    otkluchitWebhook(id: string) {
        return apiClient.post(buildPath('/project/webhook/{id}/otkluchit', { id }));
    }

    vkluchitWebhook(id: string) {
        return apiClient.post(buildPath('/project/webhook/{id}/vkluchit', { id }));
    }

    udalitWebhook(id: string) {
        return apiClient.post(buildPath('/project/webhook/{id}/udalit', { id }));
    }

    spisokWebhookovDlyProekta(projectId: string) {
        return apiClient.post(buildPath('/project/webhook/{projectId}/spisok', { projectId }));
    }

    poluchitSobitiyaWebhooka(params: Schema<"PoluchitSobitiyaWebhooka">) {
        return apiClient.post('/project/webhook/poluchitSobitiyaWebhooka', params);
    }
}

export default new ProektiService();
