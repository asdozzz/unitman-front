FROM node:20.3 AS build-stage
WORKDIR /app
ARG API_HOST="http://10.0.142.101:8082/api"
ARG CENTRIFUGE_HOST="ws://10.0.142.101:8000/connection/websocket"
ENV VITE_API_HOST=$API_HOST
ENV VITE_CENTRIFUGE_HOST=$CENTRIFUGE_HOST

RUN echo $VITE_API_HOST
RUN echo $VITE_CENTRIFUGE_HOST
RUN npm install -g vite
COPY . .
RUN cp .env.dist .env
RUN yarn install
RUN yarn build

FROM nginx:latest AS prod
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY ./.docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
