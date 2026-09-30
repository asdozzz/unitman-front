FROM node:22.23.2 AS build-stage
WORKDIR /app
ARG ARG_API_HOST=http://localhost:8082/api
ARG ARG_CENTRIFUGE_HOST=ws://localhost:8000/connection/websocket

ENV API_HOST=$ARG_API_HOST
ENV CENTRIFUGE_HOST=$ARG_CENTRIFUGE_HOST

RUN echo $API_HOST
RUN echo $CENTRIFUGE_HOST


RUN npm install -g vite
COPY . .
RUN cp .env.dist .env
RUN yarn install
RUN yarn build

FROM nginx:latest AS prod
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY ./.docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
WORKDIR /usr/src/app
COPY entry.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
