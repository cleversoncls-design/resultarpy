FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set node-linker hoisted && pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Alguns pacotes da imagem-base (tzdata, perl-base) costumam ficar um pouco atrás
# da versão corrigida que o Debian já publicou (ex.: DLA-4792-1 para o tzdata;
# vários CVEs do perl-base), o que faz o scan de vulnerabilidades do CI barrar o
# build mesmo havendo correção disponível — é só a base desatualizada. Atualizar
# esses pacotes aqui resolve; se o scan apontar outro pacote Debian com correção,
# acrescente o nome na lista abaixo.
RUN apt-get update \
  && apt-get install --only-upgrade -y tzdata perl-base \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  && groupadd --system --gid 1001 appgroup \
  && useradd --system --uid 1001 --gid appgroup appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=dependencies --chown=appuser:appgroup /app/node_modules/dotenv ./node_modules/dotenv
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
