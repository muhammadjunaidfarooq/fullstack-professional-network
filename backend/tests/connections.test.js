import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, connectTestDb, disconnectTestDb, registerUser } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

const statusBetween = async (viewer, other) => {
  const res = await api().get(`/api/users/${other.user.username}`).set(auth(viewer.token));
  return res.body.connection.status;
};

describe("connections", () => {
  test("full request lifecycle: send → accept → listed for both → remove", async () => {
    const alice = await registerUser();
    const bob = await registerUser();

    const sent = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: bob.user._id });
    assert.equal(sent.status, 201);
    const requestId = sent.body.connection.requestId;

    assert.equal(await statusBetween(alice, bob), "pending_sent");
    assert.equal(await statusBetween(bob, alice), "pending_received");

    const received = await api().get("/api/connections/requests?type=received").set(auth(bob.token));
    assert.equal(received.body.requests.length, 1);
    assert.equal(received.body.requests[0].user._id, alice.user._id);

    const sentList = await api().get("/api/connections/requests?type=sent").set(auth(alice.token));
    assert.equal(sentList.body.requests.length, 1);

    // The sender cannot accept their own request.
    const selfAccept = await api()
      .patch(`/api/connections/requests/${requestId}`)
      .set(auth(alice.token))
      .send({ action: "accept" });
    assert.equal(selfAccept.status, 403);

    const accepted = await api()
      .patch(`/api/connections/requests/${requestId}`)
      .set(auth(bob.token))
      .send({ action: "accept" });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.connection.status, "connected");

    const aliceConnections = await api().get("/api/connections").set(auth(alice.token));
    const bobConnections = await api().get("/api/connections").set(auth(bob.token));
    assert.deepEqual(aliceConnections.body.connections.map((c) => c.user._id), [bob.user._id]);
    assert.deepEqual(bobConnections.body.connections.map((c) => c.user._id), [alice.user._id]);
    assert.equal(await statusBetween(alice, bob), "connected");

    const profile = await api().get(`/api/users/${bob.user.username}`).set(auth(alice.token));
    assert.equal(profile.body.stats.connections, 1);

    // Accepting twice is not possible.
    const again = await api()
      .patch(`/api/connections/requests/${requestId}`)
      .set(auth(bob.token))
      .send({ action: "accept" });
    assert.equal(again.status, 404);

    const removed = await api().delete(`/api/connections/${alice.user._id}`).set(auth(bob.token));
    assert.equal(removed.status, 200);
    assert.equal(await statusBetween(alice, bob), "none");
    assert.equal((await api().get("/api/connections").set(auth(alice.token))).body.connections.length, 0);

    const removeAgain = await api().delete(`/api/connections/${alice.user._id}`).set(auth(bob.token));
    assert.equal(removeAgain.status, 404);
  });

  test("duplicate, reverse and self requests are blocked", async () => {
    const alice = await registerUser();
    const bob = await registerUser();

    const self = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: alice.user._id });
    assert.equal(self.status, 400);

    const invalid = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: "123" });
    assert.equal(invalid.status, 400);

    const unknown = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: "64b000000000000000000000" });
    assert.equal(unknown.status, 404);

    await api().post("/api/connections/requests").set(auth(alice.token)).send({ userId: bob.user._id });
    const duplicate = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: bob.user._id });
    assert.equal(duplicate.status, 409);

    const reverse = await api()
      .post("/api/connections/requests")
      .set(auth(bob.token))
      .send({ userId: alice.user._id });
    assert.equal(reverse.status, 409);
  });

  test("reject and cancel delete the request so users can try again", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const carol = await registerUser();

    const first = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: bob.user._id });

    // A third user cannot touch someone else's request.
    const carolCancel = await api()
      .delete(`/api/connections/requests/${first.body.connection.requestId}`)
      .set(auth(carol.token));
    assert.equal(carolCancel.status, 403);
    const carolRespond = await api()
      .patch(`/api/connections/requests/${first.body.connection.requestId}`)
      .set(auth(carol.token))
      .send({ action: "accept" });
    assert.equal(carolRespond.status, 403);

    // The receiver cannot "cancel" (only the sender can).
    const bobCancel = await api()
      .delete(`/api/connections/requests/${first.body.connection.requestId}`)
      .set(auth(bob.token));
    assert.equal(bobCancel.status, 403);

    const rejected = await api()
      .patch(`/api/connections/requests/${first.body.connection.requestId}`)
      .set(auth(bob.token))
      .send({ action: "reject" });
    assert.equal(rejected.status, 200);
    assert.equal(await statusBetween(alice, bob), "none");

    const second = await api()
      .post("/api/connections/requests")
      .set(auth(alice.token))
      .send({ userId: bob.user._id });
    assert.equal(second.status, 201);

    const cancelled = await api()
      .delete(`/api/connections/requests/${second.body.connection.requestId}`)
      .set(auth(alice.token));
    assert.equal(cancelled.status, 200);
    assert.equal(await statusBetween(bob, alice), "none");

    const badAction = await api()
      .patch(`/api/connections/requests/${second.body.connection.requestId}`)
      .set(auth(bob.token))
      .send({ action: "maybe" });
    assert.equal(badAction.status, 400);
  });

  test("suggestions exclude yourself and people you are already linked with", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    await api().post("/api/connections/requests").set(auth(alice.token)).send({ userId: bob.user._id });

    const res = await api().get("/api/users/suggestions").set(auth(alice.token));
    assert.equal(res.status, 200);
    const ids = res.body.users.map((card) => card.user._id);
    assert.ok(!ids.includes(alice.user._id));
    assert.ok(!ids.includes(bob.user._id));
    assert.ok(ids.length <= 5);
  });
});
