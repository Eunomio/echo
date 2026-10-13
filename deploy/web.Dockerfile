ARG NODE_IMAGE=node:24-alpine
ARG CADDY_IMAGE=caddy:2-alpine
FROM ${NODE_IMAGE} AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_ICP_RECORD=
ENV VITE_API_BASE_URL=/api \
    VITE_ICP_RECORD=${VITE_ICP_RECORD}
RUN npm run build

FROM ${CADDY_IMAGE}
COPY --from=frontend /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
