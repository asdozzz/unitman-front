import Login from "@/modules/account/view/Login.vue";
import RegisterAccount from "@/modules/account/view/RegisterAccount.vue";
import EmailVerification from "@/modules/account/view/EmailVerification.vue";
import OAuthCallback from "@/modules/account/view/OAuthCallback.vue";
import PendingActivation from "@/modules/account/view/PendingActivation.vue";
import MainLayout from "@/modules/account/view/MainLayout.vue";
import AccountSettings from "@/modules/account/view/AccountSettings.vue";
import SpisokPolzovateleiDlyAdministrirovaniya
    from "@/modules/account/view/SpisokPolzovateleiDlyAdministrirovaniya.vue";
import EditPage
    from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/EditPage.vue";

export default [
    {
        path: '/login',
        component: Login,
        meta: {
            titleKey: 'app.titles.login'
        }
    },
    {
        path: '/register',
        component: RegisterAccount,
        meta: {
            titleKey: 'app.titles.register'
        }
    },
    {
        path: '/verify-email',
        component: EmailVerification,
        meta: {
            titleKey: 'app.titles.verify_email'
        }
    },
    {
        path: '/oauth/callback',
        component: OAuthCallback,
        meta: {
            titleKey: 'app.titles.oauth_callback'
        }
    },
    {
        path: '/pending',
        component: PendingActivation,
        meta: {
            titleKey: 'app.titles.pending_activation'
        }
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
                    requiredRoles: ['ROLE_ADMIN'],
                    titleKey: 'app.tabs.accounts'
                }
            },
            {
                path: ':id',
                component: EditPage,
                name: "account_edit",
                meta: {
                    requiredRoles: ['ROLE_ADMIN'],
                    titleKey: 'app.tabs.accounts'
                }
            },
            {
                path: 'settings',
                component: AccountSettings,
                name: "account_settings",
                meta: {
                    titleKey: 'app.titles.account_settings'
                }
            }
        ]
    },
]
