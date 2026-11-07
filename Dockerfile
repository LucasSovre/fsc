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

FROM source AS builder
RUN mkdir -p public && bun run build

FROM builder AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN chown -R node:node .next
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
ENTRYPOINT ["bash", "scripts/entrypoint.sh"]
