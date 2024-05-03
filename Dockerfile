FROM node:lts-alpine as build-stage
WORKDIR /app

# install vite globally
RUN npm install -g vite
# copy all filtes
COPY . .
RUN cp .env.dist .env
# install all deps
RUN yarn install
RUN yarn build
# vite default port
#CMD ["yarn", "run", "dev"]

FROM nginx:latest as prod
COPY --from=build-stage /app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
