# fsc

A minimal next app with Prisma 8 and Prisma Composer.

## Deploy with Docker

Requires Docker Engine and Docker Compose v2 or newer.

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD in .env (for example, generate it with openssl rand -hex 32).
docker compose up -d --build
```

Open http://localhost:3000 (or the port set by `APP_PORT`). Compose starts PostgreSQL,
waits for it to be ready, applies the committed Prisma 8 migrations in a separate
container, then starts the app. A failed migration prevents the app from starting.
The starter users are inserted idempotently on the first database query.

The production image uses Next.js standalone output and runs as a non-root user.
Dependencies are installed from `bun.lock`; `.env` files and local build output are
excluded from the image. PostgreSQL data lives in the `postgres_data` named volume,
and the database port is only accessible inside the Compose network.

```bash
docker compose logs -f app migrate
docker compose down
# Rebuild and redeploy after changing the application or migrations:
docker compose up -d --build
```

`docker compose down` preserves the database volume. Keep the same PostgreSQL
credentials when reusing that volume: changing `.env` does not change an existing
database's password. Place your HTTPS reverse proxy in front of the app when
deploying publicly.

To deploy against an external PostgreSQL database, build both targets and supply
the same `DATABASE_URL` at runtime. Apply migrations before starting the app:

```bash
docker build --target migrate -t fsc-migrate .
docker build -t fsc .
docker run --rm --env DATABASE_URL fsc-migrate
docker run -d --name fsc --restart unless-stopped -p 3000:3000 --env DATABASE_URL fsc
```

Export `DATABASE_URL` in your shell first. No database credentials are needed at
image build time.

## Run locally

```bash
bun run dev:composer
```

This builds the app and starts it with Composer. PostgreSQL projects get a local Prisma Postgres database and apply the committed migrations automatically.

## Deploy to Prisma Compute

```bash
bun run deploy
```

The deploy script builds the framework output, provisions Prisma Postgres when selected, applies migrations, and deploys the app to Prisma Compute.

The starter users are inserted idempotently from `src/prisma/seed.ts` on the first database query through the Composer service binding.


## Prisma

- Contract: `src/prisma/contract.prisma`
- Prisma and Composer config: `prisma.config.ts`
- Composer app: `module.ts` and `service.ts`

After changing the contract, run:

```bash
bun run contract:emit
bun run migration:plan --name describe_change
```

Review and commit `migrations/` together with the contract artifacts. Docker
replays those migrations with `prisma db migrate`; it never generates schema
changes during deployment. The committed `db` ref records the origin for the next
plan. After planning, advance it with
`bunx prisma migration ref set db <new-migration-to-hash>` and commit it too.

To use the framework's development server directly, run `bun run dev`. This direct
mode requires a reachable `DATABASE_URL`. Compose's database is not published on
the host; use an external/local PostgreSQL instance for this mode, or run the full
application through Compose.
