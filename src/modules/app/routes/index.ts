import Unauthorized from "@/modules/app/view/Unauthorized.vue";
import NotFound from "@/modules/app/view/NotFound.vue";
import Home from "@/modules/app/view/Home.vue";
import Initialization from "@/modules/app/view/Initialization.vue";

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
        path: '/init',
        component: Initialization,
        meta: {
            titleKey: 'app.titles.init'
        }
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
