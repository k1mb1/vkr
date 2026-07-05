FROM node:22-alpine AS build
WORKDIR /app

# Nuxt/Nitro build is memory-hungry; the default Node heap (~2 GB) OOMs.
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN NODE_ENV=production pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.output/ ./

USER app

EXPOSE 3000

CMD ["node", "server/index.mjs"]