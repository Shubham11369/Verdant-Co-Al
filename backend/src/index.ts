import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Verdant AI Support running on http://0.0.0.0:${env.port}`);
});
