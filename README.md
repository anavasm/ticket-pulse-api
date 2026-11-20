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

- Node.js 20 or later
- TypeScript with strict compiler options
- Express 5
- Zod for environment validation
- Pino and pino-http for structured logging
- Vitest and Supertest for tests
- ESLint and Prettier for code quality and formatting

PostgreSQL, Prisma, Redis, and background jobs are planned components and are
not yet integrated.

## Prerequisites

- Node.js 20 or later
- npm

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

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
   these example values for deployed environments. The database and Redis URLs
   are currently validated as configuration; this does not imply that their
   integrations are already implemented.

3. Start the development server:

   ```sh
   npm run dev
   ```

   The server listens on the configured `PORT` (3000 by default).

## Available scripts

| Command                | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Run the API with `tsx` and load `.env`.                      |
| `npm test`             | Run the Vitest test suite.                                   |
| `npm run typecheck`    | Type-check the project without emitting files.               |
| `npm run build`        | Compile TypeScript into `dist/`.                             |
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

Domain endpoints and the ticket-purchasing workflows are being added
incrementally.

## Security and project status

The API is under active development and is not production-ready. Payment
processing is simulated. Do not use real credentials, payment details, or
sensitive customer data. Keep secrets in local or deployment environment
configuration and never commit them.
