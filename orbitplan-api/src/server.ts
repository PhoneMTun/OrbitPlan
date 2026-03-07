import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`OrbitPlan API listening on :${env.port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. If the API is already running, reuse it. Otherwise run "npm run dev:restart".`);
    process.exit(1);
  }

  throw error;
});
