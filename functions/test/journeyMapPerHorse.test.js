/**
 * Per-horse Journey Map unit tests.
 *
 * Covers the two pieces the rider-selected per-horse JM rests on:
 *   1. Cache keying — buildDocId(cacheKeySuffix) appends a sanitized horse
 *      segment when present and is BYTE-IDENTICAL to the legacy key when absent
 *      (the flag-off / whole-rider path must not move).
 *   2. Focal-horse selection — buildLedger honors an explicit focalHorse, and
 *      pickFocalHorse defaults to the most-active horse (the client mirrors this).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

// firebase-admin initializes at import of ./firebase (via cacheManager); provide
// credentials so the require chain doesn't throw under `node --test`.
process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  require("path").resolve(__dirname, "..", "..", "scripts", "serviceAccountKey.json");

const { buildDocId } = require("../lib/cacheManager");
const { buildLedger, pickFocalHorse } = require("../lib/evidenceLedger");

// ── cache keying ──────────────────────────────────────────────────────────────

test("buildDocId: no suffix is byte-identical to the legacy key", () => {
  assert.equal(buildDocId("u1", "journeyMap"), "u1_journeyMap");
  assert.equal(buildDocId("u1", "journeyMap", undefined, undefined), "u1_journeyMap");
  assert.equal(buildDocId("u1", "journeyMap", undefined, ""), "u1_journeyMap");
  // Coaching voice key unaffected when no suffix is supplied.
  assert.equal(buildDocId("u1", "coaching", 0), "u1_coaching_0");
});

test("buildDocId: a focal-horse suffix is appended", () => {
  assert.equal(buildDocId("u1", "journeyMap", undefined, "Pony"), "u1_journeyMap_Pony");
  assert.equal(buildDocId("u1", "journeyMap", undefined, "Rocket Star"), "u1_journeyMap_Rocket Star");
});

test("buildDocId: suffix is sanitized of Firestore-reserved path chars", () => {
  // '/', '.', '#', '$', '[', ']' are illegal / problematic in doc ids → collapsed to '_'.
  assert.equal(buildDocId("u1", "journeyMap", undefined, "A/B.C#D$E[F]"), "u1_journeyMap_A_B_C_D_E_F_");
  // length is clamped (suffix capped at 120 chars)
  const long = "x".repeat(300);
  const id = buildDocId("u1", "journeyMap", undefined, long);
  assert.equal(id.length, "u1_journeyMap_".length + 120);
});

// ── focal-horse selection ───────────────────────────────────────────────────

const RECENT = ["2026-06-01", "2026-05-29", "2026-05-26", "2026-05-23", "2026-05-20"];
const BASE = ["2026-05-02", "2026-04-22", "2026-04-12"];
let _id = 0;
const debrief = (horse, date) => ({
  id: `d${_id++}`, userId: "u1", horseName: horse, rideDate: date, createdAt: `${date}T12:00:00.000Z`,
  overallQuality: 7, confidenceLevel: 8, riderEffort: 7, horseEffort: 7, isDeleted: false, isDraft: false,
});

function multiHorseRecords() {
  // Pony = 5 rides (most active), Rocket = 3 rides.
  const debriefs = [
    ...RECENT.map((d) => debrief("Pony", d)),
    ...BASE.map((d) => debrief("Rocket", d)),
  ];
  return {
    debriefs, lessonNotes: [], reflections: [], observations: [],
    physicalAssessments: [], technicalPhilosophicalAssessments: [], horseHealthEntries: [],
  };
}

test("pickFocalHorse defaults to the most-active horse", () => {
  assert.equal(pickFocalHorse(multiHorseRecords()), "Pony");
});

test("buildLedger honors an explicit focalHorse and scopes to it", () => {
  const recs = multiHorseRecords();
  const pony = buildLedger(recs, "Pony");
  assert.equal(pony.meta.focalHorse, "Pony");
  // Pony has 5 recent rides; the ledger text names Pony, not Rocket.
  assert.match(pony.ledger, /Focal horse: Pony/);

  // Rocket has only 3 rides, all in the baseline span → its recent window is
  // thin, but the focal scoping still resolves to Rocket (a different ledger).
  const rocket = buildLedger(recs, "Rocket");
  assert.equal(rocket.meta.focalHorse, "Rocket");
  assert.match(rocket.ledger, /Focal horse: Rocket/);
  assert.notEqual(pony.ledger, rocket.ledger);
});
