import { describe, expect, it } from "vitest";
import { registerSchema } from "./register.schema.js";

describe("registerSchema", () => {
  it("normalizes the email and preserves the password", () => {
    const result = registerSchema.safeParse({
      email: "  User+Events@Example.com  ",
      password: " Clave123 ",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw result.error;
    }

    expect(result.data).toEqual({
      email: "user+events@example.com",
      password: " Clave123 ",
    });
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "Clave123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected an invalid email");
    }

    expect(result.error.issues.some((issue) => issue.path[0] === "email")).toBe(
      true,
    );
  });

  it("accepts a password with exactly 8 Unicode code points", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Clave12🔑",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a password without an uppercase letter", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "clave123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected an invalid password");
    }

    expect(
      result.error.issues.some((issue) => issue.path[0] === "password"),
    ).toBe(true);
  });

  it("rejects a password with only 7 Unicode code points", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Clave1🔑",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected a password that is too short");
    }

    expect(
      result.error.issues.some((issue) => issue.path[0] === "password"),
    ).toBe(true);
  });

  it("accepts a password with exactly 128 Unicode code points", () => {
    const password = "Clave1" + "🔑".repeat(122);
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password,
    });

    expect(Array.from(password)).toHaveLength(128);
    expect(result.success).toBe(true);
  });

  it("rejects a password with 129 Unicode code points", () => {
    const password = "Clave1" + "🔑".repeat(123);
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password,
    });

    expect(Array.from(password)).toHaveLength(129);
    expect(Buffer.byteLength(password, "utf8")).toBeLessThanOrEqual(512);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected a password that is too long");
    }

    expect(
      result.error.issues.some((issue) => issue.path[0] === "password"),
    ).toBe(true);
  });

  it("rejects a password without a lowercase letter", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "CLAVE123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected an invalid password");
    }

    expect(
      result.error.issues.some((issue) => issue.path[0] === "password"),
    ).toBe(true);
  });

  it("rejects a password without a number", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "ClaveABC",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected an invalid password");
    }

    expect(
      result.error.issues.some((issue) => issue.path[0] === "password"),
    ).toBe(true);
  });

  it("accepts a password with and without symbols", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Clave123",
    });

    expect(result.success).toBe(true);

    const resultWithSymbol = registerSchema.safeParse({
      email: "user@example.com",
      password: "Clave123!",
    });

    expect(resultWithSymbol.success).toBe(true);
  });

  it.each(["Árbol١٢٣", "Árbol١٢٣!"])(
    "accepts Unicode letters and digits in %s",
    (password) => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each([
    ["missing email", { password: "Clave123" }, "email"],
    ["missing password", { email: "user@example.com" }, "password"],
    ["non-string email", { email: 123, password: "Clave123" }, "email"],
    [
      "non-string password",
      { email: "user@example.com", password: 123 },
      "password",
    ],
  ])("rejects %s", (_description, input, field) => {
    const result = registerSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected invalid input");
    }

    expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
      true,
    );
  });

  it("strips an unexpected role from the parsed input", () => {
    const result = registerSchema.parse({
      email: "user@example.com",
      password: "Clave123",
      role: "ADMIN",
    });

    expect(result).toEqual({
      email: "user@example.com",
      password: "Clave123",
    });
  });

  it("accepts a password with exactly 512 UTF-8 bytes", () => {
    const password = "𝐀𝐚𝟏" + "🔑".repeat(125);

    expect(Array.from(password)).toHaveLength(128);
    expect(Buffer.byteLength(password, "utf8")).toBe(512);
    expect(
      registerSchema.safeParse({ email: "user@example.com", password }).success,
    ).toBe(true);
  });

  it("reports the byte limit when the password exceeds 512 UTF-8 bytes", () => {
    const password = "𝐀𝐚𝟏" + "🔑".repeat(126);
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password,
    });

    expect(Array.from(password)).toHaveLength(129);
    expect(Buffer.byteLength(password, "utf8")).toBe(516);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected a password exceeding the byte limit");
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["password"],
          message: "Password must be at most 512 bytes long",
        }),
      ]),
    );
  });
});
