import mongoose from "mongoose";
import request from "supertest";
import sharp from "sharp";

process.env.NODE_ENV = "test";

const { createApp } = await import("../app.js");

export const app = createApp();
export const api = () => request(app);

const hidePassword = (uri) => uri.replace(/\/\/([^:/@]+):[^@]+@/, "//$1:****@");

/** Connect to a throw-away database. Uses MONGO_URI_TEST or a local mongod. */
export const connectTestDb = async () => {
  const base = process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017";
  const dbName = `pn_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  try {
    await mongoose.connect(base, { dbName, serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(
      `Cannot connect to the test MongoDB at ${hidePassword(base)}.\n` +
        "Start a local MongoDB, or set MONGO_URI_TEST in backend/.env (for example your Atlas URI).\n" +
        `Original error: ${error.message}`
    );
  }
  await mongoose.connection.syncIndexes();
};

export const disconnectTestDb = async () => {
  // Only drop the throw-away database if we actually connected to it.
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

let counter = 0;

/** Register a new user and return { token, user }. */
export const registerUser = async (overrides = {}) => {
  counter += 1;
  const data = {
    name: `Test User ${counter}`,
    username: `user_${counter}_${Date.now() % 100000}`,
    email: `user${counter}_${Date.now()}@example.com`,
    password: "password123",
    ...overrides,
  };
  const res = await api().post("/api/auth/register").send(data);
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, password: data.password, email: data.email };
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const makePng = (width = 32, height = 32) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 102, b: 194 } },
  })
    .png()
    .toBuffer();
