import { pinoHttp } from "pino-http";
import type { Request, Response } from "express";
import { logger } from "../logger.js";

export const httpLoggingMiddleware = pinoHttp<Request, Response>({
  logger,
  genReqId: (_req, res) => res.locals.requestId,
  serializers: {
    req: (req) => ({ id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: () => ({ message: "Request failed" }),
  },
});
