/**
 * Fix 1 — content-aware dataSnapshot (repetition bug-fix package).
 *
 * Guards the property that previously caused the wrong-horse repetition bug:
 * the snapshot hash must reflect CONTENT, not just collection counts, and must
 * be derived from the persisted manifest (no independent hash path).
 *
 * Run with:  node --test functions/test/dataSnapshot.contentAware.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDataSnapshot, hashFromManifest } = require("../lib/prepareRiderData");

const COUNTS = { debriefs: 3, horses: 1 };

const PIP = {
  debriefs: [
    { id: "d1", horseName: "Pip", wins: "forward" },
    { id: "d2", horseName: "Pip", wins: "balanced canter" },
    { id: "d3", horseName: "Pip", wins: "short and sweet" },
  ],
  horseProfiles: [{ id: "h1", horseName: "Pip", horseLevel: "training-not-showing" }],
};

const COMET = {
  debriefs: [
    { id: "d1", horseName: "Comet", wins: "transitions" },
    { id: "d2", horseName: "Comet", wins: "left bend" },
    { id: "d3", horseName: "Comet", wins: "lighter downward" },
  ],
  horseProfiles: [{ id: "h1", horseName: "Comet", horseLevel: "third" }],
};

test("different content with identical counts produces different hashes", () => {
  const a = buildDataSnapshot(COUNTS, PIP);
  const b = buildDataSnapshot(COUNTS, COMET);
  assert.notEqual(a.hash, b.hash, "Pip and Comet must not share a hash (the old count-only bug)");
});

test("identical content reproduces the same hash", () => {
  assert.equal(buildDataSnapshot(COUNTS, PIP).hash, buildDataSnapshot(COUNTS, PIP).hash);
});

test("hash is order-independent (Firestore may return docs in any order)", () => {
  const shuffled = {
    debriefs: [PIP.debriefs[2], PIP.debriefs[0], PIP.debriefs[1]],
    horseProfiles: PIP.horseProfiles,
  };
  assert.equal(buildDataSnapshot(COUNTS, shuffled).hash, buildDataSnapshot(COUNTS, PIP).hash);
});

test("editing a single field changes the hash", () => {
  const edited = {
    debriefs: [{ id: "d1", horseName: "Pip", wins: "forward — EDITED" }, PIP.debriefs[1], PIP.debriefs[2]],
    horseProfiles: PIP.horseProfiles,
  };
  assert.notEqual(buildDataSnapshot(COUNTS, edited).hash, buildDataSnapshot(COUNTS, PIP).hash);
});

test("hash is derived from the persisted manifest (single source of truth)", () => {
  const snap = buildDataSnapshot(COUNTS, PIP);
  assert.equal(hashFromManifest(snap.manifest), snap.hash);
});

test("manifest round-trips order-independently to the same hash", () => {
  const a = buildDataSnapshot(COUNTS, PIP);
  const shuffled = {
    debriefs: [PIP.debriefs[1], PIP.debriefs[2], PIP.debriefs[0]],
    horseProfiles: PIP.horseProfiles,
  };
  const b = buildDataSnapshot(COUNTS, shuffled);
  assert.deepEqual(a.manifest, b.manifest, "manifests identical regardless of input order");
  assert.equal(hashFromManifest(b.manifest), a.hash);
});

test("counts are retained for backward compatibility but do not drive the hash", () => {
  const snap = buildDataSnapshot(COUNTS, PIP);
  assert.deepEqual(snap.counts, COUNTS);
  // Same content, different counts object → same hash (hash ignores counts).
  const snap2 = buildDataSnapshot({ debriefs: 999 }, PIP);
  assert.equal(snap2.hash, snap.hash);
});
