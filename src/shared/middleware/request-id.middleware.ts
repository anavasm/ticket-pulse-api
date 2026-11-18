import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { z } from "zod";

const requestIdSchema = z.uuidv4();

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const parsed = requestIdSchema.safeParse(req.get("X-Request-Id"));
  const requestId = parsed.success ? parsed.data : randomUUID();

  res.setHeader("X-Request-Id", requestId);
  next();
};
