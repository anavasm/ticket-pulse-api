import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const jsonErrorMiddleware: ErrorRequestHandler = (
  err: unknown,
  _req,
  _res,
  next,
) => {
  if (err instanceof Error && "type" in err && "status" in err) {
    if (err.type === "entity.parse.failed" && err.status === 400) {
      return next(new AppError(400, "INVALID_JSON", "Invalid JSON body"));
    }

    if (err.type === "entity.too.large" && err.status === 413) {
      return next(
        new AppError(413, "PAYLOAD_TOO_LARGE", "Request body too large"),
      );
    }

    if (
      (err.type === "charset.unsupported" ||
        err.type === "encoding.unsupported") &&
      err.status === 415
    ) {
      return next(
        new AppError(
          415,
          "UNSUPPORTED_ENCODING",
          "Unsupported request encoding",
        ),
      );
    }

    if (err.type === "request.size.invalid" && err.status === 400) {
      return next(
        new AppError(400, "INVALID_BODY_SIZE", "Invalid request body size"),
      );
    }
  }

  return next(err);
};
