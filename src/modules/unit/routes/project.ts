import SpisokProektov from "@/modules/unit/view/SpisokProektov.vue";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Proekti/OknoVipolnenihZadachRunnera.vue";
import EditProjectForm from "@/modules/unit/view/Proekti/EditProjectForm.vue";
import LayoutStraniziRedaktirovaniya from "@/modules/unit/view/Proekti/LayoutStraniziRedaktirovaniya.vue";
import SpisokPolzovateleiProekta from "@/modules/unit/view/Proekti/SpisokPolzovateleiProekta.vue";
import SpisokPeremenihProekta from "@/modules/unit/view/Proekti/SpisokPeremenihProekta.vue";
import FormaObnovleniyaNastroekHuka from "@/modules/unit/view/Proekti/FormaObnovleniyaNastroekHuka.vue";
import SpisokWebhookovProekta from "@/modules/unit/view/Proekti/SpisokWebhookovProekta.vue";
import SobitiyaWebhooka from "@/modules/unit/view/Proekti/SobitiyaWebhooka.vue";

export default [
    {
        path: 'projects',
        component: SpisokProektov,
        meta: {
            requiredRoles: ['ROLE_ADMIN']
        },
        name: 'project_list',
    },
    {
        path: 'projects/:id',
        component: LayoutStraniziRedaktirovaniya,
        children: [
            {
                path: 'home',
                component: EditProjectForm,
                name: 'project_edit',
            },
            {
                path: 'jobs',
                component: OknoVipolnenihZadachRunnera,
                name: 'project_jobs',
            },
            {
                path: 'users',
                component: SpisokPolzovateleiProekta,
                name: 'project_users',
            },
            {
                path: 'variables',
                component: SpisokPeremenihProekta,
                name: 'project_variables',
            },
            {
                path: 'repo_event_handler',
                component: FormaObnovleniyaNastroekHuka,
                name: 'project_repo_event_handler',
            },
            {
                path: 'webhooks',
                component: SpisokWebhookovProekta,
                name: 'project_webhooks',
            }
        ]
    },
    {
        path: 'projects/:id/webhooks/:webhookId',
        component: SobitiyaWebhooka,
        name: 'webhook_events',
    }
];
