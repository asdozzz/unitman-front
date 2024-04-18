import Unauthorized from "@/modules/app/view/Unauthorized.vue";
import Home from "@/modules/app/view/Home.vue";

export default [
    {
        path: '/home',
        component: Home,
        alias: '/'
    },
    {
        path: '/unauthorized',
        component: Unauthorized
    }
];
