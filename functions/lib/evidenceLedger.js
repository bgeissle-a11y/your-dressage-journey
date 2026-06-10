/**
 * Evidence Ledger (Phase 2 — productionized computation).
 *
 * Derives an epistemic "evidence ledger" from a rider's existing records —
 * source-role tags, per-horse cadence, baseline/recent windows + deltas, a
 * two-axis demand trajectory + state, and channel-labeled triangulation pairs —
 * and renders it into a prompt block. Validated out-of-band in
 * experiments/evidence-layering/ across Journey Map, Multi-Voice, and Weekly
 * Focus (Phases 0–1). This is a FAITHFUL CommonJS port of that harness logic.
 *
 * Structure-vs-judgment split (kept exactly as validated): the ledger computes
 * what is reliable (tags, cadence, windows, Axis-1 level demand, channel-labeled
 * pairs). The fuzzy parts — Axis-2 refinement assessment and Rule-4
 * contradiction classification — stay in the PROMPT for the model to judge.
 *
 * Pure core: buildLedger(records, focalHorse, options) → deterministic output.
 * fetchLedgerRecords(uid) is the only impure helper (one read; see note).
 *
 * IMPORTANT (caching): the ledger DATA is rider/window-specific and must be
 * injected into the per-call userMessage (post-cache), NEVER the cached system
 * prefix. The static directive may be a flag-gated system prepend. See
 * wrapWithLedger().
 */

const { db } = require("./firebase");

// ── Constants ────────────────────────────────────────────────────────────────

const HORSE_SCOPED_COLLECTIONS = new Set(["debriefs", "lessonNotes"]);

// Per-channel noise bands on the 1–10 self-report scales. Sub-band movement is HELD.
const NOISE = { overallQuality: 0.7, confidenceLevel: 0.7, riderEffort: 0.7, horseEffort: 0.7 };

// Unified MOVEMENT-difficulty ladder (0–8) for Axis-1 demand, used identically
// for debrief movement TAGS and lesson-note prose. Foundational gaits get
// distinct rungs (walk<trot<canter) so a horse returning from groundwork to
// ridden gaits registers a real climb. Training-scale QUALITY tags and rider-
// global own-video are excluded from the level signal (see deriveDemand).
const MOVEMENT_RUNGS = [
  { score: 8, tags: ["piaffe", "passage"], terms: ["piaffe", "passage"] },
  { score: 7, tags: ["tempi-changes"], terms: ["tempi", "one-tempi", "two-tempi"] },
  { score: 6, tags: ["pirouette", "collection"], terms: ["pirouette", "collection", "collected"] },
  { score: 5, tags: ["half-pass", "flying-change", "extensions"], terms: ["half-pass", "half pass", "flying change", "flying-change", "extension", "extended", "medium trot", "medium canter", "zig-zag"] },
  { score: 4, tags: ["shoulder-in", "haunches-in", "renvers", "counter-canter", "simple-change"], terms: ["shoulder-in", "shoulder in", "haunches-in", "haunches in", "travers", "renvers", "counter-canter", "counter canter", "simple change", "rein-back", "rein back"] },
  { score: 3, tags: ["canter-work", "leg-yield", "turn-on-forehand", "turn-on-haunches"], terms: ["canter", "leg-yield", "leg yield", "turn on the"] },
  { score: 2, tags: ["trot-work", "transitions", "circles", "serpentines", "diagonals", "centerline", "figure-8"], terms: ["trot", "transition", "circle", "serpentine", "diagonal", "centerline"] },
  { score: 1, tags: ["walk-work", "halt-salute"], terms: ["walk", "halt"] },
];
const SATURATED_AT = 6; // recent Axis-1 mean ≥ this ⇒ at/near the top of the ladder
const NOISE_DEMAND = 0.4;

const TAG_DIFFICULTY = {};
for (const rung of MOVEMENT_RUNGS) for (const t of rung.tags) TAG_DIFFICULTY[t] = rung.score;

// Windowing (tuned against measured density; see harness README).
const RECENT_DAYS = 21;
const RECENT_MIN_RIDES = 5;
const BASELINE_DAYS = 84;

const dayMs = 86_400_000;

// ── small helpers ────────────────────────────────────────────────────────────

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (dateStr, n) => iso(new Date(new Date(dateStr).getTime() + n * dayMs));
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const mvTags = (d) => (Array.isArray(d.movements) ? d.movements : Array.isArray(d.movementTags) ? d.movementTags : []);

