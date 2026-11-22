import { safeJsonParse } from "@/utils/json";

/**
 * Ключ локального хранилища с настройками интерфейса.
 *
 * Значение общее для всех вкладок и не привязано к аккаунту: тема и состояние
 * меню — это предпочтения устройства, а не пользователя.
 */
export const APP_SETTINGS_STORAGE_KEY = "AppSettings";

/** Настройки интерфейса, которые сохраняются между сессиями. */
export type AppSettings = {
    /** Открыто ли боковое меню на десктопе. */
    leftDrawerOpen: boolean;
    /** Свёрнут ли сайдбар до иконок на десктопе. */
    sidebarCollapsed: boolean;
    /** Включена ли тёмная тема. */
    darkMode: boolean;
};

export const defaultAppSettings: AppSettings = {
    leftDrawerOpen: false,
    sidebarCollapsed: false,
    darkMode: false,
};

/** Приводит произвольное значение из хранилища к boolean. */
function kakBoolean(znachenie: unknown, poUmolchaniyu: boolean): boolean {
    return typeof znachenie === "boolean" ? znachenie : poUmolchaniyu;
}

/**
 * Читает настройки из localStorage.
 *
 * Битое значение, отсутствующий ключ или поля другого типа не должны ломать
 * запуск приложения — в этом случае подставляются значения по умолчанию.
 */
export function loadAppSettings(): AppSettings {
    const syroy = localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "";
    const sohranennie = safeJsonParse<Partial<AppSettings>>(syroy);

    return {
        leftDrawerOpen: kakBoolean(sohranennie?.leftDrawerOpen, defaultAppSettings.leftDrawerOpen),
        // Поле появилось позже: в старых записях localStorage его нет — тогда
        // сайдбар считается развёрнутым, как и было по умолчанию.
        sidebarCollapsed: kakBoolean(
            sohranennie?.sidebarCollapsed,
            defaultAppSettings.sidebarCollapsed,
        ),
        darkMode: kakBoolean(sohranennie?.darkMode, defaultAppSettings.darkMode),
    };
}

/**
 * Сохраняет изменения настроек и возвращает актуальный набор.
 *
 * Патч применяется поверх уже сохранённых значений, поэтому переключение темы
 * не сбрасывает состояние меню и наоборот.
 */
export function saveAppSettings(patch: Partial<AppSettings>): AppSettings {
    const sleduyushie: AppSettings = { ...loadAppSettings(), ...patch };
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(sleduyushie));

    return sleduyushie;
}
