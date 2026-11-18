import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// vi.mock se eleva al inicio del archivo, por eso el array se crea con vi.hoisted.
const lines = vi.hoisted(() => [] as string[]);

vi.mock("../logger.js", async () => {
  const { pino } = await import("pino");
  return {
    logger: pino(
      { level: "info" },
      { write: (line: string) => void lines.push(line) },
    ),
  };
});

import app from "../../app.js";

const logLineSchema = z.object({ req: z.object({ id: z.string() }) });

const loggedRequestIds = () =>
  lines.map((line) => logLineSchema.parse(JSON.parse(line)).req.id);

describe("request logging", () => {
  beforeEach(() => {
    lines.length = 0;
  });

  it("includes the incoming X-Request-Id in the request logs", async () => {
    const requestId = randomUUID();

    await request(app).get("/").set("X-Request-Id", requestId);

    await vi.waitFor(() => {
      expect(loggedRequestIds()).toEqual([requestId]);
    });
  });

  it("includes the generated X-Request-Id in the request logs", async () => {
    const response = await request(app).get("/");

    await vi.waitFor(() => {
      expect(loggedRequestIds()).toEqual([response.headers["x-request-id"]]);
    });
  });

  it("logs the generated ID when the incoming one is invalid", async () => {
    const response = await request(app)
      .get("/")
      .set("X-Request-Id", "not-a-uuid");

    await vi.waitFor(() => {
      expect(loggedRequestIds()).toEqual([response.headers["x-request-id"]]);
    });
    expect(loggedRequestIds()).not.toContain("not-a-uuid");
  });
});
