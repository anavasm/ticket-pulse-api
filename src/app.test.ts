import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app.js";

describe("app error handling", () => {
  it("returns a normalized 404 for an unknown route with the request ID", async () => {
    const requestId = randomUUID();
    const response = await request(app)
      .get("/nonexistent-route")
      .set("X-Request-Id", requestId);

    expect(response.status).toBe(404);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        requestId,
      },
    });
  });

  it("returns a normalized 400 for malformed JSON with the request ID", async () => {
    const requestId = randomUUID();
    const response = await request(app)
      .post("/nonexistent-route")
      .set("X-Request-Id", requestId)
      .set("Content-Type", "application/json")
      .send('{"privateValue":"do-not-expose",');

    expect(response.status).toBe(400);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON body",
        requestId,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("do-not-expose");
  });
});
