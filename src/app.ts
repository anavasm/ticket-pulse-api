import express from "express";
import { requestIdMiddleware } from "./shared/middleware/request-id.middleware.js";
import { logger } from "./shared/logger.js";
import { pinoHttp } from "pino-http";

const app = express();

app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (_req, res) => res.locals.requestId,
  }),
);

app.use(express.json());

export default app;
