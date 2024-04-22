import { createRouter, createWebHistory } from 'vue-router';

import account from '@/modules/account/routes';
import unit from '@/modules/unit/routes';
import app from  '@/modules/app/routes';

const router = createRouter({
    history: createWebHistory(),
    linkActiveClass: 'active',
    routes:[
        ...account,
        ...unit,
        ...app,
    ]
})



export default router;
