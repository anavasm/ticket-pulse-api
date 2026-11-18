import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("requestIdMiddleware", () => {
  it("returns the incoming X-Request-Id when it is a valid UUID v4", async () => {
    const requestId = randomUUID();

    const response = await request(app)
      .get("/")
      .set("X-Request-Id", requestId);

    expect(response.headers["x-request-id"]).toBe(requestId);
  });

  it("generates a UUID v4 when the header is missing", async () => {
    const response = await request(app).get("/");

    expect(response.headers["x-request-id"]).toMatch(UUID_V4_REGEX);
  });

  it.each([
    ["not a UUID", "not-a-uuid"],
    ["a UUID of another version", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
  ])("replaces the header when it is %s", async (_label, invalidId) => {
    const response = await request(app)
      .get("/")
      .set("X-Request-Id", invalidId);

    expect(response.headers["x-request-id"]).toMatch(UUID_V4_REGEX);
    expect(response.headers["x-request-id"]).not.toBe(invalidId);
  });

  it("generates a different ID for each request without the header", async () => {
    const first = await request(app).get("/");
    const second = await request(app).get("/");

    expect(first.headers["x-request-id"]).not.toBe(
      second.headers["x-request-id"],
    );
  });
});
