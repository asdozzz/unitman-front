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
];
