import Login from "@/modules/account/view/Login.vue";
import MainLayout from "@/modules/account/view/MainLayout.vue";
import AccountSettings from "@/modules/account/view/AccountSettings.vue";
import SpisokPolzovateleiDlyAdministrirovaniya
    from "@/modules/account/view/SpisokPolzovateleiDlyAdministrirovaniya.vue";

export default [
    {
        path: '/login',
        component: Login,
    },
    {
        path: '/account',
        component: MainLayout,
        children:[
            {
                path: 'list',
                component: SpisokPolzovateleiDlyAdministrirovaniya,
                name: "account_list",
                meta: {
                    requiredRoles: ['ROLE_ADMIN']
                }
            },
            {
                path: 'settings',
                component: AccountSettings,
            }
        ]
    },
]
