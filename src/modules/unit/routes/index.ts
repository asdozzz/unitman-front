import UnitLayout from "../view/UnitLayout.vue";
import SpisokUnitov from "../view/SpisokUnitov.vue";
import SpisokHranilish from "../view/SpisokHranilish.vue";
import SpisokProektov from "../view/SpisokProektov.vue";


export default [
    {
        path: "/unit",
        component: UnitLayout,
        children:[
            {
                path: '',
                component: SpisokUnitov,
                alias: 'list',
                meta: {
                    requiredRoles: ['ROLE_ADMIN']
                }
            },
            {
                path: 'repositories',
                component: SpisokHranilish,
                meta: {
                    requiredRoles: ['ROLE_ADMIN']
                }
            },
            {
                path: 'projects',
                component: SpisokProektov,
                meta: {
                    requiredRoles: ['ROLE_ADMIN']
                }
            }
        ]
    }
];
