import Unauthorized from "@/modules/app/view/Unauthorized.vue";
import Home from "@/modules/app/view/Home.vue";
import Initialization from "@/modules/app/view/Initialization.vue";

export default [
    {
        path: '/home',
        component: Home,
        alias: '/'
    },
    {
        path: '/init',
        component: Initialization,
    },
    {
        path: '/unauthorized',
        component: Unauthorized
    }
];
