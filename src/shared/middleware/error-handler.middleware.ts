import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../env.js";

export const errorHandlerMiddleware: ErrorRequestHandler = (
  err: unknown,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(err);
  }

  const localRequestId = res.locals.requestId;

  if (err instanceof AppError) {
    req.log.error({ statusCode: err.statusCode }, "Operational error");
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: localRequestId,
      },
    });
    return;
  }

  if (err instanceof Error) {
    if (env.NODE_ENV === "development") {
      const errorStack = err.stack
        ?.split("\n")
        .filter((line) => /^\s+at /.test(line))
        .join("\n");
      req.log.error({ errorStack }, "Unexpected error");
    } else {
      req.log.error("Unexpected error");
    }
  } else {
    req.log.error("Unexpected non-error thrown");
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId: localRequestId,
    },
  });
};
