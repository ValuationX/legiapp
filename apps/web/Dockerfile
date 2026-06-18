# Build the SPA, then serve it with nginx (which also proxies /api to the API).
FROM node:22-slim AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build -w @legiapp/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
