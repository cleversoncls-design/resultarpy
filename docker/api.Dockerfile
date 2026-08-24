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
RUN groupadd --system --gid 1001 appgroup \
  && useradd --system --uid 1001 --gid appgroup appuser
COPY --from=dependencies --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/drizzle-pg ./drizzle-pg
COPY --from=build --chown=appuser:appgroup /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
