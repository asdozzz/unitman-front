import AiChatView from "@/modules/ai-chat/view/AiChatView.vue";

export default [
    {
        path: '/ai/chat',
        component: AiChatView,
        name: 'ai_chat',
        meta: {
            titleKey: 'app.tabs.ai_assistant',
        },
    },
    {
        // Экран списка сессий создаёт A6. Ленивая загрузка, чтобы маршрут не
        // тянул UI-код в основной бандл.
        path: '/ai/chat/sessions',
        component: () => import('@/modules/ai-chat/view/SpisokSessiyAiChataView.vue'),
        name: 'ai_chat_sessions',
        meta: {
            titleKey: 'app.tabs.ai_assistant',
        },
    },
    {
        // Сессионный чат: UI дорабатывает A6, история и ходы — A5.
        path: '/ai/chat/:id',
        component: AiChatView,
        name: 'ai_chat_session',
        meta: {
            titleKey: 'app.tabs.ai_assistant',
        },
    },
];