function mean(nums) {
  const v = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function inWindow(dateStr, start, end) {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d >= start && d <= end;
}

// ── Evidence-tag derivation (port of deriveEvidenceTags.mjs) ──────────────────

function eventDateOf(rec, collection) {
  if (collection === "debriefs") return rec.rideDate || rec.createdAt || null;
  if (collection === "lessonNotes") return rec.lessonDate || rec.createdAt || null;
  if (collection === "observations") return rec.date || rec.createdAt || null;
  return rec.createdAt || null;
}
function daysBetween(laterISO, earlierISO) {
  if (!laterISO || !earlierISO) return null;
  const a = new Date(laterISO).getTime();
  const b = new Date(earlierISO).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((a - b) / dayMs));
}
function reliabilityFromLatency(latencyDays) {
  if (latencyDays == null) return 1;
  if (latencyDays <= 1) return 1.0;
  if (latencyDays <= 3) return 0.85;
  if (latencyDays <= 7) return 0.7;
  if (latencyDays <= 14) return 0.55;
  return 0.4;
}
function joinFields(rec, fields) {
  return fields.map((f) => rec[f]).filter((v) => typeof v === "string" && v.trim()).join("  ¶  ").trim();
}
function observationText(rec) {
  const parts = [];
  for (const f of ["ownVideoDetails", "ownVideoSurprise", "ownVideoMoment", "description"]) {
    if (typeof rec[f] === "string" && rec[f].trim()) parts.push(rec[f].trim());
  }
  if (Array.isArray(rec.observations)) {
    for (const o of rec.observations) {
      for (const v of Object.values(o || {})) if (typeof v === "string" && v.trim()) parts.push(v.trim());
    }
  }
  return parts.join("  ¶  ");
}
function baseUnit(rec, collection, eventDate) {
  const latency = daysBetween(rec.createdAt, eventDate);
  return {
    recordId: rec.id, collection, eventDate, createdAt: rec.createdAt || null,
    captureLatencyDays: latency, reliability: reliabilityFromLatency(latency),
    horseScoped: HORSE_SCOPED_COLLECTIONS.has(collection) ? true : (rec.horseName ? `claims:${rec.horseName}` : false),
    overridden: false, notes: "",
  };
}
function deriveLessonNote(rec) {
  const units = [];
  const ev = eventDateOf(rec, "lessonNotes");
  const instructor = rec.instructorName ? `instructor:${rec.instructorName}` : "instructor";
  const isVideoOfSelf = rec.lessonType === "video-review";
  const t1Text = joinFields(rec, ["movementInstructions", "cuesCorrections", "coachesEye"]);
  if (t1Text) {
    units.push({ ...baseUnit(rec, "lessonNotes", ev), role: "A-technical", channel: "technical", tier: 1,
      fields: ["movementInstructions", "cuesCorrections", "coachesEye"].filter((f) => rec[f]), text: t1Text, weight: "full",
      attribution: isVideoOfSelf ? "video-of-self+instructor" : instructor, notes: isVideoOfSelf ? "video-review: observable third-person" : "" });
  }
  const takeaways = Array.isArray(rec.takeaways) ? rec.takeaways.filter(Boolean).join("  ¶  ") : "";
  const t2Text = [joinFields(rec, ["movementPurpose", "riderReflections"]), takeaways].filter(Boolean).join("  ¶  ");
  if (t2Text) {
    units.push({ ...baseUnit(rec, "lessonNotes", ev), role: "A-technical", channel: "technical", tier: 2,
      fields: ["movementPurpose", "riderReflections", "takeaways"].filter((f) => rec[f] && (f !== "takeaways" || takeaways)),
      text: t2Text, weight: "full", attribution: "rider-gloss", notes: "rider interpretation of the lesson" });
  }
  return units;
}
function deriveObservation(rec) {
  const ev = eventDateOf(rec, "observations");
  const text = observationText(rec);
  if (rec.contextType === "own-video") {
    return [{ ...baseUnit(rec, "observations", ev), role: "A-technical", channel: "technical", tier: 1,
      fields: ["ownVideoDetails", "ownVideoSurprise", "ownVideoMoment", "observations"].filter((f) => rec[f]),
      text, weight: "full", attribution: "video-of-self", notes: "own-video: proprioceptive gap evidence" }];
  }
  return [{ ...baseUnit(rec, "observations", ev), role: "D-context", channel: "context", tier: null,
    fields: ["contextType", "observations"], text: `[${rec.contextType}] ${text}`, weight: "context-only",
    attribution: rec.clinicianName || rec.trainerName || rec.pairObserved || "others", notes: "vicarious — excluded from technical/affective delta" }];
}
function deriveDebrief(rec) {
  const units = [];
  const ev = eventDateOf(rec, "debriefs");
  units.push({ ...baseUnit(rec, "debriefs", ev), role: "B-affective", channel: "affective", tier: 3,
    fields: ["wins", "challenges", "workFocus", "horseNotices", "overallQuality", "confidenceLevel"],
    text: joinFields(rec, ["wins", "challenges", "workFocus", "horseNotices", "mentalState"]), weight: "full",
    attribution: "rider-self", notes: "self-report: authoritative for feel/confidence" });
  if (typeof rec.ahaRealization === "string" && rec.ahaRealization.trim()) {
    units.push({ ...baseUnit(rec, "debriefs", ev), role: "C-critical-incident", channel: "both", tier: 3,
      fields: ["ahaRealization"], text: rec.ahaRealization.trim(), weight: "up", attribution: "rider-self",
      notes: "critical incident — weight up; latency-softened" });
  }
  if (rec.intentionRatings && Object.keys(rec.intentionRatings).length) {
    units.push({ ...baseUnit(rec, "debriefs", ev), role: "goal-anchor", channel: "none", tier: null,
      fields: ["intentionRatings"], text: Object.entries(rec.intentionRatings).map(([k, v]) => `${k} = ${v}/5`).join("  ¶  "),
      weight: "anchor", attribution: "rider-self", notes: "proximal-goal anchor for delta" });
  }
  return units;
}
const REFLECTION_ROLE = {
  aha: { role: "C-critical-incident", channel: "both", weight: "up", notes: "critical incident — weight up" },
  obstacle: { role: "C-critical-incident", channel: "both", weight: "up", notes: "critical incident — weight up" },
  feel: { role: "E-internal-state", channel: "affective", weight: "full", notes: "internal-state sole-source — never overridden" },
  personal: { role: "B-affective", channel: "affective", weight: "full", notes: "" },
  validation: { role: "B-affective", channel: "affective", weight: "full", notes: "" },
  connection: { role: "B-affective", channel: "affective", weight: "full", notes: "" },
};
function deriveReflection(rec) {
  const ev = eventDateOf(rec, "reflections");
  const map = REFLECTION_ROLE[rec.category] || REFLECTION_ROLE.personal;
  return [{ ...baseUnit(rec, "reflections", ev), role: map.role, channel: map.channel, tier: 3,
    fields: ["mainReflection", "feeling", "influence", "obstacleStrategy"].filter((f) => rec[f]),
    text: joinFields(rec, ["mainReflection", "feeling", "influence", "obstacleStrategy"]), weight: map.weight,
    attribution: `rider-self (${rec.category})`, notes: map.notes }];
}
function derivePhysicalSA(rec) {
  const ev = eventDateOf(rec, "physicalAssessments");
  return [{ ...baseUnit(rec, "physicalAssessments", ev), role: "E-internal-state", channel: "both", tier: 3,
    fields: ["physicalChallenges", "physicalStrengths", "asymmetries", "coachCues"].filter((f) => rec[f]),
    text: joinFields(rec, ["physicalChallenges", "physicalStrengths", "asymmetries", "coachCues", "ridingTensionAreas"]),
    weight: "full", attribution: "rider-self (physical SA)", notes: "internal + self-rated technical (optimism-biased)" }];
}
function deriveTechPhilSA(rec) {
  const ev = eventDateOf(rec, "technicalPhilosophicalAssessments");
  return [{ ...baseUnit(rec, "technicalPhilosophicalAssessments", ev), role: "A-technical", channel: "technical", tier: 3,
    fields: ["synthesis"], text: JSON.stringify(rec.synthesis || {}), weight: "full",
    attribution: "rider-self (technical SA)", notes: "self-rated technical → provisional, never asserted as confirmed gain" }];
}
function deriveEvidenceTags(records, overrides = {}) {
  const units = [];
  for (const rec of records.debriefs || []) units.push(...deriveDebrief(rec));
  for (const rec of records.lessonNotes || []) units.push(...deriveLessonNote(rec));
  for (const rec of records.observations || []) units.push(...deriveObservation(rec));
  for (const rec of records.reflections || []) units.push(...deriveReflection(rec));
  for (const rec of records.physicalAssessments || []) units.push(...derivePhysicalSA(rec));
  for (const rec of records.technicalPhilosophicalAssessments || []) units.push(...deriveTechPhilSA(rec));
  for (const u of units) {
    const ov = overrides[u.recordId];
    if (ov && (ov.role || ov.tier != null)) {
      if (ov.role) u.role = ov.role;
      if (ov.tier != null) u.tier = ov.tier;
      u.overridden = true;
      u.notes = (u.notes ? u.notes + " · " : "") + "OVERRIDE applied";
    }
  }
  const byRecord = {};
  for (const u of units) (byRecord[u.recordId] || (byRecord[u.recordId] = [])).push(u);
  return { units, byRecord };
}

// ── Per-horse cadence (port of exportSlice computeHorseCadence) ───────────────

function computeHorseCadence(allDebriefs) {
  const byHorse = {};
  for (const d of allDebriefs) {
    const name = (d.horseName || "Unspecified").trim();
    const date = (d.rideDate || d.createdAt || "").slice(0, 10);
    if (!date) continue;
    (byHorse[name] || (byHorse[name] = [])).push(date);
  }
  const table = {};
  let riderFirst = null, riderLast = null;
  for (const [name, dates] of Object.entries(byHorse)) {
    dates.sort();
    const first = dates[0], last = dates[dates.length - 1];
    if (!riderFirst || first < riderFirst) riderFirst = first;
    if (!riderLast || last > riderLast) riderLast = last;
    const spanWeeks = Math.max(1, (new Date(last) - new Date(first)) / (7 * dayMs));
    table[name] = { rides: dates.length, firstRide: first, lastRide: last, spanWeeks: round1(spanWeeks), ridesPerWeek: round1(dates.length / spanWeeks) };
  }
  const riderSpanWeeks = Math.max(1, (new Date(riderLast) - new Date(riderFirst)) / (7 * dayMs));
  return {
    perHorse: table,
    riderAggregate: { totalRides: allDebriefs.length, ridesPerWeek: round1(allDebriefs.length / riderSpanWeeks), note: "rider-level total across ALL horses — never attribute to a single horse" },
  };
}

