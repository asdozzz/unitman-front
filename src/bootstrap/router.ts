import { createRouter, createWebHistory } from 'vue-router';
import {useAuthStore} from "@/modules/account/store/auth";
import account from '@/modules/account/routes';
import unit from '@/modules/unit/routes';
import app from  '@/modules/app/routes';
import {storeInizializii} from "@/modules/app/store/InitializationStore";

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
    const publicPages = ['/login', '/init'];
    const authRequired = !publicPages.includes(to.path);
    const authStore = useAuthStore();
    const initStore = storeInizializii();
    if (initStore.list.data.length === 0) {
        await initStore.poluchitSpisok();
    }

    if (authRequired) {
        if (!authStore.tokenData) {
            authStore.returnUrl = to.fullPath;
            return next('/login');
        } else if (authStore.isAdmin && initStore.estNeZapolnenie && to.fullPath !== '/init') {
            return next('/init');
        }
    }

    if (to.meta && to.meta.requiredRoles) {
        if (!authStore.checkRoles(to.meta.requiredRoles as string[])) {
            console.log('unauthorized route');
            return next('/unauthorized');
        }
    }


    console.log('next route');
    return next();
});


export default router;
