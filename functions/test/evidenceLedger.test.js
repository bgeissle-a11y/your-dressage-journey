/**
 * evidenceLedger unit tests (Phase 2).
 *
 * Deterministic, self-contained: synthetic fixtures reproduce the demand states
 * validated out-of-band in the harness (Rocket → refinement-phase, Astrid →
 * progress-rising-demand, Pony → steady) without committing real rider data or
 * coupling to experiments/. Also covers cadence (Rule 2), reflection stamping
 * (Rule 1), and the recitation guard (Rule f backstop).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

// firebase-admin initializes at import of ./firebase; provide credentials so the
// require chain (evidenceLedger → firebase) doesn't throw under `node --test`.
process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  require("path").resolve(__dirname, "..", "..", "scripts", "serviceAccountKey.json");

const {
  buildLedger, computeHorseCadence, deriveEvidenceTags, buildWindows,
  detectRecitations, stripRecitations, stripRecitationsDeep, detectStripDamage, isLedgerEnabled,
} = require("../lib/evidenceLedger");

// ── fixture builders ─────────────────────────────────────────────────────────

const ASOF = "2026-06-01";
// 6 recent rides within 21 days of ASOF, 5 baseline rides 22–84 days before.
const RECENT_DATES = ["2026-06-01", "2026-05-29", "2026-05-26", "2026-05-23", "2026-05-20", "2026-05-17"];
const BASE_DATES = ["2026-05-02", "2026-04-22", "2026-04-12", "2026-04-02", "2026-03-23"];

let _id = 0;
function debrief({ date, horse = "Test Horse", q, conf = 8, effort = 7, movements }) {
  return {
    id: `d${_id++}`, userId: "u1", horseName: horse, rideDate: date, createdAt: `${date}T12:00:00.000Z`,
    overallQuality: q, confidenceLevel: conf, riderEffort: effort, horseEffort: effort, movements, isDeleted: false, isDraft: false,
  };
}
function records({ recent = [], base = [], lessonNotes = [], reflections = [], horseHealthEntries = [] }) {
  return {
    debriefs: [...recent, ...base], lessonNotes, reflections, horseHealthEntries,
    observations: [], physicalAssessments: [], technicalPhilosophicalAssessments: [],
  };
}
function health({ date, horse = "X", issueType = "concern", status = "ongoing", resolvedDate = null, title = "left hind lameness" }) {
  return { id: `h${_id++}`, userId: "u1", horseName: horse, date, issueType, status, resolvedDate, title, isDeleted: false };
}

// ── demand-state tests ───────────────────────────────────────────────────────

test("refinement-phase: GP horse, saturated Axis-1, execution held (Rocket-like)", () => {
  const gp = ["piaffe", "passage", "tempi-changes"];
  const r = records({
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "Rocket", q: 8, movements: gp })),
    base: BASE_DATES.map((date) => debrief({ date, horse: "Rocket", q: 8, movements: gp })),
  });
  const out = buildLedger(r, "Rocket");
  assert.equal(out.meta.state, "refinement-phase");
  assert.equal(out.structured.windows.channels.demand.axis1.saturated, true);
});

test("progress-rising-demand: returning horse climbing groundwork→gaits (Astrid-like)", () => {
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "Astrid", q: 6, effort: 5, movements: ["gw-lunging", "walk-work"] })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "Astrid", q: 6, effort: 5, movements: ["walk-work", "trot-work", "canter-work"] })),
  });
  const out = buildLedger(r, "Astrid");
  assert.equal(out.meta.state, "progress-rising-demand");
  assert.equal(out.structured.windows.channels.demand.axis1.direction, "rising");
  assert.equal(out.structured.windows.channels.demand.axis1.saturated, false);
});

test("steady: saturated but quality down while confidence holds (Pony-like)", () => {
  const gp = ["pirouette", "half-pass", "tempi-changes"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "Pony", q: 7, conf: 7, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "Pony", q: 6, conf: 7, movements: gp })),
  });
  const out = buildLedger(r, "Pony");
  assert.equal(out.meta.state, "steady");
});

test("regression: quality AND confidence both drop", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 6, conf: 6, movements: gp })),
  });
  assert.equal(buildLedger(r, "X").meta.state, "regression");
});

test("thin-data: fewer than 2 rides in the recent window", () => {
  // A single ride total — the recent window can't reach 2 (resolveRecentStart
  // widens toward the 5th-most-recent ride, but there is only one).
  const r = records({ recent: [debrief({ date: ASOF, horse: "X", q: 7, movements: ["trot-work"] })], base: [] });
  assert.equal(buildLedger(r, "X").meta.state, "thin-data");
});

// ── health LAYOFF (Phase 3, flag-coupled) ────────────────────────────────────

test("health-interruption: a concern overlapping the recent window suppresses regression", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 6, conf: 6, movements: gp })),
    horseHealthEntries: [health({ date: "2026-05-20", horse: "X", issueType: "concern", status: "ongoing" })],
  });
  const out = buildLedger(r, "X");
  assert.equal(out.meta.state, "health-interruption"); // not "regression"
  assert.equal(out.structured.windows.health.overlapsRecent, true);
  assert.match(out.ledger, /LAYOFF/);
});

test("emergency overlapping recent → significant severity, still suppresses regression", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 6, conf: 6, movements: gp })),
    horseHealthEntries: [health({ date: "2026-05-22", horse: "X", issueType: "emergency", title: "acute lameness" })],
  });
  const out = buildLedger(r, "X");
  assert.equal(out.meta.state, "health-interruption");
  assert.equal(out.structured.windows.health.entries[0].severity, "significant");
});

test("maintenance (routine farrier/chiro) is NOT a layoff — regression stands", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 6, conf: 6, movements: gp })),
    horseHealthEntries: [health({ date: "2026-05-20", horse: "X", issueType: "maintenance", title: "farrier" })],
  });
  assert.equal(buildLedger(r, "X").meta.state, "regression");
});

test("a concern resolved BEFORE the recent window does not suppress a current regression", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 6, conf: 6, movements: gp })),
    horseHealthEntries: [health({ date: "2026-03-01", horse: "X", issueType: "concern", status: "resolved", resolvedDate: "2026-03-20" })],
  });
  // resolved 2026-03-20, well before recent window (starts ~2026-05-11) → no overlap of recent
  assert.equal(buildLedger(r, "X").meta.state, "regression");
});

test("CURRENT lay-up that postdates the last ride is surfaced, not dropped (B4)", () => {
  const gp = ["pirouette", "collection"];
  const r = records({
    base: BASE_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "X", q: 8, conf: 8, movements: gp })),
    // Ongoing concern dated AFTER the last ride (ASOF = 2026-06-01) — the fresh
    // lay-up case. Before the fix its span was clamped backwards and dropped.
    horseHealthEntries: [health({ date: "2026-06-06", horse: "X", issueType: "concern", status: "ongoing", title: "right fore lameness" })],
  });
  const out = buildLedger(r, "X");
  const h = out.structured.windows.health;
  assert.equal(h.active, true);
  assert.equal(h.current, true);
  const entry = h.entries.find((e) => e.title === "right fore lameness");
  assert.ok(entry, "the post-last-ride ongoing concern must be present (not dropped)");
  assert.equal(entry.current, true);
  assert.equal(entry.overlapsRecent, false, "it postdates the rides → does not overlap recent RIDES");
  assert.match(out.ledger, /CURRENT — ongoing, began after the last ride/);
  assert.match(out.ledger, /on a soundness interruption RIGHT NOW/);
});

// ── cadence (Rule 2) ─────────────────────────────────────────────────────────

test("computeHorseCadence: per-horse + rider aggregate + never-attribute flag", () => {
  const ds = [
    ...Array.from({ length: 4 }, (_, i) => debrief({ date: `2026-05-0${i + 1}`, horse: "Rocket", q: 8, movements: [] })),
    ...Array.from({ length: 8 }, (_, i) => debrief({ date: `2026-05-1${i}`, horse: "Pony", q: 7, movements: [] })),
  ];
  const cad = computeHorseCadence(ds);
  assert.equal(cad.perHorse["Rocket"].rides, 4);
  assert.equal(cad.perHorse["Pony"].rides, 8);
  assert.equal(cad.riderAggregate.totalRides, 12);
  assert.match(cad.riderAggregate.note, /never attribute to a single horse/i);
  // Per-horse cadence must differ from the rider aggregate (the Rule-2 point).
  assert.notEqual(cad.perHorse["Rocket"].ridesPerWeek, cad.riderAggregate.ridesPerWeek);
});

// ── reflection stamping (Rule 1) ─────────────────────────────────────────────

test("reflections are rider-global (not horse-scoped) and stamped historical in the ledger", () => {
  const r = records({
    recent: RECENT_DATES.map((date) => debrief({ date, horse: "Rocket", q: 8, movements: ["piaffe"] })),
    base: BASE_DATES.map((date) => debrief({ date, horse: "Rocket", q: 8, movements: ["piaffe"] })),
    reflections: [{ id: "r1", userId: "u1", category: "aha", mainReflection: "I was able to show Pony at PSG", feeling: "proud", influence: "x", createdAt: `${ASOF}T12:00:00.000Z`, isDeleted: false }],
  });
  const { units } = deriveEvidenceTags(r, {});
  const refUnit = units.find((u) => u.collection === "reflections");
  assert.equal(refUnit.horseScoped, false); // rider-global, no horse attribution
  const out = buildLedger(r, "Rocket");
  // The rendered ledger must stamp reflection-sourced incidents as historical/rider-global.
  assert.match(out.ledger, /rider-global, historical unless it names the focal horse/);
});

// ── recitation guard (Rule f backstop) ───────────────────────────────────────

test("stripRecitations removes ledger vocabulary clause-aware, keeps clean sentences + numbers", () => {
  const dirty = "The evidence ledger marks rising demand (Axis 1: 0.8 to 1.5). Your confidence rose from 5.1 to 7.5. This is a refinement-phase. Tier 1 sources confirm it.";
  const clean = stripRecitations(dirty);
  assert.doesNotMatch(clean, /ledger/i);
  assert.doesNotMatch(clean, /Axis[-\s]?1/i);
  assert.doesNotMatch(clean, /refinement-phase/i);
  assert.doesNotMatch(clean, /Tier[-\s]?1/);
  // the clean sentence (numbers and all) survives whole — no fragment
  assert.match(clean, /Your confidence rose from 5\.1 to 7\.5\./);
  assert.equal(detectStripDamage(clean).length, 0);
});

test("stripRecitations PRESERVES legitimate rider-facing numbers (no numeric stripping)", () => {
  const legit = "You scored 68% at Training Level on June 26. Ride a 20-meter circle and aim for 3 to 5 clean transitions in 2026. Effort dropped from 7.6 to 6.2 lately.";
  const out = stripRecitations(legit);
  assert.match(out, /68%/);
  assert.match(out, /20-meter/);
  assert.match(out, /June 26/);
  assert.match(out, /3 to 5 clean transitions/);
  assert.match(out, /7\.6 to 6\.2/); // numbers are rule (f)'s job now, NOT the strip's
});

test("stripRecitations PRESERVES newlines + markdown structure", () => {
  const md = "# Heading One\n\nFirst paragraph about Pony.\n\n## Heading Two\n\nSecond paragraph.";
  const out = stripRecitations(md);
  assert.equal(out, md); // no banned tokens → byte-identical, structure intact
  assert.match(out, /\n\n## Heading Two\n\n/);
});

test("stripRecitations drops the whole SENTENCE not the token (no 'demand. demand' fragments)", () => {
  const clean = stripRecitations("Axis-1 demand is rising. Pony improved his balance.");
  assert.doesNotMatch(clean, /Axis/i);
  assert.match(clean, /Pony improved his balance\./);
  assert.equal(detectStripDamage(clean).length, 0);
});

test("stripRecitations drops a banned HEADING clause but keeps the date range", () => {
  assert.equal(
    stripRecitations("## Late February through Early May — The Refinement-Phase Begins"),
    "## Late February through Early May"
  );
});

test("detectRecitations reports fixed-vocabulary labels (no numeric labels)", () => {
  const labels = new Set(detectRecitations("Axis 2 shows a refinement-phase with Tier 3 evidence.").map((h) => h.label));
  assert.ok(labels.has("axis-label"));
  assert.ok(labels.has("state-name"));
  assert.ok(labels.has("tier-label"));
});

test("detectStripDamage flags fragments, short headings, orphaned brackets, bare arrows", () => {
  assert.ok(detectStripDamage("your effort dropped from, meaning less").includes("dangling-preposition"));
  assert.ok(detectStripDamage("## Mi").includes("short-heading"));
  assert.ok(detectStripDamage("see the [Milestone reference here").includes("orphaned-square-bracket"));
  assert.ok(detectStripDamage("riding → → 3 in trot").includes("bare-arrow"));
  assert.equal(detectStripDamage("A perfectly clean sentence about Pony's balance.").length, 0);
});

test("stripRecitationsDeep walks objects/arrays, strips strings, leaves non-strings", () => {
  const dirty = { a: "This is a refinement-phase.", b: ["Axis 1 rising", "ride 4 to 6 loops"], n: 42, ok: true };
  const clean = stripRecitationsDeep(dirty);
  assert.doesNotMatch(clean.a, /refinement-phase/);
  assert.doesNotMatch(clean.b[0], /Axis/);
  assert.match(clean.b[1], /4 to 6/); // legit range preserved
  assert.equal(clean.n, 42);
  assert.equal(clean.ok, true);
});

test("isLedgerEnabled: default-off semantics", () => {
  assert.equal(isLedgerEnabled(null, "journeyMap", "working"), false);
  assert.equal(isLedgerEnabled({ enabled: false }, "journeyMap", "working"), false);
  assert.equal(isLedgerEnabled({ enabled: true, outputs: {} }, "journeyMap", "working"), false);
  assert.equal(isLedgerEnabled({ enabled: true, outputs: { journeyMap: true } }, "journeyMap", "working"), true);
  assert.equal(isLedgerEnabled({ enabled: true, outputs: { journeyMap: true }, tiers: { working: false } }, "journeyMap", "working"), false);
  assert.equal(isLedgerEnabled({ enabled: true, outputs: { coaching: true } }, "journeyMap", "working"), false);
});

test("isLedgerEnabled: allowUids scopes the flag to specific accounts", () => {
  const cfg = { enabled: true, outputs: { coaching: true }, allowUids: ["barb"] };
  assert.equal(isLedgerEnabled(cfg, "coaching", "pilot", "barb"), true);
  assert.equal(isLedgerEnabled(cfg, "coaching", "pilot", "someone-else"), false);
  assert.equal(isLedgerEnabled(cfg, "coaching", "pilot", undefined), false);
  // empty allowUids → not a restriction
  assert.equal(isLedgerEnabled({ enabled: true, outputs: { coaching: true }, allowUids: [] }, "coaching", "pilot", "anyone"), true);
});

test("flag-off byte-stability: wrapWithLedger only PREPENDS; base preserved verbatim", () => {
  const { wrapWithLedger } = require("../lib/evidenceLedger");
  const base = { system: "BASE_SYSTEM_PROMPT", userMessage: "BASE_USER_MESSAGE" };
  // off path: the handler does `ledger ? wrap : base` — null ledger leaves base identical.
  assert.strictEqual((null ? wrapWithLedger(base, {}) : base), base);
  // on path: base content is preserved as a verbatim suffix; only prepends added.
  const w = wrapWithLedger(base, { directive: "DIR\n", ledger: "LED" });
  assert.ok(w.system.endsWith("BASE_SYSTEM_PROMPT"));
  assert.ok(w.userMessage.endsWith("BASE_USER_MESSAGE"));
  assert.ok(w.system.startsWith("DIR"));
  assert.ok(w.userMessage.startsWith("LED"));
});

test("buildLedger returns {error} when there are no debriefs", () => {
  const out = buildLedger({ debriefs: [], lessonNotes: [], reflections: [] }, "X");
  assert.ok(out.error);
});
