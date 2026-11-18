# --- Сборка статики -----------------------------------------------------------
FROM node:22.23.2 AS build-stage
WORKDIR /app

# Значения по умолчанию, которые Vite инлайнит в бандл.
# Переопределяются на сборке: docker build --build-arg ARG_API_HOST=...
ARG ARG_API_HOST=http://localhost:8082/api
ARG ARG_CENTRIFUGE_HOST=ws://localhost:8000/connection/websocket

# `:-` защищает от пустого build-arg: compose может передать незаполненную
# переменную, и тогда в бандл попал бы пустой хост.
ENV VITE_API_HOST=${ARG_API_HOST:-http://localhost:8082/api}
ENV VITE_CENTRIFUGE_HOST=${ARG_CENTRIFUGE_HOST:-ws://localhost:8000/connection/websocket}

# Манифесты копируются отдельно: слой с зависимостями переиспользуется,
# пока не менялся yarn.lock.
COPY package.json yarn.lock ./
RUN yarn install

COPY . .
# .env нужен для значений, которые не переопределяются build-arg:
# локали и флаг отладки.
RUN cp .env.dist .env && yarn build

# --- Раздача статики ----------------------------------------------------------
FROM nginx:latest AS prod

# Значения по умолчанию для запуска. entry.sh превращает их в env-config.js,
# который читает браузер, поэтому один и тот же образ можно подключить к разным
# бэкендам без пересборки: docker run -e VITE_API_HOST=...
# ARG объявлены повторно, чтобы build-arg задавал и runtime-значение по умолчанию.
ARG ARG_API_HOST=http://localhost:8082/api
ARG ARG_CENTRIFUGE_HOST=ws://localhost:8000/connection/websocket

ENV VITE_API_HOST=${ARG_API_HOST:-http://localhost:8082/api} \
    VITE_CENTRIFUGE_HOST=${ARG_CENTRIFUGE_HOST:-ws://localhost:8000/connection/websocket} \
    VITE_DEBUG_PROGRESS=true

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY ./.docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./entry.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]
