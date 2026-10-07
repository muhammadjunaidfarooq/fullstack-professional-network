import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, connectTestDb, disconnectTestDb, registerUser } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

describe("auth", () => {
  test("register validates input", async () => {
    const missing = await api().post("/api/auth/register").send({ email: "a@b.com" });
    assert.equal(missing.status, 400);

    const shortPassword = await api()
      .post("/api/auth/register")
      .send({ name: "Bob", username: "bob_1", email: "bob@example.com", password: "short" });
    assert.equal(shortPassword.status, 400);
    assert.match(shortPassword.body.message, /at least 8/);

    const badUsername = await api()
      .post("/api/auth/register")
      .send({ name: "Bob", username: "bob smith!", email: "bob@example.com", password: "password123" });
    assert.equal(badUsername.status, 400);

    const reserved = await api()
      .post("/api/auth/register")
      .send({ name: "Bob", username: "settings", email: "bob@example.com", password: "password123" });
    assert.equal(reserved.status, 400);

    const badEmail = await api()
      .post("/api/auth/register")
      .send({ name: "Bob", username: "bob_2", email: "not-an-email", password: "password123" });
    assert.equal(badEmail.status, 400);
  });

  test("register creates user + profile and never returns secrets", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Carol King", username: "Carol.K", email: "Carol@Example.com", password: "password123" });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.username, "carol.k");
    assert.equal(res.body.user.email, "carol@example.com");
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.sessions, undefined);
    assert.deepEqual(res.body.profile.skills, []);
  });

  test("duplicate email or username is rejected with 409", async () => {
    const { email } = await registerUser({ username: "dupe_user" });
    const sameEmail = await api()
      .post("/api/auth/register")
      .send({ name: "Other", username: "other_name", email, password: "password123" });
    assert.equal(sameEmail.status, 409);

    const sameUsername = await api()
      .post("/api/auth/register")
      .send({ name: "Other", username: "DUPE_USER", email: "fresh@example.com", password: "password123" });
    assert.equal(sameUsername.status, 409);
  });

  test("login returns the same error for unknown email and wrong password", async () => {
    const { email } = await registerUser();
    const wrongPassword = await api().post("/api/auth/login").send({ email, password: "wrong-password" });
    const unknownEmail = await api()
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.message, unknownEmail.body.message);
  });

  test("login is case-insensitive for email and supports several sessions", async () => {
    const { email, password } = await registerUser();
    const first = await api().post("/api/auth/login").send({ email: email.toUpperCase(), password });
    const second = await api().post("/api/auth/login").send({ email, password });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.notEqual(first.body.token, second.body.token);

    const meFirst = await api().get("/api/auth/me").set(auth(first.body.token));
    const meSecond = await api().get("/api/auth/me").set(auth(second.body.token));
    assert.equal(meFirst.status, 200);
    assert.equal(meSecond.status, 200);
    assert.equal(meFirst.body.user.email, email);
    assert.equal(meFirst.body.user.password, undefined);
  });

  test("protected routes reject missing, malformed and unknown tokens", async () => {
    assert.equal((await api().get("/api/auth/me")).status, 401);
    assert.equal((await api().get("/api/auth/me").set("Authorization", "Token abc")).status, 401);
    assert.equal((await api().get("/api/auth/me").set(auth("deadbeef"))).status, 401);
    assert.equal((await api().get("/api/posts")).status, 401);
    assert.equal((await api().get("/api/users")).status, 401);
    assert.equal((await api().get("/api/connections")).status, 401);
  });

  test("logout revokes only the current session", async () => {
    const { email, password, token } = await registerUser();
    const other = await api().post("/api/auth/login").send({ email, password });

    const res = await api().post("/api/auth/logout").set(auth(token));
    assert.equal(res.status, 200);
    assert.equal((await api().get("/api/auth/me").set(auth(token))).status, 401);
    assert.equal((await api().get("/api/auth/me").set(auth(other.body.token))).status, 200);
  });

  test("unknown routes and bad JSON return JSON errors", async () => {
    const missing = await api().get("/api/does-not-exist");
    assert.equal(missing.status, 404);
    assert.ok(missing.body.message);

    const badJson = await api()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    assert.equal(badJson.status, 400);
  });

  test("health check reports the database", async () => {
    const res = await api().get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.db, true);
  });
});

test("requests without a body get a 4xx, not a crash", async () => {
  const { token } = await registerUser();
  const res = await api().post("/api/connections/requests").set(auth(token));
  assert.equal(res.status, 400);
  const login = await api().post("/api/auth/login");
  assert.equal(login.status, 400);
});

test("CORS only allows the configured frontend origin", async () => {
  const allowed = await api().get("/api/health").set("Origin", "http://localhost:3000");
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:3000");
  const blocked = await api().get("/api/health").set("Origin", "https://evil.example.com");
  assert.equal(blocked.headers["access-control-allow-origin"], undefined);
});
