import OpenCodeLayout from "@/modules/opencode/view/OpenCodeLayout.vue";
import SpisokSessiyOpenCode from "@/modules/opencode/view/SpisokSessiyOpenCode.vue";
import SpisokWorkspace from "@/modules/opencode/view/SpisokWorkspace.vue";
import ChatOpenCode from "@/modules/opencode/view/ChatOpenCode.vue";

/**
 * Маршруты модуля OpenCode.
 *
 * Сессии и реквизиты привязаны к аккаунту, поэтому роли здесь не ограничиваются:
 * доступ достаточно того, что пользователь авторизован (проверяется в
 * `router.beforeEach`).
 */
export default [
    {
        path: "/opencode",
        component: OpenCodeLayout,
        children: [
            {
                path: "",
                redirect: "/opencode/sessions",
            },
            {
                path: "sessions",
                component: SpisokSessiyOpenCode,
                name: "opencode_sessions",
                meta: {
                    titleKey: "app.tabs.opencode_units"
                }
            },
            {
                path: "workspaces",
                component: SpisokWorkspace,
                name: "opencode_workspaces",
                meta: {
                    titleKey: "app.tabs.workspaces"
                }
            },
            {
                path: "sessions/:id",
                component: ChatOpenCode,
                name: "opencode_chat",
                props: true,
                meta: {
                    titleKey: "app.tabs.opencode"
                }
            },
        ],
    },
];
