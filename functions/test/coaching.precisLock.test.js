/**
 * B5 — Bulk-path précis generation must acquire the coaching_precis lock
 * before spending Claude tokens, so two concurrent fan-outs (or bulk +
 * trailing single-voice) can't both generate the précis.
 *
 * Verifies:
 *   • When the lock is already held, the bulk path logs + skips précis.
 *   • When the lock is free, the bulk path generates and writes précis.
 *
 * Run with:  node --test functions/test/coaching.precisLock.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { handler, state, reset } = require("./_coachingFixture");

const REQUEST = { auth: { uid: "uid-test" }, data: {} };

function precisCallCount() {
  return state.callLog.filter((c) => c === "coaching-precis").length;
}

function precisCacheWrites() {
  return state.cacheWrites.filter((w) => w.outputType === "coaching_precis");
}

test("bulk path skips précis generation when coaching_precis lock is held", async () => {
  reset();

  // Simulate a concurrent fan-out or trailing single-voice run that already
  // holds the précis lock for this user.
  state.locksHeld.add("uid-test_coaching_precis");

  const res = await handler(REQUEST);

  assert.equal(res.success, true, "voices return successfully even when précis is skipped");
  assert.equal(precisCallCount(), 0, "no Claude call should be made for précis");
  assert.equal(precisCacheWrites().length, 0, "no précis cache write");

  // The other path (the holder) is responsible for releasing — we don't.
  assert.ok(state.locksHeld.has("uid-test_coaching_precis"));
});

test("bulk path generates précis when the lock is free", async () => {
  reset();

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.equal(precisCallCount(), 1, "exactly one précis Claude call");
  assert.equal(precisCacheWrites().length, 1, "précis cache row written");
  assert.equal(precisCacheWrites()[0].result.precis,
    "A short voice-agnostic prose précis used by downstream prompts.");

  // Lock released in finally — must not leak.
  assert.equal(state.locksHeld.has("uid-test_coaching_precis"), false);
});

test("précis lock is released even when précis generation throws", async () => {
  reset();
  // generatePrecis() in coaching.js catches its own errors and returns null,
  // so the finally block in the new B5 branch is what releases the lock.
  // Force the Claude call to throw — exercise the release path.
  state.precisValue = null;

  const res = await handler(REQUEST);

  assert.equal(res.success, true, "voices still return — précis failure is non-fatal");
  assert.equal(state.locksHeld.has("uid-test_coaching_precis"), false,
    "lock released after précis failure");
  // No cache write on failure (generatePrecis returns null → persistPrecis no-op).
  assert.equal(precisCacheWrites().length, 0);
});

test("précis is skipped when fewer than 3 voices succeed", async () => {
  reset();
  state.voiceBehavior[1] = { type: "error", error: new Error("v1 fail") };
  state.voiceBehavior[2] = { type: "error", error: new Error("v2 fail") };

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.deepEqual(res.failedVoices.sort(), [1, 2]);
  // ≤1-failed threshold not met → précis branch is skipped entirely, lock
  // is never even acquired.
  assert.equal(precisCallCount(), 0);
  assert.equal(precisCacheWrites().length, 0);
});
