import SpisokRannerov from "@/modules/runner/view/SpisokRannerov.vue";

export default [
    {
        path: '/runner/list',
        component: SpisokRannerov,
        name: 'runner_list',
        meta: {
            requiredRoles: ['ROLE_ADMIN'],
            titleKey: 'app.titles.runners',
        },
    },
];
