import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, connectTestDb, disconnectTestDb, makePng, registerUser } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

describe("profiles", () => {
  test("update profile only changes allowed fields", async () => {
    const alice = await registerUser({ name: "Alice Smith" });
    const bob = await registerUser();

    const res = await api()
      .patch("/api/users/me/profile")
      .set(auth(alice.token))
      .send({
        bio: "  Building things.  ",
        currentPost: "Software Engineer",
        location: "Lahore",
        skills: ["React", "react", "Node.js", ""],
        pastWork: [{ company: "Acme", position: "Intern", years: "2024", extra: "ignored" }, {}],
        education: [{ school: "IUB", degree: "BS", fieldOfStudy: "Software Engineering", years: "2022-2026" }],
        userId: bob.user._id, // must be ignored (mass-assignment attempt)
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.profile.bio, "Building things.");
    // Duplicates (case-insensitive) and blanks are removed; the last spelling wins.
    assert.deepEqual(res.body.profile.skills, ["react", "Node.js"]);
    assert.equal(res.body.profile.pastWork.length, 1);
    assert.equal(res.body.profile.pastWork[0].extra, undefined);
    assert.equal(res.body.profile.education[0].years, "2022-2026");

    // Bob's profile is untouched.
    const bobProfile = await api().get(`/api/users/${bob.user.username}`).set(auth(bob.token));
    assert.equal(bobProfile.body.profile.bio, "");
  });

  test("profile validation rejects bad input", async () => {
    const user = await registerUser();
    const tooLong = await api()
      .patch("/api/users/me/profile")
      .set(auth(user.token))
      .send({ currentPost: "x".repeat(200) });
    assert.equal(tooLong.status, 400);

    const notList = await api()
      .patch("/api/users/me/profile")
      .set(auth(user.token))
      .send({ skills: "react" });
    assert.equal(notList.status, 400);
  });

  test("update account name/username with uniqueness check", async () => {
    const alice = await registerUser();
    const bob = await registerUser();

    const taken = await api()
      .patch("/api/users/me")
      .set(auth(alice.token))
      .send({ username: bob.user.username });
    assert.equal(taken.status, 409);

    const ok = await api()
      .patch("/api/users/me")
      .set(auth(alice.token))
      .send({ name: "Alice New", username: "alice_new", email: "hacker@example.com", password: "x" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.name, "Alice New");
    assert.equal(ok.body.user.username, "alice_new");
    assert.equal(ok.body.user.email, alice.email); // email cannot be changed here

    // Password was not changed by the request above.
    const login = await api().post("/api/auth/login").send({ email: alice.email, password: alice.password });
    assert.equal(login.status, 200);
  });

  test("view another user's profile hides their email", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const res = await api().get(`/api/users/${bob.user.username}`).set(auth(alice.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.isSelf, false);
    assert.equal(res.body.user.email, undefined);
    assert.equal(res.body.connection.status, "none");
    assert.deepEqual(res.body.stats, { connections: 0, posts: 0 });

    const self = await api().get(`/api/users/${alice.user.username}`).set(auth(alice.token));
    assert.equal(self.body.isSelf, true);
    assert.equal(self.body.user.email, alice.email);
    assert.equal(self.body.connection.status, "self");

    const missing = await api().get("/api/users/no_such_user").set(auth(alice.token));
    assert.equal(missing.status, 404);
  });

  test("avatar upload stores a resized WebP image", async () => {
    const user = await registerUser();
    const png = await makePng(800, 600);
    const res = await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", png, { filename: "me.png", contentType: "image/png" });
    assert.equal(res.status, 200);
    assert.match(res.body.user.profilePicture, /^\/media\/[a-f0-9]{24}$/);

    const image = await api().get(res.body.user.profilePicture);
    assert.equal(image.status, 200);
    assert.equal(image.headers["content-type"], "image/webp");
    assert.match(image.headers["cache-control"], /immutable/);

    // Replacing the avatar deletes the old image.
    const second = await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", png, { filename: "me2.png", contentType: "image/png" });
    assert.equal(second.status, 200);
    assert.equal((await api().get(res.body.user.profilePicture)).status, 404);

    const removed = await api().delete("/api/users/me/avatar").set(auth(user.token));
    assert.equal(removed.body.user.profilePicture, "");
  });

  test("avatar upload rejects non-images, fake images and huge files", async () => {
    const user = await registerUser();
    const textFile = await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    assert.equal(textFile.status, 400);

    const fakePng = await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", Buffer.from("<html>not an image</html>"), {
        filename: "evil.png",
        contentType: "image/png",
      });
    assert.equal(fakePng.status, 400);

    const huge = await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", Buffer.alloc(6 * 1024 * 1024), { filename: "big.png", contentType: "image/png" });
    assert.equal(huge.status, 413);

    const noFile = await api().post("/api/users/me/avatar").set(auth(user.token));
    assert.equal(noFile.status, 400);
  });

  test("search finds users by name, username, headline and skill", async () => {
    const viewer = await registerUser();
    const target = await registerUser({ name: "Zainab Qureshi", username: "zainab_q" });
    await api()
      .patch("/api/users/me/profile")
      .set(auth(target.token))
      .send({ currentPost: "Computer Vision Engineer", skills: ["PyTorch"] });

    for (const term of ["zainab", "QURESHI", "zainab_q", "vision", "pytorch"]) {
      const res = await api().get("/api/users").query({ search: term }).set(auth(viewer.token));
      assert.equal(res.status, 200, term);
      assert.ok(
        res.body.users.some((card) => card.user._id === target.user._id),
        `search "${term}" should find the user`
      );
    }

    const self = await api().get("/api/users").query({ search: viewer.user.username }).set(auth(viewer.token));
    assert.equal(self.body.users.length, 0, "search never returns yourself");

    // Regex special characters are treated as plain text.
    const weird = await api().get("/api/users").query({ search: "(.*+[" }).set(auth(viewer.token));
    assert.equal(weird.status, 200);
    assert.equal(weird.body.users.length, 0);

    const paged = await api().get("/api/users").query({ limit: 1, page: 1 }).set(auth(viewer.token));
    assert.equal(paged.body.users.length, 1);
    assert.equal(paged.body.hasMore, true);
  });

  test("resume download returns a PDF", async () => {
    const user = await registerUser();
    await api()
      .post("/api/users/me/avatar")
      .set(auth(user.token))
      .attach("profile_picture", await makePng(), { filename: "me.png", contentType: "image/png" });
    await api()
      .patch("/api/users/me/profile")
      .set(auth(user.token))
      .send({ bio: "Hello", pastWork: [{ company: "Acme", position: "Engineer", years: "2" }] });

    const res = await api()
      .get(`/api/users/${user.user._id}/resume`)
      .set(auth(user.token))
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.match(res.headers["content-disposition"], /resume\.pdf/);
    assert.equal(res.body.subarray(0, 4).toString(), "%PDF");

    const bad = await api().get("/api/users/not-an-id/resume").set(auth(user.token));
    assert.equal(bad.status, 400);
  });
});
