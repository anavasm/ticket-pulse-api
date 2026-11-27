# TicketPulse API

TicketPulse API is a backend for an event ticketing platform, designed around
reliable API design, observability, security, and the challenges of handling
concurrent ticket reservations. Payment processing is simulated; the service is
not intended to process real payments or production customer data.

The application is under active development. The current foundation includes
an Express 5 and TypeScript API, validated environment configuration, structured
request logging, request ID correlation, normalized error handling, and an
automated test suite. The platform is being developed to support secure
authentication, event management, ticket reservations, and asynchronous
processing.

## Tech stack

- Node.js `^20.19.0`, `^22.13.0`, or `>=24.0.0`
- TypeScript with strict compiler options
- Express 5
- PostgreSQL 15+ and Prisma ORM 7
- Zod for environment validation
- Pino and pino-http for structured logging
- Vitest and Supertest for tests
- ESLint and Prettier for code quality and formatting

The Prisma client is configured, but no domain models or database migrations
have been added yet. Redis and background jobs are not yet integrated.

## Prerequisites

- Node.js `^20.19.0`, `^22.13.0`, or `>=24.0.0`
- npm
- PostgreSQL 15 or later for database-backed features

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

   The development, test, typecheck, and build scripts generate Prisma Client
   from `prisma/schema.prisma`. Generation does not connect to PostgreSQL or
   apply migrations.

2. Create a `.env` file in the project root. The application validates its
   configuration at startup. For local development, provide:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/ticketpulse
   REDIS_URL=redis://localhost:6379
   JWT_ACCESS_SECRET=replace-with-at-least-32-characters
   JWT_REFRESH_SECRET=replace-with-at-least-32-characters
   CURRENCY=EUR
   RESERVATION_TTL_SECONDS=600
   MAX_ORDER_QUANTITY=10
   PAYMENT_WEBHOOK_SECRET=replace-with-at-least-32-characters
   PAYMENT_WEBHOOK_TOLERANCE_SECONDS=300
   LOG_LEVEL=info
   ```

   Use local-only values for development. Do not commit `.env` files or use
   these example values for deployed environments. The Prisma CLI loads
   `.env` through `prisma.config.ts`; an existing `DATABASE_URL` environment
   variable takes precedence. The API validates its configuration with Zod.
   The Prisma client connects lazily when it is first used; no endpoint uses
   the database yet. Redis is not integrated.

3. Start the development server:

   ```sh
   npm run dev
   ```

   The server listens on the configured `PORT` (3000 by default).

## Test configuration

Copy `.env.test.example` to `.env.test` and set `TEST_DATABASE_URL` to a
separate local test database using test-only credentials. `.env.test` is ignored
by Git. Alternatively, set `TEST_DATABASE_URL` in the environment; an existing
environment variable takes precedence over `.env.test`. Vitest refuses to start
if the variable is missing and supplies its value to the application as
`DATABASE_URL`.

When migrations exist, apply the committed migrations to the test database with:

```sh
npm run db:migrate:test
```

This command uses `prisma.test.config.ts`, which reads the same
`TEST_DATABASE_URL` as Vitest and does not fall back to `DATABASE_URL`. It uses
`prisma migrate deploy`, not `migrate dev` or `migrate reset`, and does not
run automatically with `npm test`. Check the target first: the configuration
validates the URL format but cannot prove that the database is isolated. Use a
dedicated database and restricted credentials, never development or production.

## Available scripts

| Command                | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Run the API with `tsx` and load `.env`.                      |
| `npm test`             | Run the Vitest test suite.                                   |
| `npm run db:migrate:test` | Apply committed migrations to the configured test database. |
| `npm run typecheck`    | Type-check the project without emitting files.               |
| `npm run build`        | Generate Prisma Client and compile TypeScript into `dist/`.  |
| `npm start`            | Start the compiled server from `dist/`.                      |
| `npm run lint`         | Lint the project with ESLint.                                |
| `npm run format`       | Format source and project configuration files with Prettier. |
| `npm run format:check` | Check formatting without modifying files.                    |

## Current API foundation

- Each request receives a validated `X-Request-Id` or a generated UUID.
- Request logs are structured with Pino and correlated by request ID.
- Errors use a consistent JSON response; unexpected errors do not expose stack
  traces in production.
- Runtime environment variables are validated with Zod before the server
  starts.
- Prisma Client is configured with the PostgreSQL driver adapter and the
  validated database URL. Its generated code is not committed; development,
  test, typecheck, and build scripts regenerate it.

The Prisma schema contains no models yet. After adding or changing a model,
run `npx prisma generate`; create and apply migrations only after confirming
which database `DATABASE_URL` targets. Use a separate database for tests.

Domain endpoints and the ticket-purchasing workflows are being added
incrementally.

## Security and project status

The API is under active development and is not production-ready. Payment
processing is simulated. Do not use real credentials, payment details, or
sensitive customer data. Keep secrets in local or deployment environment
configuration and never commit them.
