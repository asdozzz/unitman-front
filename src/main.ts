import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from "./bootstrap/router";
import {createPinia} from "pinia";
import { Quasar, Notify } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

createApp(App).use(Quasar, {plugins: {Notify}}).use(createPinia()).use(router).mount('#app')

import {useAuthStore} from "@/modules/account/store/auth";
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

