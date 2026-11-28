import express from "express";
import { requestIdMiddleware } from "./shared/middleware/request-id.middleware.js";
import { httpLoggingMiddleware } from "./shared/middleware/http-logging.middleware.js";
import { notFoundMiddleware } from "./shared/middleware/not-found.middleware.js";
import { errorHandlerMiddleware } from "./shared/middleware/error-handler.middleware.js";
import { jsonErrorMiddleware } from "./shared/middleware/json-error.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";

const app = express();

app.use(requestIdMiddleware);
app.use(httpLoggingMiddleware);

app.use(express.json());
app.use(jsonErrorMiddleware);

//TODO: Add your routes here before the notFoundMiddleware and errorHandlerMiddleware
app.use("/auth", authRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