// ── Windows + two-axis demand + state (port of buildWindows.mjs) ──────────────

function resolveRecentStart(debriefDates, asOf) {
  const byDateDesc = [...debriefDates].sort((a, b) => b.localeCompare(a));
  const byDays = addDays(asOf, -RECENT_DAYS);
  const byCount = byDateDesc[Math.min(RECENT_MIN_RIDES, byDateDesc.length) - 1] || byDays;
  return byDays < byCount ? byDays : byCount;
}
function debriefMetrics(debriefs) {
  return {
    count: debriefs.length,
    overallQuality: round1(mean(debriefs.map((d) => d.overallQuality))),
    confidenceLevel: round1(mean(debriefs.map((d) => d.confidenceLevel))),
    riderEffort: round1(mean(debriefs.map((d) => d.riderEffort))),
    horseEffort: round1(mean(debriefs.map((d) => d.horseEffort))),
  };
}
function deltaCell(recent, baseline, band) {
  if (recent == null || baseline == null) return { recent, baseline, delta: null, significant: false, direction: "insufficient" };
  const delta = round1(recent - baseline);
  const significant = Math.abs(delta) >= band;
  return { recent, baseline, delta, significant, direction: !significant ? "held" : delta > 0 ? "up" : "down" };
}
function demandScore(text) {
  const t = (text || "").toLowerCase();
  for (const rung of MOVEMENT_RUNGS) if (rung.terms.some((w) => t.includes(w))) return rung.score;
  return 0;
}
function tagDifficulty(tags) {
  let max = null;
  for (const t of tags || []) {
    if (typeof t !== "string") continue;
    if (t.startsWith("gw-")) { max = Math.max(max == null ? 0 : max, 0); continue; }
    const d = TAG_DIFFICULTY[t];
    if (d != null) max = Math.max(max == null ? 0 : max, d);
  }
  return max;
}
function deriveDemand(units, debriefs, rS, rE, bS, bE) {
  // Axis-1 coach-demand uses ONLY horse-scoped Tier-1 lesson evidence; rider-global
  // own-video is excluded (it can concern any horse and contaminates the level signal).
  const t1 = units.filter((u) => u.collection === "lessonNotes" && u.tier === 1);
  const axis1Window = (start, end) => {
    const lessonUnits = t1.filter((u) => inWindow(u.eventDate, start, end));
    const lessonScores = lessonUnits.map((u) => demandScore(u.text)).filter((s) => s > 0);
    const debriefScores = debriefs.filter((d) => inWindow(eventDateOf(d, "debriefs"), start, end)).map((d) => tagDifficulty(mvTags(d))).filter((s) => s != null);
    const all = [...lessonScores, ...debriefScores];
    const topTerms = [...new Set(lessonUnits.flatMap((u) => {
      const t = (u.text || "").toLowerCase();
      return MOVEMENT_RUNGS.filter((r) => r.score >= 5).flatMap((r) => r.terms).filter((w) => t.includes(w));
    }))];
    return { mean: all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : null, n: all.length, lessons: lessonScores.length, debriefs: debriefScores.length, topTerms };
  };
  const recent = axis1Window(rS, rE);
  const baseline = axis1Window(bS, bE);
  let direction = "insufficient";
  if (recent.mean != null && baseline.mean != null) {
    const d = recent.mean - baseline.mean;
    direction = Math.abs(d) < NOISE_DEMAND ? "stable" : d > 0 ? "rising" : "declining";
  }
  const saturated = recent.mean != null && recent.mean >= SATURATED_AT;
  return {
    axis1: { recent, baseline, direction, saturated },
    axis2: {
      assessedBy: "model",
      recentTier1Count: t1.filter((u) => inWindow(u.eventDate, rS, rE)).length,
      baselineTier1Count: t1.filter((u) => inWindow(u.eventDate, bS, bE)).length,
      note: "Within-level refinement never saturates; assess from Tier-1 lesson content in the ledger.",
    },
  };
}
/**
 * Detect a health/soundness LAYOFF (Phase 3, flag-coupled). A 'concern' or
 * 'emergency' horseHealthEntry whose span [date, resolvedDate||asOf] overlaps the
 * baseline/recent windows marks an interruption. Used to SUPPRESS the
 * declining/concern delta interpretation across that span (a medical gap is not a
 * plateau/regression). 'maintenance' (routine farrier/chiro) is NOT a layoff.
 */
function detectLayoff(healthEntries, recentStart, recentEnd, baselineStart) {
  const overlaps = (s, e, ws, we) => s <= we && e >= ws;
  const maxDate = (a, b) => (a >= b ? a : b);
  const entries = (healthEntries || [])
    .filter((h) => h.issueType === "concern" || h.issueType === "emergency")
    .map((h) => {
      const start = (h.date || h.createdAt || "").slice(0, 10);
      const resolved = h.status === "resolved" && h.resolvedDate;
      // An UNRESOLVED interruption runs to the present. Anchor its end at the
      // LATER of the recent-window end and its own start, so a lay-up that begins
      // AFTER the last ride still has a forward (valid) span and is not dropped.
      const end = resolved ? String(h.resolvedDate).slice(0, 10) : maxDate(recentEnd, start);
      const ongoing = h.status !== "resolved";
      return {
        title: h.title || h.issueType, issueType: h.issueType, status: h.status || "ongoing",
        severity: h.issueType === "emergency" ? "significant" : "moderate", start, end, ongoing,
        overlapsRecent: !!start && overlaps(start, end, recentStart, recentEnd),
        // CURRENT = an unresolved interruption reaching the present (end at/after
        // the recent-window end), even if it postdates the last ride. This is the
        // "horse is laid up right now" signal the output must surface.
        current: ongoing && !!start && end >= recentEnd,
      };
    })
    // Keep anything overlapping the analyzed span PLUS any current interruption —
    // a fresh post-last-ride lay-up would otherwise be invisible to the output.
    .filter((i) => i.start && (overlaps(i.start, i.end, baselineStart, recentEnd) || i.current));
  return {
    active: entries.length > 0,
    overlapsRecent: entries.some((i) => i.overlapsRecent),
    current: entries.some((i) => i.current),
    entries,
  };
}

