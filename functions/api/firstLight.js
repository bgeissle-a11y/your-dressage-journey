/**
 * First Light API
 *
 * Three handlers (registered in functions/index.js):
 *   - generate    : callable. First-time generation when the rider clicks
 *                   "Generate My First Light" on Quick Start.
 *   - regenerate  : callable. One-time refresh available between generation
 *                   and graduation.
 *   - graduate    : Firestore trigger. Sets graduatedAt when the rider
 *                   crosses the Multi-Voice threshold (5 debriefs + all 6
 *                   reflection categories).
 *
 * Source of truth: YDJ_FirstLight_Implementation_Brief_v3.md
 *   §4 (eligibility & lifecycle), §5 (output structure), §8 (prompt),
 *   §9.1 (Firestore schema), §10 (Cloud Functions).
 *
 * Storage:
 *   riders/{userId}/firstLight/current      — active First Light (fixed id)
 *   riders/{userId}/firstLight/{autoId}     — history archives
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");

const { db } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { enforceCapability } = require("../lib/loadSubscription");
const { CAPABILITIES } = require("../lib/entitlements");
const { wrapError } = require("../lib/errors");
const { callClaude } = require("../lib/claudeCall");
const { buildFirstLightPrompt } = require("../lib/promptBuilder");

const FIRST_LIGHT_MODEL = "claude-sonnet-4-5-20250929";
const FIRST_LIGHT_MAX_TOKENS = 1500;
const VOICE_KEYS = ["classical", "empathetic", "technical", "strategic"];

const REFLECTION_CATEGORIES = [
  "personal", "validation", "aha", "obstacle", "connection", "feel",
];
const GRADUATION_DEBRIEF_THRESHOLD = 5;
const SOURCE_FIRST_LIGHT_ENTRY = "first-light-entry";

// ─── Path helpers ──────────────────────────────────────────────────────

function firstLightDocRef(uid, docId = "current") {
  return db.collection("riders").doc(uid).collection("firstLight").doc(docId);
}
function firstLightCollectionRef(uid) {
  return db.collection("riders").doc(uid).collection("firstLight");
}

// ─── Data loading ──────────────────────────────────────────────────────

async function loadRiderProfile(uid) {
  const snap = await db.collection("riderProfiles")
    .where("userId", "==", uid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (doc.data().isDeleted) return null;
  return { id: doc.id, ...doc.data() };
}

async function loadHorseProfiles(uid) {
  const snap = await db.collection("horseProfiles")
    .where("userId", "==", uid)
    .get();
  const horses = [];
  snap.forEach(d => {
    const data = d.data();
    if (!data.isDeleted) horses.push({ id: d.id, ...data });
  });
  // Stable order: by createdAt ascending so the rider's first-added horse
  // is treated as primary (consistent with the Dashboard / Quick Start view).
  horses.sort((a, b) => {
    const aT = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bT = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return aT - bT;
  });
  return horses;
}

async function loadFirstLightReflections(uid) {
  const snap = await db.collection("reflections")
    .where("userId", "==", uid)
    .where("source", "==", SOURCE_FIRST_LIGHT_ENTRY)
    .get();
  const items = [];
  snap.forEach(d => {
    const data = d.data();
    if (!data.isDeleted) items.push({ id: d.id, ...data });
  });
  return items;
}

async function loadAccumulatedSinceFirstLight(uid, sinceTimestamp) {
  // Debriefs created after `sinceTimestamp`
  const debriefsSnap = await db.collection("debriefs")
    .where("userId", "==", uid)
    .get();
  const debriefs = [];
  debriefsSnap.forEach(d => {
    const data = d.data();
    if (data.isDeleted) return;
    if (sinceTimestamp && data.createdAt && data.createdAt.toMillis() < sinceTimestamp.toMillis()) return;
    debriefs.push({ id: d.id, ...data });
  });
  debriefs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

  // Additional reflections (regular reflections logged after First Light entry)
  const reflectionsSnap = await db.collection("reflections")
    .where("userId", "==", uid)
    .get();
  const additionalReflections = [];
  reflectionsSnap.forEach(d => {
    const data = d.data();
    if (data.isDeleted) return;
    if (data.source === SOURCE_FIRST_LIGHT_ENTRY) return; // exclude wizard entries
    if (sinceTimestamp && data.createdAt && data.createdAt.toMillis() < sinceTimestamp.toMillis()) return;
    additionalReflections.push({ id: d.id, ...data });
  });
  additionalReflections.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

  // Self-assessments completed since First Light entry
  const assessments = { technical: false, physical: false, riderSelf: false };
  for (const [coll, key] of [
    ["technicalPhilosophicalAssessments", "technical"],
    ["physicalAssessments", "physical"],
    ["riderAssessments", "riderSelf"],
  ]) {
    const snap = await db.collection(coll).where("userId", "==", uid).get();
    snap.forEach(d => {
      const data = d.data();
      if (data.isDeleted) return;
      if (sinceTimestamp && data.createdAt && data.createdAt.toMillis() < sinceTimestamp.toMillis()) return;
      assessments[key] = true;
    });
  }

  return { debriefs, additionalReflections, assessments };
}

// ─── Validation ────────────────────────────────────────────────────────

function isProfileComplete(profile) {
  if (!profile) return false;
  // The reference profile-completeness check in the app marks a rider
  // profile complete when fullName is present. Mirror that minimum here.
  return !!(profile.fullName && profile.fullName.trim());
}

function isHorseComplete(horse) {
  if (!horse) return false;
  return !!(horse.horseName && horse.horseName.trim());
}

/**
 * Verify the user has all six categories represented in source="first-light-entry".
 * Returns the validated set of six reflections (latest per category) or throws.
 */
