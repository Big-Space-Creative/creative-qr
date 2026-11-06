# Imagem única: o nginx serve o front compilado (app 100% estático: sem API e sem banco de dados).
# Build (na raiz do repositório): docker build -t creative-qr:TAG .

# ── Stage 1: build do front (Vue + Vite) ─────────────────────────────────────
# Debian (glibc), não Alpine: o type-check usa um binário nativo que só existe para glibc.
ARG NODE_VERSION=24
ARG PNPM_VERSION=12.4.2
FROM node:${NODE_VERSION}-bookworm-slim AS client-builder
ARG PNPM_VERSION
WORKDIR /build
RUN npm install -g pnpm@${PNPM_VERSION}

# Só os manifestos primeiro: a camada de dependências é reaproveitada enquanto eles não mudam.
COPY client/package.json client/pnpm-lock.yaml client/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY client/ ./
RUN pnpm build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# nginx sem root, escutando na porta 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-builder /build/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
