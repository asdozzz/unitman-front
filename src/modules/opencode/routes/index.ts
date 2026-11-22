import type { RouteRecordRaw } from "vue-router";
import OpenCodeLayout from "@/modules/opencode/view/OpenCodeLayout.vue";
import SpisokSessiyUnita from "@/modules/opencode/view/SpisokSessiyUnita.vue";
import SpisokWorkspace from "@/modules/opencode/view/SpisokWorkspace.vue";
import ChatSessiiUnita from "@/modules/opencode/view/ChatSessiiUnita.vue";
import ChatWorkspace from "@/modules/opencode/view/ChatWorkspace.vue";

/**
 * Маршруты модуля OpenCode.
 *
 * Unit-сессии и workspace — независимые разделы: у каждого свой список, свой
 * чат и свои маршруты. Старые общие маршруты оставлены только как редиректы
 * на время перехода.
 */
const routes: RouteRecordRaw[] = [
    {
        path: "/opencode",
        component: OpenCodeLayout,
        children: [
            {
                path: "",
                redirect: "/opencode/unit-sessions",
            },
            {
                path: "unit-sessions",
                component: SpisokSessiyUnita,
                name: "opencode_unit_sessions",
                meta: {
                    titleKey: "app.tabs.opencode_units"
                }
            },
            {
                path: "unit-sessions/:id",
                component: ChatSessiiUnita,
                name: "opencode_unit_session_chat",
                props: true,
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
                path: "workspaces/:id",
                component: ChatWorkspace,
                name: "opencode_workspace_chat",
                props: true,
                meta: {
                    titleKey: "app.tabs.workspaces"
                }
            },
            {
                path: "sessions",
                redirect: "/opencode/unit-sessions",
            },
            {
                path: "sessions/:id",
                redirect: (to) => `/opencode/unit-sessions/${String(to.params.id ?? "")}`,
            },
        ],
    },
];

export default routes;