function buildWindows(records, units) {
  const debriefs = records.debriefs || [];
  const debriefDates = debriefs.map((d) => eventDateOf(d, "debriefs")).filter(Boolean).map(iso);
  if (!debriefDates.length) return { error: "no debriefs in slice" };
  const asOf = debriefDates.sort((a, b) => b.localeCompare(a))[0];
  const recentStart = resolveRecentStart(debriefDates, asOf);
  const recentEnd = asOf;
  const baselineEnd = addDays(recentStart, -1);
  const baselineStart = addDays(recentStart, -BASELINE_DAYS);

  const recentDebriefs = debriefs.filter((d) => inWindow(eventDateOf(d, "debriefs"), recentStart, recentEnd));
  const baselineDebriefs = debriefs.filter((d) => inWindow(eventDateOf(d, "debriefs"), baselineStart, baselineEnd));

  const techUnits = units.filter((u) => (u.channel === "technical" || u.channel === "both") && u.role.startsWith("A"));
  const techIn = (start, end) => {
    const us = techUnits.filter((u) => inWindow(u.eventDate, start, end));
    return { tier1: us.filter((u) => u.tier === 1).length, tier2: us.filter((u) => u.tier === 2).length, tier3: us.filter((u) => u.tier === 3).length, total: us.length };
  };
  const techRecent = techIn(recentStart, recentEnd);
  const techBaseline = techIn(baselineStart, baselineEnd);

  const recM = debriefMetrics(recentDebriefs);
  const baseM = debriefMetrics(baselineDebriefs);
  const affective = {
    overallQuality: deltaCell(recM.overallQuality, baseM.overallQuality, NOISE.overallQuality),
    confidenceLevel: deltaCell(recM.confidenceLevel, baseM.confidenceLevel, NOISE.confidenceLevel),
    riderEffort: deltaCell(recM.riderEffort, baseM.riderEffort, NOISE.riderEffort),
    horseEffort: deltaCell(recM.horseEffort, baseM.horseEffort, NOISE.horseEffort),
    rideVolume: { recent: recM.count, baseline: baseM.count },
  };
  const obstacleUnits = units.filter((u) => u.role === "C-critical-incident" && u.collection === "reflections");
  const obstacleRecent = obstacleUnits.filter((u) => inWindow(u.eventDate, recentStart, recentEnd)).length;
  const obstacleBaseline = obstacleUnits.filter((u) => inWindow(u.eventDate, baselineStart, baselineEnd)).length;

  const demand = deriveDemand(units, debriefs, recentStart, recentEnd, baselineStart, baselineEnd);
  const a1 = demand.axis1;
  const health = detectLayoff(records.horseHealthEntries, recentStart, recentEnd, baselineStart);

  const q = affective.overallQuality, conf = affective.confidenceLevel, effort = recM.riderEffort;
  const baselineRatePerWeek = baseM.count / (BASELINE_DAYS / 7);
  const recentRatePerWeek = recM.count / (RECENT_DAYS / 7);
  const engaged = effort != null && effort >= 6 && recentRatePerWeek >= baselineRatePerWeek * 0.7;

  let plateauState = "insufficient", rationale = "";
  if (recM.count < 2) {
    plateauState = "thin-data";
    rationale = `Only ${recM.count} recent ride(s) — too few to call a trend.`;
  } else if (health.overlapsRecent && (q.direction === "down" || conf.direction === "down" || a1.direction === "declining")) {
    // Health interruption suppresses the declining/concern read across the span —
    // a medical gap is not a plateau or regression (Phase 3, flag-coupled).
    const sev = health.entries.find((e) => e.overlapsRecent) || health.entries[0];
    plateauState = "health-interruption";
    rationale = `A documented ${sev.severity} health/soundness interruption (${sev.title}) overlaps the recent window — reduced rides, lighter work, or lower demand have a MEDICAL cause and must not be read as a plateau, regression, or loss of progress.`;
  } else if (q.direction === "down" && conf.direction === "down") {
    plateauState = "regression";
    rationale = `Both quality (${q.delta}) and confidence (${conf.delta}) dropped past the noise band, with Axis-1 demand ${a1.direction}.`;
  } else if (a1.saturated && q.direction === "held") {
    plateauState = "refinement-phase";
    rationale = `Execution flat (quality held, Δ ${q.delta}) and the level ladder is SATURATED (Axis 1 ${a1.recent.mean}/8). Whether this is progress hinges on Axis-2 refinement demand (lightness/throughness/self-carriage), which the model assesses from the Tier-1 lesson content — flat movement-level with rising refinement = a refinement phase, not a plateau.`;
  } else if (a1.direction === "rising" && !a1.saturated && q.direction !== "down") {
    plateauState = "progress-rising-demand";
    rationale = `AXIS-1 demand is RISING (level difficulty ${a1.baseline.mean == null ? "—" : a1.baseline.mean} → ${a1.recent.mean == null ? "—" : a1.recent.mean}; ${a1.recent.lessons} lesson + ${a1.recent.debriefs} debrief samples), execution ${q.direction}. The horse/rider is climbing the ladder — credit this as progress, with execution-mastery kept separate. New harder work is expected to be rough.`;
  } else if (q.direction === "up") {
    plateauState = "ascending";
    rationale = `Quality up ${q.delta} past the noise band${conf.direction === "up" ? `, confidence up ${conf.delta}` : ""}${a1.direction === "rising" ? ", with Axis-1 demand also rising" : ""}.`;
  } else if (q.direction === "held" && engaged) {
    plateauState = "plateau-consolidation";
    rationale = `Execution flat (quality held, Δ ${q.delta}) while effort stays high (${effort}/10), cadence holds (${round1(recentRatePerWeek)}/wk vs ${round1(baselineRatePerWeek)}/wk), Axis-1 demand ${a1.direction} below ceiling. Read as consolidation (unless Axis-2 refinement is rising — model-assessed), not thin data or regression.`;
  } else {
    plateauState = "steady";
    rationale = `Mixed signal — quality ${q.direction} (Δ ${q.delta}), confidence ${conf.direction}, Axis-1 demand ${a1.direction}; no single dominant trend.`;
  }

  const criticalIncidents = units.filter((u) => u.role === "C-critical-incident").map((u) => ({
    date: (u.eventDate || "").slice(0, 10), source: u.collection, attribution: u.attribution, reliability: u.reliability,
    captureLatencyDays: u.captureLatencyDays, recent: inWindow(u.eventDate, recentStart, recentEnd), text: u.text.slice(0, 280),
  })).sort((a, b) => b.date.localeCompare(a.date));
  const goalAnchors = units.filter((u) => u.role === "goal-anchor" && inWindow(u.eventDate, recentStart, recentEnd))
    .map((u) => ({ date: (u.eventDate || "").slice(0, 10), text: u.text }));

  return {
    asOf,
    recentWindow: { start: recentStart, end: recentEnd, debriefCount: recM.count },
    baselineWindow: { start: baselineStart, end: baselineEnd, debriefCount: baseM.count },
    noiseBands: NOISE,
    channels: {
      technical: {
        recent: techRecent, baseline: techBaseline,
        deltaNote: techRecent.tier1 + techRecent.tier2 === 0
          ? "No Tier 1/2 technical corroboration in the recent window — technical claims must be reported as provisional."
          : `Recent Tier1/2 corroboration: ${techRecent.tier1}×T1 + ${techRecent.tier2}×T2 (baseline ${techBaseline.tier1}×T1 + ${techBaseline.tier2}×T2).`,
      },
      affective: { ...affective, obstacleReflections: { recent: obstacleRecent, baseline: obstacleBaseline } },
      demand,
    },
    health,
    plateau: { state: plateauState, rationale },
    criticalIncidents, goalAnchors,
  };
}

// ── Triangulation (port of triangulate.mjs — channel-labeled, no verdict) ─────

