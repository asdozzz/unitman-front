import SpisokUnitov from "@/modules/unit/view/SpisokUnitov.vue";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Unit/OknoVipolnenihZadachRunnera.vue";

export default [
    {
        path: '',
        component: SpisokUnitov,
        alias: 'list',
        meta: {
            titleKey: 'app.tabs.units'
        }
    },
    {
        path: ':id/jobs',
        component: OknoVipolnenihZadachRunnera,
        name: 'unit_jobs',
        meta: {
            titleKey: 'app.titles.unit_jobs'
        }
    },
];
