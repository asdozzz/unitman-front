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

# --- CSP connect-src ---------------------------------------------------------
# Разрешаем только те origin, которые реально использует приложение: API и
# Centrifugo. Значения вычисляются из runtime-хостов; при необходимости
# оператор задаёт CSP_CONNECT_SRC явно (список через пробел, без 'self').
api_origin=$(printf '%s' "${VITE_API_HOST:-}" | sed -nE 's#^(https?://[^/]+).*#\1#p')
ws_origin=$(printf '%s' "${VITE_CENTRIFUGE_HOST:-}" | sed -nE 's#^(wss?://[^/]+).*#\1#p')

default_connect_src=""
[ -n "$api_origin" ] && default_connect_src="$api_origin"
[ -n "$ws_origin" ] && default_connect_src="${default_connect_src:+$default_connect_src }$ws_origin"

CSP_CONNECT_SRC="${CSP_CONNECT_SRC:-$default_connect_src}"
# Защита от инъекции в nginx-директиву: оставляем только допустимые для
# CSP source-выражения символы. Точка с запятой и кавычки отбрасываются.
CSP_CONNECT_SRC=$(printf '%s' "$CSP_CONNECT_SRC" | tr -cd 'A-Za-z0-9 :/.*_-')
export CSP_CONNECT_SRC

if [ -f /etc/nginx/templates/default.conf.template ]; then
    envsubst '${CSP_CONNECT_SRC}' \
        < /etc/nginx/templates/default.conf.template \
        > /etc/nginx/conf.d/default.conf
    echo "nginx: CSP connect-src = 'self' ${CSP_CONNECT_SRC}"
fi

exec nginx -g 'daemon off;'
