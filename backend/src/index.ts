import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

app.listen(config.PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${config.PORT}`);
});
