import SpisokProektov from "@/modules/unit/view/SpisokProektov.vue";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Proekti/OknoVipolnenihZadachRunnera.vue";

export default [
    {
        path: 'projects',
        component: SpisokProektov,
        meta: {
            requiredRoles: ['ROLE_ADMIN']
        }
    },
    {
        path: 'projects/:id/jobs',
        component: OknoVipolnenihZadachRunnera,
        name: 'project_jobs',
    },
];
