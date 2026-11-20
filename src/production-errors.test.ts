import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lines = vi.hoisted(() => [] as string[]);

vi.mock("./shared/env.js", () => ({ env: { NODE_ENV: "production" } }));
vi.mock("./shared/logger.js", async () => {
  const { pino } = await import("pino");
  return {
    logger: pino(
      { level: "info" },
      { write: (line: string) => void lines.push(line) },
    ),
  };
});

import app from "./app.js";
import { requestIdMiddleware } from "./shared/middleware/request-id.middleware.js";
import { httpLoggingMiddleware } from "./shared/middleware/http-logging.middleware.js";
import { errorHandlerMiddleware } from "./shared/middleware/error-handler.middleware.js";

describe("production error handling", () => {
  beforeEach(() => {
    lines.length = 0;
  });

  it("normalizes malformed JSON without exposing its contents", async () => {
    const requestId = randomUUID();
    const secret = "sensitive-malformed-body";
    const response = await request(app)
      .post("/unknown")
      .set("X-Request-Id", requestId)
      .set("Content-Type", "application/json")
      .send(`{"value":"${secret}",`);

    expect(response.status).toBe(400);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON body",
        requestId,
      },
    });
    await vi.waitFor(() =>
      expect(lines.some((line) => line.includes("request completed"))).toBe(
        true,
      ),
    );
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(lines.join("")).not.toContain(secret);
    expect(lines.join("")).toContain(requestId);
  });

  it("normalizes an oversized JSON body and does not log request data", async () => {
    const requestId = randomUUID();
    const secret = "sensitive-payload-value";
    const response = await request(app)
      .post("/unknown?token=sensitive-query-value")
      .set("X-Request-Id", requestId)
      .set("Authorization", "Bearer sensitive-header-value")
      .set("Cookie", "session=sensitive-cookie-value")
      .send({ payload: secret + "x".repeat(102400) });

    expect(response.status).toBe(413);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body too large",
        requestId,
      },
    });
    await vi.waitFor(() =>
      expect(lines.some((line) => line.includes("request completed"))).toBe(
        true,
      ),
    );
    for (const value of [
      secret,
      "sensitive-query-value",
      "sensitive-header-value",
      "sensitive-cookie-value",
    ]) {
      expect(JSON.stringify(response.body)).not.toContain(value);
      expect(lines.join("")).not.toContain(value);
    }
    expect(lines.join("")).toContain(requestId);
  });

  it.each([
    ["Content-Type", "application/json; charset=unsupported"],
    ["Content-Encoding", "unsupported"],
  ])("normalizes unsupported %s", async (header, value) => {
    const requestId = randomUUID();
    const response = await request(app)
      .post("/unknown")
      .set("X-Request-Id", requestId)
      .set("Content-Type", "application/json")
      .set(header, value)
      .send('{"value":"secret"}');

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      error: {
        code: "UNSUPPORTED_ENCODING",
        message: "Unsupported request encoding",
        requestId,
      },
    });
    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  it("does not expose unexpected error details in responses or logs", async () => {
    const testApp = express();
    const requestId = randomUUID();
    const secret = "sensitive-error-detail";
    testApp.use(requestIdMiddleware);
    testApp.use(httpLoggingMiddleware);
    testApp.get("/error", () => {
      throw Object.assign(new Error(secret), { password: secret });
    });
    testApp.use(errorHandlerMiddleware);

    const response = await request(testApp)
      .get("/error?token=sensitive-query-value")
      .set("X-Request-Id", requestId)
      .set("Authorization", "Bearer sensitive-header-value");

    expect(response.status).toBe(500);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    });
    await vi.waitFor(() =>
      expect(lines.some((line) => line.includes("request errored"))).toBe(true),
    );
    for (const value of [
      secret,
      "sensitive-query-value",
      "sensitive-header-value",
      "stack",
    ]) {
      expect(JSON.stringify(response.body)).not.toContain(value);
      expect(lines.join("")).not.toContain(value);
    }
    expect(lines.join("")).toContain(requestId);
  });
});
