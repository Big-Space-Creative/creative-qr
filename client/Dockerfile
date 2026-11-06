# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
# Debian (glibc), não Alpine: o type-check usa um binário nativo que só existe para glibc.
ARG NODE_VERSION=24
ARG PNPM_VERSION=12.4.2
FROM node:${NODE_VERSION}-bookworm-slim AS build
ARG PNPM_VERSION
WORKDIR /app

RUN npm install -g pnpm@${PNPM_VERSION}

# Só os manifestos primeiro: a camada de dependências é reaproveitada enquanto eles não mudam.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- runtime ---------------------------------------------------------------
# nginx sem root (porta 8080). O app é 100% estático: não há servidor de aplicação.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
