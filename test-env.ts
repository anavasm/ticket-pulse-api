import { config } from "dotenv";
import { z } from "zod";

const result = config({ path: ".env.test", quiet: true });

if (result.error && (result.error as NodeJS.ErrnoException).code !== "ENOENT") {
  throw result.error;
}

const testDatabaseUrlSchema = z
  .url()
  .refine(
    (url) =>
      url.toLowerCase().startsWith("postgres://") ||
      url.toLowerCase().startsWith("postgresql://"),
  );

const testDatabaseUrl = testDatabaseUrlSchema.safeParse(
  process.env.TEST_DATABASE_URL,
);

if (!testDatabaseUrl.success) {
  throw new Error(
    "TEST_DATABASE_URL must be a PostgreSQL URL. Set it in .env.test or the environment.",
  );
}

export const TEST_DATABASE_URL = testDatabaseUrl.data;
