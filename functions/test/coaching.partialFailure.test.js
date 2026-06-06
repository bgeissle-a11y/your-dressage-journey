/**
 * B4 — Stale-voice fallback when a single voice generation fails.
 *
 * Verifies that when one voice in the bulk fan-out rejects:
 *   • If a stale cache row exists for that voice, we surface it with
 *     _meta.stale === true and _meta.failedThisRun === true (telemetry).
 *   • If no stale row exists, the legacy error placeholder is returned.
 *
 * Run with:  node --test functions/test/coaching.partialFailure.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { handler, state, reset } = require("./_coachingFixture");

const REQUEST = { auth: { uid: "uid-test" }, data: {} };

test("falls back to stale cache when one voice fails and a MATCHING-hash stale row exists", async () => {
  reset();

  // Voice 1 fails; the other three voices and quick insights succeed.
  state.voiceBehavior[1] = { type: "error", error: new Error("synthetic v1 failure") };

  // Seed a stale row for voice 1 whose content hash MATCHES the current data —
  // i.e. it describes the same rider data, so it is safe to serve (Fix 2b).
  state.staleVoiceRows[1] = {
    result: { analysis: "voice-1-stale" },
    generatedAt: "2026-05-15T12:00:00.000Z",
    dataSnapshotHash: "hash-current",
  };

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.deepEqual(res.failedVoices, [1], "voice 1 is reported as failed for the banner");
  assert.equal(res.partialResults, true);

  // Voice 1 = stale content surfaced, NOT the error placeholder.
  const v1 = res.voices[1];
  assert.ok(v1, "voice 1 slot is populated");
  assert.equal(v1._error, undefined, "no _error key on stale fallback");
  assert.equal(v1.analysis, "voice-1-stale");
  assert.equal(v1._meta.stale, true);
  assert.equal(v1._meta.failedThisRun, true);
  assert.equal(v1._meta.fromCache, true);
  assert.equal(v1._meta.generatedAt, "2026-05-15T12:00:00.000Z");

  // Telemetry recorded a matching stale serve.
  const ev = state.telemetry.find((t) => t.kind === "stale" && t.voiceIndex === 1);
  assert.ok(ev, "stale-fallback telemetry emitted for voice 1");
  assert.equal(ev.hashMatched, true);
  assert.equal(ev.served, true);

  // The healthy voices have no stale/failedThisRun markers.
  assert.equal(res.voices[0]._meta.failedThisRun, undefined);
  assert.equal(res.voices[2]._meta.failedThisRun, undefined);
  assert.equal(res.voices[3]._meta.failedThisRun, undefined);
});

test("SUPPRESSES a NON-matching stale row (different data) and serves an error placeholder", async () => {
  reset();

  // Voice 1 fails; a stale row exists but its hash describes DIFFERENT data
  // (e.g. a different horse). The core repetition bug: this must never be
  // served as current coaching.
  state.voiceBehavior[1] = { type: "error", error: new Error("synthetic v1 failure") };
  state.staleVoiceRows[1] = {
    result: { analysis: "voice-1-WRONG-HORSE" },
    generatedAt: "2026-05-15T12:00:00.000Z",
    dataSnapshotHash: "hash-prior-different-data",
  };

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.deepEqual(res.failedVoices, [1]);

  // Voice 1 must be the error placeholder, NOT the wrong-horse narrative.
  const v1 = res.voices[1];
  assert.equal(v1._error, true, "non-matching stale is suppressed → error placeholder");
  assert.equal(v1.analysis, undefined, "wrong-horse content never surfaced");
  assert.match(v1._errorMessage, /temporary issue/i);

  // Telemetry recorded the suppressed (non-served) non-matching serve.
  const ev = state.telemetry.find((t) => t.kind === "stale" && t.voiceIndex === 1);
  assert.ok(ev, "stale-fallback telemetry emitted for voice 1");
  assert.equal(ev.hashMatched, false);
  assert.equal(ev.served, false, "non-matching content was NOT served");
});

test("falls back to error placeholder when one voice fails and no stale exists", async () => {
  reset();

  state.voiceBehavior[1] = { type: "error", error: new Error("synthetic v1 failure") };
  // staleVoiceRows[1] is null — fallback path has nothing to serve.

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.deepEqual(res.failedVoices, [1]);

  const v1 = res.voices[1];
  assert.equal(v1._error, true);
  assert.match(v1._errorMessage, /temporary issue/i);
});

test("succeeds cleanly when all four voices generate", async () => {
  reset();

  const res = await handler(REQUEST);

  assert.equal(res.success, true);
  assert.equal(res.partialResults, undefined);
  assert.equal(res.failedVoices, undefined);
  for (let i = 0; i < 4; i++) {
    assert.equal(res.voices[i]._error, undefined);
    assert.equal(res.voices[i]._meta.failedThisRun, undefined);
  }
});