function validateAllSixCategories(reflections, contextLabel) {
  const byCategory = {};
  for (const r of reflections) {
    if (!REFLECTION_CATEGORIES.includes(r.category)) continue;
    const existing = byCategory[r.category];
    if (!existing) {
      byCategory[r.category] = r;
    } else {
      const existingT = existing.createdAt?.toMillis() || 0;
      const newT = r.createdAt?.toMillis() || 0;
      if (newT > existingT) byCategory[r.category] = r;
    }
  }
  const missing = REFLECTION_CATEGORIES.filter(c => !byCategory[c]);
  if (missing.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      `${contextLabel}: missing First Light reflections for category/categories: ${missing.join(", ")}`
    );
  }
  return REFLECTION_CATEGORIES.map(c => byCategory[c]);
}

function validateFirstLightResponse(parsed, contextLabel) {
  if (!parsed || typeof parsed !== "object") {
    throw new HttpsError("internal", `${contextLabel}: response is not a JSON object`);
  }
  const { primaryVoice, riderRead, partnershipRead, otherVoices, whereWeBegin } = parsed;
  if (!VOICE_KEYS.includes(primaryVoice)) {
    throw new HttpsError("internal", `${contextLabel}: invalid primaryVoice "${primaryVoice}"`);
  }
  for (const [field, val] of [
    ["riderRead", riderRead],
    ["partnershipRead", partnershipRead],
    ["whereWeBegin", whereWeBegin],
  ]) {
    if (typeof val !== "string" || !val.trim()) {
      throw new HttpsError("internal", `${contextLabel}: ${field} missing or empty`);
    }
  }
  if (!Array.isArray(otherVoices) || otherVoices.length !== 3) {
    throw new HttpsError("internal", `${contextLabel}: otherVoices must be an array of 3`);
  }
  const seenVoices = new Set([primaryVoice]);
  for (const ov of otherVoices) {
    if (!ov || !VOICE_KEYS.includes(ov.voice)) {
      throw new HttpsError("internal", `${contextLabel}: invalid otherVoices voice key`);
    }
    if (typeof ov.message !== "string" || !ov.message.trim()) {
      throw new HttpsError("internal", `${contextLabel}: otherVoices entry missing message`);
    }
    if (seenVoices.has(ov.voice)) {
      throw new HttpsError("internal", `${contextLabel}: duplicate or primary voice in otherVoices`);
    }
    seenVoices.add(ov.voice);
  }
  return parsed;
}

// ─── Core generation ──────────────────────────────────────────────────

async function buildAndCallFirstLight({ uid, riderProfile, horseProfiles, sixReflections, accumulated, daysOnPlatform, contextLabel }) {
  const { system, userMessage } = buildFirstLightPrompt({
    riderProfile,
    horseProfiles,
    firstLightReflections: sixReflections,
    accumulated,
    daysOnPlatform,
  });

  const parsed = await callClaude({
    system,
    userMessage,
    model: FIRST_LIGHT_MODEL,
    maxTokens: FIRST_LIGHT_MAX_TOKENS,
    jsonMode: true,
    context: contextLabel,
    uid,
  });

  return validateFirstLightResponse(parsed, contextLabel);
}

function buildSectionsPayload(parsed) {
  return {
    riderRead: parsed.riderRead.trim(),
    partnershipRead: parsed.partnershipRead.trim(),
    otherVoices: parsed.otherVoices.map(v => ({
      voice: v.voice,
      message: v.message.trim(),
    })),
    whereWeBegin: parsed.whereWeBegin.trim(),
  };
}

// ─── Handler: generate ─────────────────────────────────────────────────

