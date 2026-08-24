FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set node-linker hoisted && pnpm install --frozen-lockfile
COPY . .
RUN mkdir -p node_modules/react-native-css-interop/.cache && touch node_modules/react-native-css-interop/.cache/web.css
ARG EXPO_PUBLIC_API_BASE_URL=
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}
RUN EXPO_NO_METRO_WORKSPACE_ROOT=1 pnpm exec expo export --platform web

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
