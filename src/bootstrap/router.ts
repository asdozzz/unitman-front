import { createRouter, createWebHistory } from 'vue-router';
import {useAuthStore} from "@/modules/account/store/auth";
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

router.beforeEach(async (to, _from, next) => {

    // redirect to login page if not logged in and trying to access a restricted page
    const publicPages = ['/login'];
    const authRequired = !publicPages.includes(to.path);
    const authStore = useAuthStore();


    if (authRequired) {
        if (!authStore.tokenData) {
            authStore.returnUrl = to.fullPath;
            return next('/login');
        }
    }

    if (to.meta && to.meta.requiredRoles) {
        if (!authStore.checkRoles(to.meta.requiredRoles as string[])) {
            return next('/unauthorized');
        }
    }

    return next();
});

export default router;
