/**
 * A1 — graceful fallback (BLOCKING, the single most important rider-facing
 * property): the evidence ledger must NEVER break a generation. On any internal
 * failure, buildLedgerIfEnabled returns null so the handler's
 * `ledger ? wrap : base` degrades to the flag-off (base) prompt and the
 * generation completes normally — the failure is logged, never surfaced.
 *
 * Two failure modes, both deterministic (no emulator, no network):
 *   A1a — Firestore read failure (fetchLedgerRecords throws)
 *   A1b — ledger-build exception (buildLedger throws on malformed records)
 *
 * Both are caught by the SAME outer try/catch in buildLedgerIfEnabled, so these
 * cover any throw inside that block.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  require("path").resolve(__dirname, "..", "..", "scripts", "serviceAccountKey.json");

const firebase = require("../lib/firebase");
const { buildLedgerIfEnabled } = require("../lib/evidenceLedger");

const ENABLED = { enabled: true, outputs: { journeyMap: true, coaching: true } };

test("A1a: Firestore read failure → returns null (degrade to control), never throws", async () => {
  // Force the shared db object to throw the moment fetchLedgerRecords touches it.
  const orig = firebase.db.collection;
  firebase.db.collection = () => { throw new Error("Firestore unavailable (simulated)"); };
  try {
    let result;
    await assert.doesNotReject(async () => {
      // config passed → no config read; no records → fetchLedgerRecords runs → throws.
      result = await buildLedgerIfEnabled("u1", "journeyMap", "pilot", { config: ENABLED });
    });
    assert.equal(result, null, "must degrade to control (null), not throw or return a partial ledger");
  } finally {
    firebase.db.collection = orig;
  }
});

test("A1b: ledger-build exception → returns null (degrade to control), never throws", async () => {
  // Records whose `.debriefs` getter throws — simulates a malformed/corrupt slice
  // reaching buildLedger. No db is touched (records + config both supplied).
  const evilRecords = {};
  Object.defineProperty(evilRecords, "debriefs", {
    get() { throw new Error("corrupt records (simulated)"); },
    enumerable: true,
  });
  let result;
  await assert.doesNotReject(async () => {
    result = await buildLedgerIfEnabled("u1", "journeyMap", "pilot", {
      config: ENABLED, records: evilRecords, focalHorse: "Pony",
    });
  });
  assert.equal(result, null, "build exception must degrade to control (null)");
});

test("A1c: a clean no-debriefs slice degrades to null (not an error to the rider)", async () => {
  // buildLedger returns {error} for an empty slice → buildLedgerIfEnabled maps it to null.
  const empty = {
    debriefs: [], lessonNotes: [], reflections: [], observations: [],
    physicalAssessments: [], technicalPhilosophicalAssessments: [], horseHealthEntries: [],
  };
  const result = await buildLedgerIfEnabled("u1", "journeyMap", "pilot", {
    config: ENABLED, records: empty, focalHorse: "Ghost",
  });
  assert.equal(result, null);
});

test("flag-off → null without touching Firestore", async () => {
  // Disabled config returns before any records fetch. Stub db to throw to prove
  // the off path never reads.
  const orig = firebase.db.collection;
  firebase.db.collection = () => { throw new Error("must not be called when flag is off"); };
  try {
    assert.equal(
      await buildLedgerIfEnabled("u1", "journeyMap", "pilot", { config: { enabled: false } }),
      null
    );
  } finally {
    firebase.db.collection = orig;
  }
});
