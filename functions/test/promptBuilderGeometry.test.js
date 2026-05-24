/**
 * B30 — Level-gated arena geometry reference text for EP-2 prompt.
 *
 * Verifies getGeometryReferenceForLevel() emits the correct geometry
 * citation for each USDF/FEI level, and returns an empty string (rather
 * than the wrong reference) for unrecognized inputs.
 *
 * Run with:  node --test functions/test/promptBuilderGeometry.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { getGeometryReferenceForLevel } = require("../lib/promptBuilder");

test("Training Level references 20m circles", () => {
  const txt = getGeometryReferenceForLevel("Training");
  assert.match(txt, /20m circle/);
});

test("Introductory Level references 20m circles", () => {
  const txt = getGeometryReferenceForLevel("Introductory");
  assert.match(txt, /20m circle/);
});

test("First Level references 20m circles", () => {
  const txt = getGeometryReferenceForLevel("First");
  assert.match(txt, /20m circle/);
});

test("Second Level references 15m and 10m circles, NOT 20m", () => {
  const txt = getGeometryReferenceForLevel("Second");
  assert.match(txt, /15m and 10m circles/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Fourth Level references 8m volte", () => {
  const txt = getGeometryReferenceForLevel("Fourth");
  assert.match(txt, /8m volte/);
});

test("PSG references 8m voltes and NOT 20m circle", () => {
  const txt = getGeometryReferenceForLevel("PSG");
  assert.match(txt, /8m voltes/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Prix St. Georges references 8m voltes and NOT 20m circle", () => {
  const txt = getGeometryReferenceForLevel("Prix St. Georges");
  assert.match(txt, /8m voltes/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Intermediate I returns PSG/I-1 branch text", () => {
  const txt = getGeometryReferenceForLevel("Intermediate I");
  assert.match(txt, /pirouettes/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Intermediate II returns the GP-family branch (matches before Intermediate I)", () => {
  const txt = getGeometryReferenceForLevel("Intermediate II");
  assert.match(txt, /piaffe/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Grand Prix references piaffe and tempi, NOT 20m circle", () => {
  const txt = getGeometryReferenceForLevel("Grand Prix");
  assert.match(txt, /piaffe/);
  assert.match(txt, /tempi/);
  assert.doesNotMatch(txt, /20m circle/);
});

test("Unknown level returns empty string", () => {
  assert.equal(getGeometryReferenceForLevel("Some Made Up Level"), "");
});

test("null/undefined input returns empty string", () => {
  assert.equal(getGeometryReferenceForLevel(null), "");
  assert.equal(getGeometryReferenceForLevel(undefined), "");
  assert.equal(getGeometryReferenceForLevel(""), "");
});
