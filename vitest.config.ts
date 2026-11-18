import { defineConfig } from "vitest/config";

// Valores ficticios solo para tests; no son secretos reales.
export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "postgresql://test:test@localhost:5432/ticketpulse_test",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "test-only-access-secret-0123456789abcdef",
      JWT_REFRESH_SECRET: "test-only-refresh-secret-0123456789abcdef",
      CURRENCY: "EUR",
      PAYMENT_WEBHOOK_SECRET: "test-only-webhook-secret-0123456789abcdef",
    },
  },
});
