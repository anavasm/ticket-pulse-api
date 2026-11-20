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

const logLineSchema = z.object({
  level: z.number(),
  msg: z.string(),
  req: z.object({ id: z.string() }),
  res: z.object({ statusCode: z.number() }).optional(),
});

const expectRequestLogs = async (requestId: string) => {
  await vi.waitFor(() => {
    const logs = lines.map((line) => logLineSchema.parse(JSON.parse(line)));

    expect(
      logs.some((log) => log.level === 50 && log.msg === "Operational error"),
    ).toBe(true);
    expect(
      logs.some(
        (log) => log.msg === "request completed" && log.res?.statusCode === 404,
      ),
    ).toBe(true);
    expect(logs.every((log) => log.req.id === requestId)).toBe(true);
  });
};

describe("request logging", () => {
  beforeEach(() => {
    lines.length = 0;
  });

  it("includes the incoming X-Request-Id in the request logs", async () => {
    const requestId = randomUUID();

    await request(app).get("/").set("X-Request-Id", requestId);

    await expectRequestLogs(requestId);
  });

  it("includes the generated X-Request-Id in the request logs", async () => {
    const response = await request(app).get("/");

    await expectRequestLogs(response.headers["x-request-id"]);
  });

  it("logs the generated ID when the incoming one is invalid", async () => {
    const response = await request(app)
      .get("/")
      .set("X-Request-Id", "not-a-uuid");

    const requestId = response.headers["x-request-id"];
    expect(requestId).not.toBe("not-a-uuid");
    await expectRequestLogs(requestId);
  });
});
