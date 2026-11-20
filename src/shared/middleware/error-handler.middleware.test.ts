import { PassThrough } from "node:stream";
import express from "express";
import type { RequestHandler } from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import { requestIdMiddleware } from "./request-id.middleware.js";
import { errorHandlerMiddleware } from "./error-handler.middleware.js";
import { jsonErrorMiddleware } from "./json-error.middleware.js";

vi.mock("../env.js", () => ({ env: { NODE_ENV: "development" } }));

function createTestLogger() {
  const stream = new PassThrough();
  const lines: string[] = [];

  stream.on("data", (chunk: Buffer) => {
    lines.push(chunk.toString("utf8"));
  });

  const logger = pino({ level: "error" }, stream);

  const getEntries = (): Array<Record<string, unknown>> =>
    lines
      .join("")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

  return { logger, getEntries };
}

describe("errorHandlerMiddleware", () => {
  it("normalizes an operational error and logs it with its requestId", async () => {
    const { logger, getEntries } = createTestLogger();
    const app = express();

    app.use(requestIdMiddleware);
    app.use(
      pinoHttp({
        logger,
        genReqId: (_req, res) => res.locals.requestId,
      }),
    );
    app.get("/conflict", () => {
      throw new AppError(409, "RESOURCE_CONFLICT", "Resource already exists");
    });
    app.use(errorHandlerMiddleware);

    const response = await request(app).get("/conflict");
    const requestId = response.headers["x-request-id"];

    expect(typeof requestId).toBe("string");
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "RESOURCE_CONFLICT",
        message: "Resource already exists",
        requestId,
      },
    });

    const errorEntry = getEntries().find(
      (entry) =>
        entry.level === 50 &&
        entry.msg === "Operational error" &&
        entry.statusCode === 409,
    );
    expect(errorEntry).toHaveProperty("req.id", requestId);
  });

  it("normalizes an unexpected sync error and registers stack and requestId on Pino", async () => {
    const { logger, getEntries } = createTestLogger();
    const app = express();

    app.use(requestIdMiddleware);
    app.use(
      pinoHttp({
        logger,
        genReqId: (_req, res) => res.locals.requestId,
      }),
    );
    app.get("/sync-error", () => {
      throw new Error("Unexpected sync error");
    });

    app.use(errorHandlerMiddleware);

    const response = await request(app).get("/sync-error");
    expect(response.status).toBe(500);
    const headerRequestId = response.headers["x-request-id"];
    expect(typeof headerRequestId).toBe("string");

    const body = response.body as {
      error: { code: string; message: string; requestId: string };
    };
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred");
    expect(body.error.requestId).toBe(headerRequestId);
    expect(JSON.stringify(body)).not.toContain("Unexpected sync error");
    const entries = getEntries();
    const errorEntry = entries.find(
      (entry) => entry.msg === "Unexpected error",
    );

    expect(errorEntry).toBeDefined();
    expect(errorEntry).toHaveProperty(
      "errorStack",
      expect.stringContaining("    at "),
    );
    expect(errorEntry).toHaveProperty("req.id", headerRequestId);
    expect(JSON.stringify(entries)).not.toContain("Unexpected sync error");
  });

  it("normalizes a rejected async route and logs the error with its requestId", async () => {
    const { logger, getEntries } = createTestLogger();
    const app = express();

    app.use(requestIdMiddleware);
    app.use(
      pinoHttp({
        logger,
        genReqId: (_req, res) => res.locals.requestId,
      }),
    );
    app.get("/async-error", async () => {
      await Promise.reject(new Error("Unexpected async error"));
    });
    app.use(errorHandlerMiddleware);

    const response = await request(app).get("/async-error");
    const requestId = response.headers["x-request-id"];

    expect(typeof requestId).toBe("string");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "Unexpected async error",
    );

    const errorEntry = getEntries().find(
      (entry) => entry.msg === "Unexpected error",
    );
    expect(errorEntry).toHaveProperty("req.id", requestId);
    expect(errorEntry).toHaveProperty(
      "errorStack",
      expect.stringContaining("    at "),
    );
  });

  it("normalizes an async rejection that is not an Error without exposing it", async () => {
    const { logger, getEntries } = createTestLogger();
    const app = express();
    const rejectedValue = "private rejection value";

    app.use(requestIdMiddleware);
    app.use(
      pinoHttp({
        logger,
        genReqId: (_req, res) => res.locals.requestId,
      }),
    );
    app.get("/non-error", async () => {
      await Promise.reject(rejectedValue);
    });
    app.use(errorHandlerMiddleware);

    const response = await request(app).get("/non-error");
    const requestId = response.headers["x-request-id"];

    expect(typeof requestId).toBe("string");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(rejectedValue);

    const entries = getEntries();
    const errorEntry = entries.find(
      (entry) =>
        entry.level === 50 && entry.msg === "Unexpected non-error thrown",
    );
    expect(errorEntry).toHaveProperty("req.id", requestId);
    expect(JSON.stringify(entries)).not.toContain(rejectedValue);
  });

  it("normalizes malformed JSON as a 400 and logs it with its requestId", async () => {
    const { logger, getEntries } = createTestLogger();
    const app = express();
    const route = vi.fn<RequestHandler>((_req, res) => {
      res.sendStatus(204);
    });

    app.use(requestIdMiddleware);
    app.use(
      pinoHttp({
        logger,
        genReqId: (_req, res) => res.locals.requestId,
      }),
    );
    app.use(express.json());
    app.use(jsonErrorMiddleware);

    app.post("/json", route);
    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .post("/json")
      .set("Content-Type", "application/json")
      .send('{"privateValue":"do-not-expose",');
    const requestId = response.headers["x-request-id"];

    expect(typeof requestId).toBe("string");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON body",
        requestId,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("do-not-expose");
    expect(route).not.toHaveBeenCalled();

    const entries = getEntries();
    expect(JSON.stringify(entries)).not.toContain("do-not-expose");
    const errorEntry = entries.find((entry) => entry.level === 50);
    expect(errorEntry).toHaveProperty("req.id", requestId);
  });

  it.each([
    ["a different error type", "other.error", 400],
    ["a different status", "entity.parse.failed", 500],
  ])(
    "forwards %s from before the JSON error middleware",
    async (_label, type, status) => {
      const { logger, getEntries } = createTestLogger();
      const app = express();
      const originalError = Object.assign(new Error("Parser failure"), {
        type,
        status,
      });

      app.use(requestIdMiddleware);
      app.use(
        pinoHttp({
          logger,
          genReqId: (_req, res) => res.locals.requestId,
        }),
      );
      app.use((_req, _res, next) => next(originalError));
      app.use(jsonErrorMiddleware);
      app.use(errorHandlerMiddleware);

      const response = await request(app).get("/");
      const requestId = response.headers["x-request-id"];

      expect(typeof requestId).toBe("string");
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
          requestId,
        },
      });
      const errorEntry = getEntries().find(
        (entry) => entry.msg === "Unexpected error",
      );
      expect(errorEntry).toHaveProperty("req.id", requestId);
      expect(errorEntry).toHaveProperty(
        "errorStack",
        expect.stringContaining("    at "),
      );
    },
  );
});