const MOVEMENT_TERMS = [
  "walk", "trot", "canter", "halt", "transition", "circle", "serpentine", "diagonal", "centerline", "leg yield", "leg-yield",
  "shoulder-in", "shoulder in", "haunches", "renvers", "travers", "half pass", "half-pass", "counter canter", "counter-canter",
  "flying change", "change", "pirouette", "extension", "medium", "collection", "collected", "rhythm", "contact", "impulsion",
  "straightness", "bend", "suppleness", "engagement", "frame", "poll", "seat", "rein", "outside rein", "inside leg",
  "piaffe", "passage", "tempi", "jaw", "neck", "shoulder", "hind leg", "hindquarters",
];
const STATE_WORDS = [
  "soft", "softer", "through", "balanced", "connected", "round", "straight", "forward", "relaxed", "even", "light", "loose",
  "swing", "swinging", "uphill", "evasion", "evading", "stiff", "stiffness", "crooked", "hollow", "hollowing", "late", "behind",
  "against", "resist", "resisting", "brace", "bracing", "tense", "tension", "blocked", "blocking", "leaning", "tight", "dropped",
  "dropping", "engaged", "lifted", "sat", "carrying", "honest", "obedient",
];
const lc = (s) => (s || "").toLowerCase();
function sharedTerms(a, b) { const ta = lc(a), tb = lc(b); return MOVEMENT_TERMS.filter((w) => ta.includes(w) && tb.includes(w)); }
function instructorText(note) { return [note.movementInstructions, note.cuesCorrections, note.coachesEye].filter(Boolean).join("  "); }
function riderAffectiveText(d) { return [d.wins, d.mentalState, d.horseNotices].filter(Boolean).join("  "); }
function riderAllText(d) { return [d.wins, d.challenges, d.workFocus, d.ahaRealization, d.horseNotices].filter(Boolean).join("  "); }
function technicalAssertions(text) {
  const sentences = String(text || "").split(/(?<=[.!?])\s+|\n+/);
  const out = [];
  for (const s of sentences) {
    const t = lc(s);
    if (MOVEMENT_TERMS.some((w) => t.includes(w)) && STATE_WORDS.some((w) => t.includes(w)) && s.trim().length > 8) out.push(s.trim());
  }
  return out;
}
function triangulate(records) {
  const debriefById = new Map((records.debriefs || []).map((d) => [d.id, d]));
  const pairs = [];
  for (const note of records.lessonNotes || []) {
    if (!note.linkedDebriefId) continue;
    const debrief = debriefById.get(note.linkedDebriefId);
    if (!debrief) {
      pairs.push({ lessonNoteId: note.id, lessonDate: (note.lessonDate || "").slice(0, 10), linkedDebriefId: note.linkedDebriefId, status: "dangling-link", note: "lesson note links to a debrief outside the focal-horse slice (other horse or deleted)" });
      continue;
    }
    const instr = instructorText(note);
    const riderAffective = riderAffectiveText(debrief);
    const riderAssertions = technicalAssertions(riderAllText(debrief));
    const shared = sharedTerms(instr, riderAllText(debrief));
    const q = typeof debrief.overallQuality === "number" ? debrief.overallQuality : null;
    pairs.push({
      lessonNoteId: note.id, debriefId: debrief.id, lessonDate: (note.lessonDate || "").slice(0, 10), rideDate: (debrief.rideDate || "").slice(0, 10),
      instructor: note.instructorName || "", sharedTerms: shared, overallQuality: q,
      coachTechnical: instr.slice(0, 360), riderAffective: riderAffective.slice(0, 280),
      riderTechnicalAssertions: riderAssertions.slice(0, 4), hasRiderTechnicalAssertion: riderAssertions.length > 0, status: "paired",
    });
  }
  const paired = pairs.filter((p) => p.status === "paired");
  return {
    pairs,
    summary: {
      totalLinked: pairs.length, paired: paired.length, dangling: pairs.filter((p) => p.status === "dangling-link").length,
      withRiderTechnicalAssertion: paired.filter((p) => p.hasRiderTechnicalAssertion).length,
      note: "Convergence/contradiction is classified by the model (Rule 4), not precomputed here. Only pairs where the rider makes a technical assertion can technically-contradict the coach.",
    },
  };
}

// ── Directive + ledger rendering (port of assembleExperimentalPrompt.mjs) ─────

function buildInstructions(cadenceTableText) {
  return `══════════════════════════════════════════════════════════════
EVIDENCE-LAYERING DIRECTIVE (overrides nothing below)
══════════════════════════════════════════════════════════════
You are given a pre-computed EVIDENCE LEDGER for this rider, derived from the
same records you already have, but tagged by SOURCE ROLE, CHANNEL, and
CREDIBILITY TIER. Use it to govern HOW confidently you state things. Do not
change the output's structure or your voice — only its epistemic discipline.

Core rules:
(a) TECHNICAL claims (biomechanics, whether a movement improved) must be tied to
    Tier-1 (instructor-attributed or observable video-of-self) or Tier-2 (rider's
    gloss on a lesson) evidence. A technical claim supported ONLY by Tier-3
    self-rating is PROVISIONAL — "you felt X was landing," never a confirmed gain,
    unless a Tier-1/2 source corroborates.
(b) AFFECTIVE / feel / confidence / motivation: the rider's own self-report is
    AUTHORITATIVE. Never let a coach/technical source override how the rider felt.
(c) When the ledger marks a PLATEAU / CONSOLIDATION state, name it as consolidation
    or deepening — NOT thin data, regression, or "not enough is happening."
(d) If a real CONTRADICTION exists (per TRIANGULATION below), surface it honestly.
(e) Do NOT claim progress the ledger does not support. Sub-threshold movement is HELD.
(f) The ledger is INTERNAL scaffolding. GOVERN your statements with it, but never recite
    its raw numbers, scale points, axis labels ("Axis 1/2"), state names
    ("refinement-phase"), tier names, or record IDs in the rider-facing output. Translate
    into natural coaching language — not "your effort fell 7.6 → 6.2" but "you're finding
    more ease"; not "Axis-1 demand is saturated" but "you're working at the top of the level."

──────────────────────────────────────────────
PER-HORSE CADENCE (operative data for the per-horse discipline in your base context)
- Per-horse ride cadence for this rider:
${cadenceTableText}
  Use these figures only; do not infer a different frequency. (TEMPORAL FRAMING and
  PER-HORSE FACTUAL DISCIPLINE are in your base context and apply here too; this block
  only supplies the per-horse numbers they require.)

DEMAND AS PROGRESS (Rule 3 — two axes; neither is execution)
The technical channel carries an EXECUTION signal and a DEMAND signal. DEMAND has
two axes:
  • Axis 1 — Level/movement difficulty: the hardest movements being worked
    (Training→GP ladder). Rising = progress. SATURATES at the top of the ladder.
  • Axis 2 — Within-level refinement: the quality/precision now demanded of movements
    the rider can already produce — lightness, throughness, self-carriage, straightness,
    cadence, less aid, more collection. This axis NEVER saturates, at any level
    including Grand Prix.
Rules:
  - A rise on EITHER axis is upward progress, independent of whether execution is yet
    clean.
  - Distinguish GROSS execution (the movement happens) from REFINED execution (it
    happens to the quality now demanded). Moving from gross to refined demand is
    progress even when refined execution is incomplete.
  - For a horse at the top of the level ladder, read progress primarily on Axis 2.
    Flat movement-level with rising refinement demand is a REFINEMENT PHASE — progress,
    not a plateau.
  - Plateau/consolidation = stable demand on BOTH axes with stable execution.
    Concern = declining execution at stable demand.
  - The ledger computes Axis 1 structurally and flags whether it is saturated. Axis 2
    is for YOU to assess from the Tier-1 lesson content in the ledger — judge whether
    the coach now demands more refinement of already-producible movements.

TRIANGULATION / CONTRADICTION (Rule 4)
- Compare LIKE WITH LIKE. The rider's quality/satisfaction rating and feel are
  AFFECTIVE data. Do NOT compare them against the coach's technical assessment to
  judge agreement or disagreement.
- CONTRADICTION fires ONLY when the rider makes a TECHNICAL ASSERTION about the ride
  that conflicts with the coach's technical assessment of the same ride (e.g., rider:
  "the left rein felt soft and through" vs. coach: "left-rein evasion throughout").
- The rider NOT naming a fault the coach named is NOT a contradiction — she reports
  feel and satisfaction; the coach reports technical detail; expect fewer, different
  things. Label that COMPLEMENTARY, not divergent.
- A high satisfaction rating alongside extensive or critical coaching is the NORMAL,
  healthy pattern of riding through difficulty to a sense of accomplishment. Do not
  flag it as contradiction, and do not treat it as confirmation of the coach's
  positives. It is affective signal only.
- Categories: convergence (technical claims align) · technical-contradiction
  (technical claims conflict) · complementary (coach-technical + rider-affective, no
  conflict) · insufficient. In the ledger, only pairs marked "rider technical
  assertion present" can be a technical-contradiction; all others are at most
  complementary.

HEALTH INTERRUPTION (operative — only when the ledger shows a LAYOFF marker)
- A LAYOFF marker means a vet/soundness interruption overlaps the window. Across that
  span, do NOT read reduced rides, lighter work, or lower demand as a plateau,
  regression, or concern. Frame it as an interruption with a medical cause and orient
  toward return-to-work. (The unconditional principle is in the base context; this
  marker is the operative signal that it applies right now.) Never override veterinary
  or professional judgment.

Weight CRITICAL INCIDENTS (Aha / Obstacle, same-day debrief realizations) above
routine entries, but soften them in proportion to capture latency (a realization
logged two weeks later is recalled, not observed).
══════════════════════════════════════════════════════════════
`;
}