async function generate(request) {
  try {
    const uid = validateAuth(request);
    const contextLabel = "firstLight-generate";

    // Idempotency: if already generated, return existing document.
    // Cache reads bypass the capability gate so a converted-then-lapsed pilot
    // can still see their existing First Light.
    const currentRef = firstLightDocRef(uid, "current");
    const currentSnap = await currentRef.get();
    if (currentSnap.exists) {
      return {
        success: true,
        firstLight: { id: "current", ...currentSnap.data() },
        fromCache: true,
      };
    }

    // Capability gate. Pilots short-circuit to allow inside `canAccess`, so
    // gating on `generateCoaching` covers both pilot/pilot-grace (allowed)
    // and post-pilot paid users (requires Working+).
    await enforceCapability(uid, CAPABILITIES.generateCoaching);

    // Eligibility checks
    const riderProfile = await loadRiderProfile(uid);
    if (!isProfileComplete(riderProfile)) {
      throw new HttpsError(
        "failed-precondition",
        "Your rider profile must be completed before generating First Light."
      );
    }
    const horseProfiles = await loadHorseProfiles(uid);
    const completeHorses = horseProfiles.filter(isHorseComplete);
    if (completeHorses.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "At least one horse profile must be completed before generating First Light."
      );
    }

    const wizardReflections = await loadFirstLightReflections(uid);
    const sixReflections = validateAllSixCategories(wizardReflections, contextLabel);

    const parsed = await buildAndCallFirstLight({
      uid,
      riderProfile,
      horseProfiles: completeHorses,
      sixReflections,
      accumulated: null,
      daysOnPlatform: 0,
      contextLabel,
    });

    const sections = buildSectionsPayload(parsed);

    // Snapshot the rider profile timestamp for traceability
    const riderProfileSnapshotAt = riderProfile.updatedAt || riderProfile.createdAt || null;

    const doc = {
      generatedAt: FieldValue.serverTimestamp(),
      primaryVoice: parsed.primaryVoice,
      sections,
      inputs: {
        riderProfileSnapshotAt,
        horseIds: completeHorses.map(h => h.id),
        firstLightReflectionIds: sixReflections.map(r => r.id),
        additionalReflectionIdsIncluded: [],
        debriefIdsIncluded: [],
        assessmentsIncluded: { technical: false, physical: false, riderSelf: false },
      },
      regeneratedAt: null,
      graduatedAt: null,
      modelVersion: FIRST_LIGHT_MODEL,
      generationCount: 1,
      // tokenUsage is populated by callClaude's _logUsage to usageLogs;
      // mirroring the per-call cost back here is left to a follow-up so it
      // can be aggregated server-side without fanning the writes here.
    };

    await currentRef.set(doc);
    console.log(`[${contextLabel}] First Light generated for ${uid}, voice=${parsed.primaryVoice}`);

    return {
      success: true,
      firstLight: { id: "current", ...doc, generatedAt: new Date().toISOString() },
      fromCache: false,
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("[firstLight-generate] Error:", err);
    throw wrapError(err, "firstLight-generate");
  }
}

// ─── Handler: regenerate ───────────────────────────────────────────────

