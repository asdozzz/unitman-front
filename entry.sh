#!/bin/sh
set -eu

# env-config.js читает браузер до загрузки приложения, поэтому файл
# генерируется при старте контейнера: один и тот же образ подключается
# к разным бэкендам без пересборки.
ENV_CONFIG_PATH=/usr/share/nginx/html/env-config.js

# Экранирование значения для JSON-строки: обратный слэш и двойная кавычка.
json_escape() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# Пустое значение означает «не переопределять»: приложение возьмёт значение,
# запечённое при сборке (import.meta.env).
{
    printf 'window._env_ = {\n'

    first=1
    for name in VITE_API_HOST VITE_CENTRIFUGE_HOST VITE_DEBUG_PROGRESS; do
        value=$(printenv "$name" 2>/dev/null || true)

        if [ -n "$value" ]; then
            if [ "$first" -eq 0 ]; then
                printf ',\n'
            fi

            printf '  "%s": "%s"' "$name" "$(json_escape "$value")"
            first=0
        fi
    done

    printf '\n};\n'
} > "$ENV_CONFIG_PATH"

echo "env-config.js сформирован:"
cat "$ENV_CONFIG_PATH"

exec nginx -g 'daemon off;'
