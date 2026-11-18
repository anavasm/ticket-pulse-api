import { z } from "zod";
import pino from "pino";

const bootstrapLogger = pino({ level: "error" }, pino.destination(2));

const currencyCodes = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .url()
    .refine(
      (url) =>
        url.toLowerCase().startsWith("postgres://") ||
        url.toLowerCase().startsWith("postgresql://"),
      {
        message:
          "DATABASE_URL must start with 'postgres://' or 'postgresql://'",
      },
    ),
  REDIS_URL: z
    .url()
    .refine(
      (url) =>
        url.toLowerCase().startsWith("redis://") ||
        url.toLowerCase().startsWith("rediss://"),
      {
        message: "REDIS_URL must start with 'redis://' or 'rediss://'",
      },
    ),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CURRENCY: z.enum(currencyCodes),
  RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  MAX_ORDER_QUANTITY: z.coerce.number().int().positive().default(10),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32),
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  bootstrapLogger.error(
    {
      issues: _env.error.issues.map((issue) => ({
        variable: issue.path.join("."),
        message: issue.message,
      })),
    },
    "Invalid environment variables",
  );

  process.exit(1);
}

export const env = _env.data;
