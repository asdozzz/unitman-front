import SpisokGlobalnyhRezhimov from "@/modules/agent-mode/view/SpisokGlobalnyhRezhimov.vue";

/**
 * Общие режимы агентов OpenCode.
 *
 * Раздел административный: создание и изменение общих модов доступно только
 * `ROLE_ADMIN`.
 */
export default [
    {
        path: "/admin/agent-modes",
        component: SpisokGlobalnyhRezhimov,
        name: "agent_mode_global_list",
        meta: {
            requiredRoles: ["ROLE_ADMIN"],
            titleKey: "opencode.agent_modes.admin_title",
        },
    },
];
