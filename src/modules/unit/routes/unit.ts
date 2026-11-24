import SpisokUnitov from "@/modules/unit/view/SpisokUnitov.vue";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Unit/OknoVipolnenihZadachRunnera.vue";
import OtkrytieRedaktora from "@/modules/unit/view/Unit/OtkrytieRedaktora.vue";

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
    {
        // IDE стартует по требованию: страница запрашивает ссылку редактора
        // и только после этого переходит на сам редактор.
        path: ':id/redaktor',
        component: OtkrytieRedaktora,
        name: 'unit_redaktor',
        meta: {
            titleKey: 'unit.redaktor.dialog.title'
        }
    },
];
