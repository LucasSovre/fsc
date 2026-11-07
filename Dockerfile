# syntax=docker/dockerfile:1

FROM node:26-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
# Skills synchronization is only useful on the developer's machine.
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS source
COPY . .
RUN node node_modules/prisma/dist/prisma.js contract emit

FROM source AS migrate
USER node
CMD ["node", "node_modules/prisma/dist/prisma.js", "db", "migrate", "--no-interactive"]

FROM source AS worker
ENV NODE_ENV=production
USER node
CMD ["node", "--import", "tsx", "scripts/worker.ts"]

FROM source AS builder
RUN mkdir -p public && bun run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
