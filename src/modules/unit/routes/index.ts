import UnitLayout from "../view/UnitLayout.vue";
import unit from './unit';
import project from './project';
import SpisokHranilish from "../view/SpisokHranilish.vue";


export default [
    {
        path: "/unit",
        component: UnitLayout,
        children:[
            ...unit,
            ...project,
            {
                path: 'repositories',
                component: SpisokHranilish,
                meta: {
                    requiredRoles: ['ROLE_ADMIN']
                }
            },
        ]
    }
];
