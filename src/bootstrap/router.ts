import { createRouter, createWebHistory } from 'vue-router';
import {useAuthStore} from "@/modules/account/store/auth";
import account from '@/modules/account/routes';
import unit from '@/modules/unit/routes';
import opencode from '@/modules/opencode/routes';
import runner from '@/modules/runner/routes';
import aiChat from '@/modules/ai-chat/routes';
import app from  '@/modules/app/routes';
import i18n from "@/bootstrap/translator";

const router = createRouter({
    history: createWebHistory(),
    linkActiveClass: 'active',
    routes:[
        ...account,
        ...unit,
        ...opencode,
        ...runner,
        ...aiChat,
        ...app,
    ]
})

router.beforeEach(async (to, _from, next) => {

    // redirect to login page if not logged in and trying to access a restricted page
    const publicPages = ['/login'];
    const authRequired = !publicPages.includes(to.path);
    const authStore = useAuthStore();

    if (authRequired && authStore.tokenData) {
        // Сессия сохранена в localStorage, но access-токен мог истечь за время
        // простоя — обновляем его по refresh-токену до перехода. Если не
        // удалось, `obnovitToken` сбросит сессию и пользователь уйдёт на /login.
        await authStore.obespechitAktualniyToken();
    }

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

/**
 * Заголовок страницы и язык документа.
 *
 * `meta.titleKey` объявляется на маршруте, поэтому новая страница не может
 * забыть заголовок: при отсутствии ключа остаётся общее имя продукта.
 */
router.afterEach((to) => {
    const klyuch = to.meta.titleKey as string | undefined;
    const nazvanie = klyuch && i18n.global.te(klyuch) ? i18n.global.t(klyuch) : '';
    const suffiks = i18n.global.t('app.meta.title_suffix');

    document.title = nazvanie ? `${nazvanie} · ${suffiks}` : suffiks;
    document.documentElement.lang = i18n.global.locale.value;
});


export default router;
