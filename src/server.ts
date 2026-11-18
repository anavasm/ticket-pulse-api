import app from "./app.js";
import { env } from "./shared/env.js";

const PORT = env.PORT;

app.listen(PORT);