async function regenerate(request) {
  try {
    const uid = validateAuth(request);
    const contextLabel = "firstLight-regenerate";

    // Capability gate — same logic as `generate`. Pilots are allowed via the
    // status short-circuit; post-pilot users need at least Working.
    await enforceCapability(uid, CAPABILITIES.generateCoaching);

    const currentRef = firstLightDocRef(uid, "current");
    const currentSnap = await currentRef.get();
    if (!currentSnap.exists) {
      throw new HttpsError("failed-precondition", "No existing First Light to regenerate.");
    }
    const current = currentSnap.data();
    if (current.regeneratedAt) {
      throw new HttpsError("failed-precondition", "First Light has already been regenerated once.");
    }
    if (current.graduatedAt) {
      throw new HttpsError("failed-precondition", "First Light is no longer regenerable after graduation.");
    }

    const riderProfile = await loadRiderProfile(uid);
    if (!isProfileComplete(riderProfile)) {
      throw new HttpsError("failed-precondition", "Rider profile is no longer complete.");
    }
    const horseProfiles = (await loadHorseProfiles(uid)).filter(isHorseComplete);
    if (horseProfiles.length === 0) {
      throw new HttpsError("failed-precondition", "No complete horse profile found.");
    }

    // Preserve the original 6 reflection IDs from the first generation
    const originalIds = current.inputs?.firstLightReflectionIds || [];
    const wizardReflections = await loadFirstLightReflections(uid);
    const sixReflections = validateAllSixCategories(wizardReflections, contextLabel);

    // Pull accumulated context since the original generation
    const sinceTs = current.generatedAt || null;
    const accumulated = await loadAccumulatedSinceFirstLight(uid, sinceTs);

    // Days on platform from generatedAt for the early-journey-mode framing
    let daysOnPlatform = 0;
    if (sinceTs?.toMillis) {
      daysOnPlatform = Math.floor((Date.now() - sinceTs.toMillis()) / (1000 * 60 * 60 * 24));
    }

    const parsed = await buildAndCallFirstLight({
      uid,
      riderProfile,
      horseProfiles,
      sixReflections,
      accumulated,
      daysOnPlatform,
      contextLabel,
    });

    const sections = buildSectionsPayload(parsed);

    // Archive the prior current to history with an auto-id
    const archiveRef = firstLightCollectionRef(uid).doc();
    const archivedAt = FieldValue.serverTimestamp();
    await archiveRef.set({
      ...current,
      archivedAt,
      archivedFromGenerationCount: current.generationCount || 1,
    });

    const updated = {
      generatedAt: current.generatedAt, // preserve the original generation timestamp
      primaryVoice: parsed.primaryVoice,
      sections,
      inputs: {
        riderProfileSnapshotAt: riderProfile.updatedAt || riderProfile.createdAt || null,
        horseIds: horseProfiles.map(h => h.id),
        firstLightReflectionIds: originalIds.length === 6 ? originalIds : sixReflections.map(r => r.id),
        additionalReflectionIdsIncluded: accumulated.additionalReflections.map(r => r.id),
        debriefIdsIncluded: accumulated.debriefs.map(d => d.id),
        assessmentsIncluded: accumulated.assessments,
      },
      regeneratedAt: FieldValue.serverTimestamp(),
      graduatedAt: null,
      modelVersion: FIRST_LIGHT_MODEL,
      generationCount: 2,
    };

    await currentRef.set(updated);
    console.log(`[${contextLabel}] First Light regenerated for ${uid}, voice=${parsed.primaryVoice}`);

    return {
      success: true,
      firstLight: { id: "current", ...updated, regeneratedAt: new Date().toISOString() },
      fromCache: false,
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("[firstLight-regenerate] Error:", err);
    throw wrapError(err, "firstLight-regenerate");
  }
}

// ─── Handler: graduation trigger ───────────────────────────────────────

/**
 * Fires on every newly-created debrief or reflection. If the user has a
 * First Light document and has now crossed both Multi-Voice thresholds
 * (5 debriefs + all 6 reflection categories present), set graduatedAt.
 *
 * Multi-Voice generation itself is downstream and not triggered from here —
 * the existing Multi-Voice pipeline reads firstLight/current.graduatedAt
 * (or the rider's threshold) when invoked. UI surfaces detect graduation
 * by listening to the firstLight/current document.
 *
 * NOTE: triggered by onDocumentCreated to match the existing
 * dataTriggeredRegeneration pattern (see functions/index.js).
 */
async function graduate(event) {
  try {
    const data = event.data?.data();
    if (!data) return;
    const uid = data.userId;
    if (!uid) return;

    const currentRef = firstLightDocRef(uid, "current");
    const currentSnap = await currentRef.get();
    if (!currentSnap.exists) return;
    const current = currentSnap.data();
    if (current.graduatedAt) return; // already graduated

    // Count debriefs (excluding soft-deleted)
    const debriefsSnap = await db.collection("debriefs")
      .where("userId", "==", uid)
      .get();
    let debriefCount = 0;
    debriefsSnap.forEach(d => { if (!d.data().isDeleted) debriefCount += 1; });
    if (debriefCount < GRADUATION_DEBRIEF_THRESHOLD) return;

    // Verify all six reflection categories present (any source counts)
    const reflectionsSnap = await db.collection("reflections")
      .where("userId", "==", uid)
      .get();
    const seenCategories = new Set();
    reflectionsSnap.forEach(r => {
      const rd = r.data();
      if (rd.isDeleted) return;
      if (REFLECTION_CATEGORIES.includes(rd.category)) {
        seenCategories.add(rd.category);
      }
    });
    if (seenCategories.size < REFLECTION_CATEGORIES.length) return;

    await currentRef.update({ graduatedAt: FieldValue.serverTimestamp() });
    console.log(`[firstLight-graduate] Rider ${uid} crossed Multi-Voice threshold (debriefs=${debriefCount}, categories=${seenCategories.size})`);
  } catch (err) {
    // Triggers shouldn't throw — log and swallow
    console.error("[firstLight-graduate] Error:", err);
  }
}

module.exports = {
  generate,
  regenerate,
  graduate,
  // Exposed for unit testing
  _internal: {
    isProfileComplete,
    isHorseComplete,
    validateAllSixCategories,
    validateFirstLightResponse,
    buildSectionsPayload,
    REFLECTION_CATEGORIES,
    GRADUATION_DEBRIEF_THRESHOLD,
    SOURCE_FIRST_LIGHT_ENTRY,
  },
};
