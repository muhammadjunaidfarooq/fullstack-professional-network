import mongoose from "mongoose";
import { assertRequiredEnv, env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

const start = async () => {
  try {
    assertRequiredEnv();
    await connectDB(env.mongoUri);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start();
