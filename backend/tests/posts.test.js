import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, connectTestDb, disconnectTestDb, makePng, registerUser } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

const createPost = (user, body) =>
  api().post("/api/posts").set(auth(user.token)).field("body", body);

describe("posts, likes and comments", () => {
  test("create text and image posts; empty posts are rejected", async () => {
    const alice = await registerUser();

    const empty = await api().post("/api/posts").set(auth(alice.token)).field("body", "   ");
    assert.equal(empty.status, 400);

    const text = await createPost(alice, "Hello network!");
    assert.equal(text.status, 201);
    assert.equal(text.body.post.body, "Hello network!");
    assert.equal(text.body.post.author._id, alice.user._id);
    assert.equal(text.body.post.likesCount, 0);
    assert.equal(text.body.post.commentsCount, 0);

    const withImage = await api()
      .post("/api/posts")
      .set(auth(alice.token))
      .attach("media", await makePng(2000, 1000), { filename: "photo.png", contentType: "image/png" });
    assert.equal(withImage.status, 201);
    assert.match(withImage.body.post.media, /^\/media\//);
    assert.equal(withImage.body.post.fileType, "webp");

    const tooLong = await createPost(alice, "x".repeat(3001));
    assert.equal(tooLong.status, 400);
  });

  test("feed is newest first and paginated", async () => {
    const user = await registerUser();
    for (let i = 1; i <= 5; i += 1) {
      await createPost(user, `post ${i}`);
    }
    const page1 = await api().get("/api/posts").query({ limit: 2, author: user.user._id }).set(auth(user.token));
    assert.equal(page1.status, 200);
    assert.deepEqual(page1.body.posts.map((p) => p.body), ["post 5", "post 4"]);
    assert.equal(page1.body.hasMore, true);
    assert.equal(page1.body.total, 5);

    const page3 = await api()
      .get("/api/posts")
      .query({ limit: 2, page: 3, author: user.user._id })
      .set(auth(user.token));
    assert.deepEqual(page3.body.posts.map((p) => p.body), ["post 1"]);
    assert.equal(page3.body.hasMore, false);

    const badAuthor = await api().get("/api/posts").query({ author: "nope" }).set(auth(user.token));
    assert.equal(badAuthor.status, 400);
  });

  test("only the owner can edit or delete a post", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const post = (await createPost(alice, "Original")).body.post;

    const bobEdit = await api().patch(`/api/posts/${post._id}`).set(auth(bob.token)).send({ body: "hacked" });
    assert.equal(bobEdit.status, 403);
    const bobDelete = await api().delete(`/api/posts/${post._id}`).set(auth(bob.token));
    assert.equal(bobDelete.status, 403);

    const edit = await api().patch(`/api/posts/${post._id}`).set(auth(alice.token)).send({ body: "Edited" });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.post.body, "Edited");

    const del = await api().delete(`/api/posts/${post._id}`).set(auth(alice.token));
    assert.equal(del.status, 200);
    const gone = await api().delete(`/api/posts/${post._id}`).set(auth(alice.token));
    assert.equal(gone.status, 404);

    const invalid = await api().delete("/api/posts/not-an-id").set(auth(alice.token));
    assert.equal(invalid.status, 400);
  });

  test("likes are counted once per user and can be removed", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const post = (await createPost(alice, "Like me")).body.post;

    const like1 = await api().post(`/api/posts/${post._id}/like`).set(auth(bob.token));
    const like2 = await api().post(`/api/posts/${post._id}/like`).set(auth(bob.token));
    assert.equal(like1.status, 200);
    assert.deepEqual(
      { count: like2.body.likesCount, mine: like2.body.likedByMe },
      { count: 1, mine: true }
    );

    await api().post(`/api/posts/${post._id}/like`).set(auth(alice.token));
    const feed = await api().get("/api/posts").query({ author: alice.user._id }).set(auth(bob.token));
    assert.equal(feed.body.posts[0].likesCount, 2);
    assert.equal(feed.body.posts[0].likedByMe, true);

    const unlike = await api().delete(`/api/posts/${post._id}/like`).set(auth(bob.token));
    assert.deepEqual({ count: unlike.body.likesCount, mine: unlike.body.likedByMe }, { count: 1, mine: false });
    const unlikeAgain = await api().delete(`/api/posts/${post._id}/like`).set(auth(bob.token));
    assert.equal(unlikeAgain.body.likesCount, 1);

    const missing = await api().post("/api/posts/64b000000000000000000000/like").set(auth(bob.token));
    assert.equal(missing.status, 404);
  });

  test("comments: add, list, count and delete with permissions", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const carol = await registerUser();
    const post = (await createPost(alice, "Comment on me")).body.post;

    const empty = await api().post(`/api/posts/${post._id}/comments`).set(auth(bob.token)).send({ body: " " });
    assert.equal(empty.status, 400);

    const bobComment = await api()
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(bob.token))
      .send({ body: "Great post!" });
    assert.equal(bobComment.status, 201);
    assert.equal(bobComment.body.comment.author._id, bob.user._id);

    const carolComment = await api()
      .post(`/api/posts/${post._id}/comments`)
      .set(auth(carol.token))
      .send({ body: "Agreed" });

    const list = await api().get(`/api/posts/${post._id}/comments`).set(auth(alice.token));
    assert.deepEqual(list.body.comments.map((c) => c.body), ["Great post!", "Agreed"]);

    const feed = await api().get("/api/posts").query({ author: alice.user._id }).set(auth(alice.token));
    assert.equal(feed.body.posts[0].commentsCount, 2);

    // Carol cannot delete Bob's comment on Alice's post.
    const forbidden = await api().delete(`/api/comments/${bobComment.body.comment._id}`).set(auth(carol.token));
    assert.equal(forbidden.status, 403);

    // Bob deletes his own comment; Alice (post owner) can moderate Carol's.
    assert.equal((await api().delete(`/api/comments/${bobComment.body.comment._id}`).set(auth(bob.token))).status, 200);
    assert.equal((await api().delete(`/api/comments/${carolComment.body.comment._id}`).set(auth(alice.token))).status, 200);

    const after = await api().get(`/api/posts/${post._id}/comments`).set(auth(alice.token));
    assert.equal(after.body.comments.length, 0);
  });

  test("deleting a post removes its comments and image", async () => {
    const alice = await registerUser();
    const res = await api()
      .post("/api/posts")
      .set(auth(alice.token))
      .field("body", "With picture")
      .attach("media", await makePng(), { filename: "p.png", contentType: "image/png" });
    const post = res.body.post;
    await api().post(`/api/posts/${post._id}/comments`).set(auth(alice.token)).send({ body: "first" });

    await api().delete(`/api/posts/${post._id}`).set(auth(alice.token));
    assert.equal((await api().get(post.media)).status, 404);
    assert.equal((await api().get(`/api/posts/${post._id}/comments`).set(auth(alice.token))).status, 404);
  });
});
