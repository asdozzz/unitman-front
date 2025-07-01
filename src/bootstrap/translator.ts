import { createI18n } from 'vue-i18n'
import ru from '@/translator/ru.json';
import en from '@/translator/en.json';

const i18n = createI18n({
    allowComposition: true,
    locale: import.meta.env.VITE_DEFAULT_LOCALE || "ru",
    fallbackLocale: import.meta.env.VITE_FALLBACK_LOCALE || "en",
    legacy: false,
    globalInjection: true,
    messages: {
        'ru': ru,
        'en': en,
    },
})

export default i18n;
