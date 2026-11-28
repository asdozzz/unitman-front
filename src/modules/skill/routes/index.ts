import SpisokNavykov from "@/modules/skill/view/SpisokNavykov.vue";

/**
 * Глобальные навыки OpenCode.
 *
 * Раздел административный: создание и изменение глобальных навыков доступно
 * только `ROLE_ADMIN`, поэтому маршрут закрыт тем же guard'ом, что и остальные
 * административные разделы.
 */
export default [
    {
        path: "/admin/skills",
        component: SpisokNavykov,
        name: "skill_global_list",
        meta: {
            requiredRoles: ["ROLE_ADMIN"],
            titleKey: "skill.admin.title",
        },
    },
];
