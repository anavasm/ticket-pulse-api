import { Router } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { registerSchema } from "./register.schema.js";

const authRouter = Router();

authRouter.post("/register", (req, _res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = "Invalid registration data";

    return next(new AppError(400, "INVALID_INPUT", message));
  }

  next(new AppError(501, "NOT_IMPLEMENTED", "Registration is not implemented"));
});

export default authRouter;
