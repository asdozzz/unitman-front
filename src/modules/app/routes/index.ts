import Unauthorized from "@/modules/app/view/Unauthorized.vue";
import NotFound from "@/modules/app/view/NotFound.vue";
import Home from "@/modules/app/view/Home.vue";

export default [
    {
        path: '/home',
        component: Home,
        alias: '/',
        meta: {
            titleKey: 'app.tabs.home'
        }
    },
    {
        // Песочница дизайн-системы Primer. Добавлена до catch-all, иначе
        // адрес перехватывался бы страницей 404.
        path: '/ui-kit',
        component: () => import('@/pages/UiKitPreview.vue')
    },
    {
        path: '/unauthorized',
        component: Unauthorized,
        meta: {
            titleKey: 'app.titles.unauthorized'
        }
    },
    {
        // Стоит последним: сюда попадают все адреса, которых нет выше.
        path: '/:pathMatch(.*)*',
        component: NotFound,
        meta: {
            titleKey: 'app.titles.not_found'
        }
    }
];
