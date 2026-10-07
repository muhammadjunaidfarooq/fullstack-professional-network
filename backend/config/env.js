import dotenv from "dotenv";

dotenv.config({ quiet: true });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: toInt(process.env.PORT, 9090),
  mongoUri: process.env.MONGO_URI || "",
  // Comma-separated list of frontend origins allowed to call the API.
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
  sessionTtlDays: toInt(process.env.SESSION_TTL_DAYS, 7),
  maxSessionsPerUser: 5,
  // Number of reverse proxies in front of the app (Render/Railway = 1).
  trustProxy: toInt(process.env.TRUST_PROXY, 0),
};

export const assertRequiredEnv = () => {
  if (!env.mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Copy backend/.env.example to backend/.env and fill it in."
    );
  }
};
