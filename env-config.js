// Шаблон для dev-сервера: index.html подключает файл до приложения.
// В собранном образе entry.sh перезаписывает его при старте контейнера.
// null означает «не переопределять» — берётся значение из import.meta.env.
window._env_ = {
    VITE_API_HOST: null,
    VITE_CENTRIFUGE_HOST: null,
    // Диагностический лог событий unit_progress#<jobId>; false — выключить.
    VITE_DEBUG_PROGRESS: null,
};
