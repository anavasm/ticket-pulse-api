import express from "express";
import { requestIdMiddleware } from "./shared/middleware/request-id.middleware.js";

const app = express();

app.use(requestIdMiddleware);
app.use(express.json());

export default app;