function fmtDelta(cell) {
  if (!cell || cell.delta == null) return `n/a (recent ${cell ? cell.recent : "—"}, baseline ${cell ? cell.baseline : "—"})`;
  const arrow = cell.direction === "up" ? "▲" : cell.direction === "down" ? "▼" : "▬";
  return `${cell.recent} vs ${cell.baseline}  Δ ${cell.delta} ${arrow}${cell.significant ? "" : " (within noise — HELD)"}`;
}
function cadenceTableText(cadence) {
  if (!cadence) return "  (cadence unavailable)";
  const rows = Object.entries(cadence.perHorse || {}).map(([name, c]) => `    ${name}: ${c.rides} rides / ~${c.spanWeeks} wk ≈ ${c.ridesPerWeek}/week`);
  rows.push(`    RIDER AGGREGATE (all horses combined): ${cadence.riderAggregate.ridesPerWeek}/week — NEVER attribute to a single horse`);
  return rows.join("\n");
}
function renderEvidenceLedger(windows, tagResult, triangulation, focalHorse) {
  const w = windows, horse = focalHorse;
  const lines = [];
  lines.push("EVIDENCE LEDGER (recent vs. self-referenced baseline)");
  lines.push(`Focal horse: ${horse}  ·  as-of ${w.asOf}`);
  lines.push(`Recent window:   ${w.recentWindow.start} → ${w.recentWindow.end}  (${w.recentWindow.debriefCount} ${horse} rides)`);
  lines.push(`Baseline window: ${w.baselineWindow.start} → ${w.baselineWindow.end}  (${w.baselineWindow.debriefCount} ${horse} rides)`);
  lines.push(`NOTE: ${horse} debriefs + lesson notes are horse-scoped. Reflections, observations, and self-assessments are RIDER-GLOBAL — they may concern ANY of the rider's horses; do not attribute them to ${horse} unless the text names ${horse}.`);
  lines.push("");
  lines.push("— AFFECTIVE channel (rider self-report; Tier 3; authoritative for feel) —");
  lines.push(`  Overall quality:  ${fmtDelta(w.channels.affective.overallQuality)}`);
  lines.push(`  Confidence:       ${fmtDelta(w.channels.affective.confidenceLevel)}`);
  lines.push(`  Rider effort:     ${fmtDelta(w.channels.affective.riderEffort)}`);
  lines.push(`  Horse effort:     ${fmtDelta(w.channels.affective.horseEffort)}`);
  lines.push(`  Obstacle reflections: recent ${w.channels.affective.obstacleReflections.recent}, baseline ${w.channels.affective.obstacleReflections.baseline}`);
  lines.push("");
  lines.push("— TECHNICAL channel: EXECUTION corroboration by tier (T1 instructor/video-of-self > T2 rider-gloss > T3 self-rated) —");
  const tr = w.channels.technical.recent, tb = w.channels.technical.baseline;
  lines.push(`  Recent:   T1=${tr.tier1}  T2=${tr.tier2}  T3=${tr.tier3}`);
  lines.push(`  Baseline: T1=${tb.tier1}  T2=${tb.tier2}  T3=${tb.tier3}`);
  lines.push(`  ${w.channels.technical.deltaNote}`);
  lines.push("");
  const dm = w.channels.demand, a1 = dm.axis1;
  lines.push("— TECHNICAL channel: DEMAND (two axes; neither is execution) —");
  lines.push(`  Axis 1 — level/movement difficulty (SATURATES): baseline ${a1.baseline.mean == null ? "—" : a1.baseline.mean} → recent ${a1.recent.mean == null ? "—" : a1.recent.mean}  ⇒ ${a1.direction.toUpperCase()}${a1.saturated ? "  [AT/NEAR CEILING]" : ""}`);
  lines.push(`     difficulty samples (recent): ${a1.recent.lessons} from lessons + ${a1.recent.debriefs} from debrief movement tags`);
  if (a1.recent.topTerms.length) lines.push(`     recent harder movements: ${a1.recent.topTerms.slice(0, 6).join(", ")}`);
  lines.push(`  Axis 2 — within-level refinement (NEVER saturates): MODEL-ASSESSED. Read the Tier-1 lesson content below and judge whether the coach now demands more lightness/throughness/self-carriage/collection of movements already producible.`);
  lines.push(`  (Rising on EITHER axis = progress even if execution is still rough — keep demand and mastery separate.)`);
  lines.push("");
  lines.push(`— STATE: ${w.plateau.state.toUpperCase()} —`);
  lines.push(`  ${w.plateau.rationale}`);
  lines.push("");
  if (w.health && w.health.active) {
    lines.push("— HEALTH / SOUNDNESS (LAYOFF marker) —");
    for (const i of w.health.entries) {
      const span = (i.current && !i.overlapsRecent) ? "  (CURRENT — ongoing, began after the last ride)"
        : i.overlapsRecent ? "  (overlaps recent window)"
          : i.current ? "  (ongoing)"
            : "  (baseline only)";
      lines.push(`  LAYOFF [${i.severity}] ${i.title}: ${i.start} → ${i.end}${span}`);
    }
    const laidUpNow = w.health.entries.some((i) => i.current && !i.overlapsRecent);
    if (laidUpNow) {
      lines.push(`  CURRENT INTERRUPTION: ${horse} is on a soundness interruption RIGHT NOW, begun AFTER the most recent ride. Those rides describe work BEFORE the layoff — do NOT present that work as ${horse}'s present state. Lead with the current status, frame it as an interruption with a medical cause (not a plateau, regression, or loss of progress), and orient toward return-to-work.`);
    }
    lines.push("  Across any layoff span: suppress 'declining'/'concern' reads — reduced rides/demand have a MEDICAL cause, not a plateau or regression. Orient toward return-to-work.");
    lines.push("");
  }
  if (w.criticalIncidents.length) {
    lines.push("— CRITICAL INCIDENTS (recent first; reliability = latency-softened) —");
    for (const ci of w.criticalIncidents.slice(0, 8)) {
      const tag = ci.recent ? "[RECENT-WINDOW]" : "[baseline-window]";
      const scope = ci.source === "reflections" ? "rider-global, historical unless it names the focal horse & a current date" : `${horse} ride ${ci.date}`;
      lines.push(`  ${tag} written ${ci.date} (${ci.source}; ${scope}; reliability ${ci.reliability}): ${ci.text.replace(/\s+/g, " ").slice(0, 200)}`);
    }
    lines.push("");
  }
  if (triangulation.summary.paired) {
    lines.push(`— TRIANGULATION (lesson note ↔ linked debrief, same ride; ${triangulation.summary.paired} pairs) —`);
    lines.push(`  Classify each per Rule 4. Only pairs flagged "rider technical assertion" can be a technical-contradiction; others are at most complementary.`);
    const paired = triangulation.pairs.filter((p) => p.status === "paired");
    const ordered = [...paired].sort((a, b) => Number(b.hasRiderTechnicalAssertion) - Number(a.hasRiderTechnicalAssertion));
    for (const p of ordered.slice(0, 8)) {
      lines.push(`  • ride ${p.rideDate} (q ${p.overallQuality == null ? "?" : p.overallQuality}), lesson ${p.lessonDate} (${p.instructor})${p.hasRiderTechnicalAssertion ? "  [rider technical assertion present]" : "  [rider affective only]"}`);
      lines.push(`      coach-technical: ${p.coachTechnical.replace(/\s+/g, " ").slice(0, 180)}`);
      lines.push(`      rider-affective: ${p.riderAffective.replace(/\s+/g, " ").slice(0, 140) || "(none)"}`);
      if (p.hasRiderTechnicalAssertion) lines.push(`      rider-technical-assertion: ${p.riderTechnicalAssertions.join(" / ").slice(0, 180)}`);
    }
    lines.push("");
  }
  const techT1 = tagResult.units.filter((u) => u.tier === 1 && u.role.startsWith("A"));
  if (techT1.length) {
    lines.push(`— TIER-1 TECHNICAL SOURCES (attribute confirmed ${horse} technical claims to these; this is also the Axis-2 REFINEMENT evidence to assess) —`);
    for (const u of techT1.slice(-6)) lines.push(`  ${(u.eventDate || "").slice(0, 10)} ${u.attribution}: ${u.text.replace(/\s+/g, " ").slice(0, 160)}`);
    lines.push("");
  }
  lines.push("END EVIDENCE LEDGER. Apply the directive above when writing the output.");
  return lines.join("\n");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scope a record set to a focal horse: debriefs + lessonNotes filter by
 * horseName; everything else is rider-global and passes through.
 */
function scopeToFocalHorse(records, focalHorse) {
  const scoped = { ...records };
  for (const c of ["debriefs", "lessonNotes", "horseHealthEntries"]) {
    scoped[c] = (records[c] || []).filter((r) => (r.horseName || "").trim() === focalHorse);
  }
  return scoped;
}

/**
 * Build the evidence ledger. PURE — given records it returns deterministic output.
 *
 * @param {object} records  ALL the rider's records (all horses):
 *   { debriefs, lessonNotes, reflections, observations, physicalAssessments,
 *     technicalPhilosophicalAssessments }
 * @param {string} focalHorse  horse name to scope the horse-scoped channels to
 * @param {object} [options]  { overrides? }
 * @returns {{ directive, ledger, structured, meta } | { error }}
 */
function buildLedger(records, focalHorse, options = {}) {
  const allDebriefs = records.debriefs || [];
  const cadence = computeHorseCadence(allDebriefs);
  const scoped = scopeToFocalHorse(records, focalHorse);
  const tagResult = deriveEvidenceTags(scoped, options.overrides || {});
  const windows = buildWindows(scoped, tagResult.units);
  if (windows.error) return { error: windows.error, meta: { focalHorse } };
  const triangulation = triangulate(scoped);
  const directive = buildInstructions(cadenceTableText(cadence));
  const ledger = renderEvidenceLedger(windows, tagResult, triangulation, focalHorse);
  return {
    directive,
    ledger,
    structured: { windows, triangulation, tags: tagResult, cadence },
    meta: { focalHorse, state: windows.plateau.state, asOf: windows.asOf, unitCount: tagResult.units.length },
  };
}

/**
 * Pick the most-active focal horse (by recent ride count) when the caller does
 * not specify one. Whole-rider outputs (Journey Map, Multi-Voice) get a single
 * focal lens; a multi-horse ledger is a deliberate later design decision.
 */
function pickFocalHorse(records) {
  const cadence = computeHorseCadence(records.debriefs || []);
  let best = null, bestRides = -1;
  for (const [name, c] of Object.entries(cadence.perHorse)) {
    if (name === "Unspecified") continue;
    if (c.rides > bestRides) { bestRides = c.rides; best = name; }
  }
  return best;
}

/**
 * Read the rider's ledger source records. One parallel read; ~590ms measured.
 * (A future optimization can pass prepareRiderData's already-fetched records to
 * buildLedger directly for zero marginal reads.)
 */
async function fetchLedgerRecords(uid) {
  const COLLS = ["debriefs", "lessonNotes", "reflections", "observations", "physicalAssessments", "technicalPhilosophicalAssessments", "horseHealthEntries"];
  const DRAFT = new Set(["debriefs", "lessonNotes", "physicalAssessments", "technicalPhilosophicalAssessments"]);
  const { Timestamp } = require("firebase-admin/firestore");
  const isoify = (doc) => {
    const out = {};
    for (const [k, v] of Object.entries(doc)) out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
    return out;
  };
  const snaps = await Promise.all(COLLS.map((c) => db.collection(c).where("userId", "==", uid).get()));
  const records = {};
  COLLS.forEach((c, i) => {
    let docs = snaps[i].docs.map((d) => isoify({ id: d.id, ...d.data() })).filter((d) => d.isDeleted !== true);
    if (DRAFT.has(c)) docs = docs.filter((d) => d.isDraft !== true);
    records[c] = docs;
  });
  return records;
}

/**
 * Wrap an unmodified base prompt with the evidence-layering block.
 * Directive → system (static; cache-safe). Ledger DATA → userMessage (post-cache).
 * @param {{system:string, userMessage:string}} base
 * @param {{directive:string, ledger:string}} block
 */
function wrapWithLedger(base, block) {
  return {
    system: block.directive + "\n" + base.system,
    userMessage: block.ledger + "\n\n" + "─────────────────────────────────\n\n" + base.userMessage,
  };
}

// ── Recitation guard (deterministic backstop for Rule (f)) ────────────────────

// FIXED-VOCABULARY denylist — LEDGER ARTIFACTS ONLY. Deliberately NO numeric
// patterns: numbers are where a regex cannot tell a leaked ledger value from a
// legitimate dressage score / effort value / percentage, so number recitation is
// left entirely to prompt rule (f). This set is the NARROW backstop for the exact
// internal vocabulary (f) might miss. Removal is clause-aware (see stripRecitations)
// so excising one of these never leaves a broken sentence.
const RECITATION_PATTERNS = [
  // Ledger state-machine label names.
  { re: /\b(refinement[-\s]phase|progress[-\s]rising[-\s]demand|plateau[-\s]consolidation|thin[-\s]data|health[-\s]interruption)\b/gi, label: "state-name" },
  // Internal axis labels ("Axis 1", "Axis-2").
  { re: /\bAxis[-\s]?[12]\b/gi, label: "axis-label" },
  // Ledger "Tier 1/2/3" labels.
  { re: /\bTier[-\s]?[123]\b/g, label: "tier-label" },
  // The scaffolding noun itself.
  { re: /\b(evidence )?ledger\b/gi, label: "ledger-noun" },
  // Firestore-style internal IDs: 20-char tokens carrying upper+lower+digit.
  { re: /\b(?=[A-Za-z0-9]{20}\b)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{20}\b/g, label: "internal-id" },
];

function hasBanned(s) {
  return RECITATION_PATTERNS.some((p) => { p.re.lastIndex = 0; return p.re.test(s); });
}

/**
 * Detect ledger-vocabulary recitations in model output. Returns the list of
 * matches (for telemetry / tests); does not mutate.
 */
function detectRecitations(text) {
  const hits = [];
  const s = String(text || "");
  for (const p of RECITATION_PATTERNS) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(s)) !== null) hits.push({ label: p.label, match: m[0], index: m.index });
  }
  return hits;
}

