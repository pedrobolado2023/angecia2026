# ==============================================================================
# HÓSPEDE CLUB • WACLI GATEWAY DOCKERFILE
# Utiliza Debian Slim (glibc) para compatibilidade nativa com o binário Go CGO
# ==============================================================================

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tar \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Baixa e extrai o binário oficial do openclaw/wacli (v0.26.0)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then WACLI_ARCH="linux_amd64"; else WACLI_ARCH="linux_arm64"; fi && \
    curl -fsSL "https://github.com/openclaw/wacli/releases/download/v0.26.0/wacli_0.26.0_${WACLI_ARCH}.tar.gz" -o wacli.tar.gz && \
    tar -xzf wacli.tar.gz -C /usr/local/bin && \
    rm wacli.tar.gz && \
    chmod +x /usr/local/bin/wacli

# Instala dependências do gateway a partir de services/wacli/
COPY services/wacli/package.json ./package.json
RUN npm install --production

COPY services/wacli/server.js ./server.js

# Diretórios para persistência do banco SQLite e chaves de sessão
RUN mkdir -p /data/store /data/state /data/config /data/cache

ENV WACLI_STORE_DIR=/data/store \
    XDG_STATE_HOME=/data/state \
    XDG_CONFIG_HOME=/data/config \
    XDG_CACHE_HOME=/data/cache \
    PORT=3001

VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server.js"]


