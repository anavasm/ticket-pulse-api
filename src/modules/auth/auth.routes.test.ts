import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";

describe("POST /auth/register", () => {
  it.each([
    ["an invalid email", { email: "invalid-email", password: "Clave123" }],
    ["an invalid password", { email: "user@example.com", password: "short" }],
    ["a missing password", { email: "user@example.com" }],
  ])("returns a normalized 400 for %s", async (_description, body) => {
    const requestId = randomUUID();
    const response = await request(app)
      .post("/auth/register")
      .set("X-Request-Id", requestId)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid registration data",
        requestId,
      },
    });
    if ("password" in body) {
      expect(JSON.stringify(response.body)).not.toContain(body.password);
    }
  });

  it("returns a normalized 400 with a generated request ID", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email: "user@example.com" });

    expect(response.status).toBe(400);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid registration data",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("returns 501 for valid data until registration is implemented", async () => {
    const requestId = randomUUID();
    const password = "Clave123";
    const response = await request(app)
      .post("/auth/register")
      .set("X-Request-Id", requestId)
      .send({ email: "user@example.com", password });

    expect(response.status).toBe(501);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Registration is not implemented",
        requestId,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
  });
});
