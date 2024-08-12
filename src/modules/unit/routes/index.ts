import UnitLayout from "../view/UnitLayout.vue";
import unit from './unit';
import SpisokHranilish from "../view/SpisokHranilish.vue";
import SpisokProektov from "../view/SpisokProektov.vue";


export default [
    {
        path: "/unit",
        component: UnitLayout,
        children:[
            ...unit,
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