/** Split prose into sentences without breaking decimals or "St."-style abbreviations. */
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=["'“(]?[A-Z])/);
}

/**
 * Strip ledger-vocabulary recitations CLAUSE-AWARE and STRUCTURE-PRESERVING.
 *
 *  - Operates line by line; NEWLINES and markdown structure are PRESERVED (the
 *    previous version collapsed \n\n into spaces and flattened the whole document).
 *  - A heading line (#…) with a banned token: drop only the offending dash/colon-
 *    separated clause; if nothing meaningful remains, drop the line — never a stub.
 *  - A prose line with a banned token: drop the whole SENTENCE(s) containing it,
 *    keep the rest. (Excising a token mid-sentence is what left fragments like
 *    "demand. demand" / "No  or technical".)
 *  - NO numeric stripping (rule (f) governs numbers). Only spaces/tabs are tidied,
 *    never newlines.
 *
 * Applied only to free-text rider-facing fields.
 */
function stripRecitations(text) {
  if (typeof text !== "string" || !text) return text;
  const out = [];
  for (const raw of text.split("\n")) {
    if (!hasBanned(raw)) { out.push(raw); continue; }
    const heading = raw.match(/^(\s{0,3}#{1,6}\s+)(.*)$/);
    if (heading) {
      const [, marker, title] = heading;
      const kept = title.split(/\s+[—–-]\s+|:\s+/).filter((c) => c.trim() && !hasBanned(c)).join(" — ").trim();
      if (kept) out.push(marker + kept); // else drop the heading line entirely
    } else {
      const kept = splitSentences(raw).filter((sn) => !hasBanned(sn)).join(" ").trim();
      if (kept) out.push(kept); // else drop the line
    }
  }
  // Tidy spaces/tabs ONLY (never newlines); collapse 3+ blank lines to 2.
  return out.join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Post-strip integrity check (Rule-f backstop, fix #3). Flags output the guard
 * may have damaged so callers can log/regenerate rather than ship mangled text.
 * Returns a list of issue labels ([] = clean). With clause-aware stripping this
 * should be empty; it's the safety net that catches the guard's own damage.
 */
function detectStripDamage(text) {
  const s = String(text || "");
  const issues = [];
  // Dangling preposition before a COMMA/semicolon ("dropped from, meaning") — the
  // signature of an excised value. NOT period/colon: a stranded preposition at a
  // sentence END ("what you're looking for.", "whether you want to.") is valid English.
  if (/\b(from|than|of|with|into|onto|as)\s*[,;]/i.test(s)) issues.push("dangling-preposition");
  // Single-word (or empty) markdown heading — a stripped stub.
  for (const h of s.match(/^#{1,6}\s+.*$/gm) || []) {
    if (h.replace(/^#{1,6}\s+/, "").trim().split(/\s+/).filter(Boolean).length < 2) issues.push("short-heading");
  }
  // Orphaned brackets / bare ledger arrows.
  if ((s.match(/\[/g) || []).length !== (s.match(/\]/g) || []).length) issues.push("orphaned-square-bracket");
  if ((s.match(/\(/g) || []).length !== (s.match(/\)/g) || []).length) issues.push("orphaned-paren");
  if (/→|–>|->/.test(s)) issues.push("bare-arrow");
  return issues;
}

/**
 * Recursively strip ledger-vocabulary recitations from every STRING value in a
 * rider-facing object/array (e.g. a coaching voice JSON, a Journey Map narrative
 * wrapper). Returns a new value; does not mutate the input.
 */
function stripRecitationsDeep(value) {
  if (typeof value === "string") return stripRecitations(value);
  if (Array.isArray(value)) return value.map(stripRecitationsDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripRecitationsDeep(v);
    return out;
  }
  return value;
}

// ── Feature flag (Firestore config/evidenceLedger; default-off) ───────────────

/**
 * Read the ledger feature-flag config. Absent doc / any error → null (off).
 * Mirrors the existing config/{doc} pattern (config/cacheWarming).
 */
async function getLedgerConfig() {
  try {
    const doc = await db.collection("config").doc("evidenceLedger").get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.warn("[evidenceLedger] config read failed — treating as OFF:", err.message);
    return null;
  }
}

/**
 * Pure flag resolution. ON requires: master enabled === true AND
 * outputs[output] === true. A tier is allowed unless tiers[tier] === false.
 * If allowUids is a non-empty array, ONLY those uids are enabled — this scopes
 * behind-flag testing to specific accounts (Phase 2/5 staged rollout) so the
 * feature stays non-rider-facing for everyone else. Anything unset → OFF, so
 * flag-off (and absent doc) is byte-identical.
 */
function isLedgerEnabled(config, output, tier, uid) {
  if (!config || config.enabled !== true) return false;
  if (!config.outputs || config.outputs[output] !== true) return false;
  if (config.tiers && tier && config.tiers[tier] === false) return false;
  if (Array.isArray(config.allowUids) && config.allowUids.length > 0) {
    if (!uid || !config.allowUids.includes(uid)) return false;
  }
  return true;
}

/**
 * Compute-once entry for handlers. Returns the ledger block { directive, ledger,
 * meta } when the flag is on for (output, tier), else null (caller no-ops →
 * byte-identical behavior). Never throws — a ledger failure must not break a
 * generation; it degrades to the control path.
 *
 * @param {string} uid
 * @param {string} output  e.g. "journeyMap" | "coaching"
 * @param {string} tier    budget tier label (working/medium/extended/pilot)
 * @param {object} [opts]  { records?, focalHorse?, config? } — pass
 *   prepareRiderData-fetched records to avoid a second read; pass an
 *   already-read flag config to avoid a duplicate config read; pass focalHorse
 *   to override the most-active auto-pick (per-horse Journey Map).
 */
async function buildLedgerIfEnabled(uid, output, tier, opts = {}) {
  try {
    const config = opts.config !== undefined ? opts.config : await getLedgerConfig();
    if (!isLedgerEnabled(config, output, tier, uid)) return null;
    const records = opts.records || (await fetchLedgerRecords(uid));
    const focalHorse = opts.focalHorse || pickFocalHorse(records);
    if (!focalHorse) return null;
    const out = buildLedger(records, focalHorse);
    if (out.error) {
      console.warn(`[evidenceLedger] ${output} ${uid}: ${out.error} — skipping ledger`);
      return null;
    }
    console.log(`[evidenceLedger] ${output} ${uid}: ON, focal=${focalHorse}, state=${out.meta.state}`);
    return { directive: out.directive, ledger: out.ledger, meta: out.meta };
  } catch (err) {
    console.error(`[evidenceLedger] ${output} ${uid}: build failed — degrading to control:`, err.message);
    // Surface the silent degrade to Sentry (E1) so a rider-facing fallback is
    // visible in monitoring. Lazy-required + guarded so reporting can never
    // break the degrade — returning null (control) is the contract.
    try {
      require("./sentry").captureException(err, {
        level: "warning",
        tags: { component: "evidenceLedger", output, degraded: "true" },
        extra: { uid },
      });
    } catch { /* monitoring must not break the fallback */ }
    return null;
  }
}

module.exports = {
  // primary
  buildLedger,
  fetchLedgerRecords,
  pickFocalHorse,
  wrapWithLedger,
  // flag + compute-once
  getLedgerConfig,
  isLedgerEnabled,
  buildLedgerIfEnabled,
  // recitation guard
  detectRecitations,
  stripRecitations,
  stripRecitationsDeep,
  detectStripDamage,
  RECITATION_PATTERNS,
  // exposed for tests / reuse
  deriveEvidenceTags,
  buildWindows,
  triangulate,
  computeHorseCadence,
  scopeToFocalHorse,
};
