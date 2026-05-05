/**
 * Weekly Focus snapshot extraction + refresh helpers.
 *
 * Single source of truth for the "what goes into a Weekly Focus snapshot"
 * extraction logic. Used by:
 *   - api/weeklyFocusRefresh.js — Monday 5 AM ET cron, builds the full
 *     snapshot for every user.
 *   - api/grandPrixThinking.js, api/physicalGuidance.js, api/coaching.js —
 *     refreshWeeklyFocusSnapshotSection on successful regen so a mid-week
 *     regen propagates into the home page without waiting for next Monday.
 *
 * The home page reads users/{uid}/weeklyFocus/{weekId}.contentSnapshot to
 * keep weekly content stable. Without this server-side refresh, a mid-week
 * regen would update analysisCache but the home page would show last
 * Monday's frozen snapshot until the next cron run.
 */

const { db } = require("./firebase");
const { getCycleState } = require("./cycleState");

const VOICE_IDS = ["classical_master", "empathetic_coach", "technical_coach", "practical_strategist"];
const CACHE_COLLECTION = "analysisCache";

// ── ISO week helpers (mirror src/services/weeklyFocusService.js) ──

function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekRotationSeed(weekId) {
  const m = weekId.match(/W(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── Cache read helper ──

async function readCacheResult(uid, cacheKey) {
  const docId = `${uid}_${cacheKey}`;
  const snap = await db.collection(CACHE_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.isDeleted) return null;
  return data;
}

// ── Section extractors ──

function extractCoachingSnapshot(voices, weekId) {
  if (!voices) return null;

  const seed = weekRotationSeed(weekId);
  const excerpts = [];
  let title = null;
  let reflectionNudge = null;
  let generatedAt = null;

  const allExcerpts = [];
  for (let i = 0; i < 4; i++) {
    const voice = voices[i];
    if (!voice) continue;
    if (voice.generatedAt && (!generatedAt || voice.generatedAt > generatedAt)) {
      generatedAt = voice.generatedAt;
    }
    const result = voice.result || voice;
    if (result.weeklyFocusExcerpt) {
      allExcerpts.push({ voice: VOICE_IDS[i], text: result.weeklyFocusExcerpt });
    }
    if (i === 3 && result.weeklyFocusTitle) title = result.weeklyFocusTitle;
    if (i === 1 && result.weeklyFocusReflectionNudge) reflectionNudge = result.weeklyFocusReflectionNudge;
  }

  if (allExcerpts.length > 0) {
    const offset = seed % allExcerpts.length;
    for (let j = 0; j < Math.min(2, allExcerpts.length); j++) {
      excerpts.push(allExcerpts[(offset + j) % allExcerpts.length]);
    }
  }

  // Fallback: derive from voice narrative fields
  if (excerpts.length === 0) {
    const fallbackFields = [
      { idx: 2, extract: (v) => v.key_observations?.[0] },
      { idx: 3, extract: (v) => v.priorities?.[0] },
      { idx: 1, extract: (v) => v.partnership_insights?.[0] },
      { idx: 0, extract: (v) => v.philosophical_reflection },
    ];
    const available = [];
    for (const fb of fallbackFields) {
      const voice = voices[fb.idx];
      const result = voice?.result || voice;
      if (!result) continue;
      const text = fb.extract(result);
      if (text && typeof text === "string" && text.length > 20) {
        available.push({ voice: VOICE_IDS[fb.idx], text });
      }
    }
    if (available.length > 0) {
      const offset = seed % available.length;
      for (let j = 0; j < Math.min(2, available.length); j++) {
        excerpts.push(available[(offset + j) % available.length]);
      }
    }
    if (!title) {
      const v3 = (voices[3]?.result || voices[3]);
      if (v3?.weekly_plan?.focus) title = v3.weekly_plan.focus;
      else if (v3?.weekly_plan?.theme) title = v3.weekly_plan.theme;
    }
  }

  if (excerpts.length === 0) return null;

  return {
    title: title || "This week’s coaching focus",
    excerpts,
    reflectionNudge,
    sourceGeneratedAt: generatedAt,
  };
}

function extractGPTSnapshot(gptResult, cycleState) {
  if (!gptResult) return null;

  const cycleWeek = cycleState?.currentWeek || 1;

  let assignments = gptResult.weeklyAssignments;

  if (!assignments?.length && gptResult.selectedPath?.weeks?.length) {
    const weekData = gptResult.selectedPath.weeks[cycleWeek - 1]
      || gptResult.selectedPath.weeks[0];
    const raw = weekData?.assignments || [];
    if (raw.length) {
      assignments = raw.map((a) => ({
        title: a.title || "",
        description: a.description || "",
        when: a.when || "",
        buildToward: a.trajectoryLink || gptResult.selectedPath.title || "Mental performance",
      }));
    }
  }

  if (!assignments?.length) return null;

  return {
    weeklyAssignments: assignments,
    cycleWeek,
    cycleStartDate: cycleState?.cycleStartDate || null,
    cycleStatus: cycleState?.status || null,
    sourceGeneratedAt: gptResult.generatedAt || null,
  };
}

/**
 * Canonical celebration picker. Used by both the Monday cron and any
 * server-side path that needs to pick "this week's moment worth keeping".
 *
 * Algorithm (must match the client's selectCelebration in
 * src/components/WeeklyFocus/weeklyFocusUtils.js):
 *   1. Filter to positive categories (legacy + alias forms, case-insensitive)
 *   2. Sort descending by createdAt (normalize Timestamp → ms-since-epoch)
 *   3. Pick positive[weekRotationSeed(weekId) % positive.length]
 *
 * Without canonical sort + filter the server (unsorted Firestore order) and
 * client (sorted desc by createdAt) disagreed on what W19 should show — and
 * since the server wrote celebrationId first, the client locked to a pick
 * that didn't match its own rotation. Same input, different output.
 */
const CELEBRATION_CATEGORIES = new Set([
  "personal",
  "personal_milestone",
  "validation",
  "external_validation",
  "aha",
  "aha_moment",
]);

function celebrationCreatedAtMs(r) {
  const v = r?.createdAt;
  if (!v) return 0;
  if (typeof v === "string") return new Date(v).getTime() || 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v._seconds === "number") return v._seconds * 1000;
  if (v instanceof Date) return v.getTime();
  return 0;
}

function selectCelebration(reflections, weekId) {
  const positive = (reflections || [])
    .filter((r) => CELEBRATION_CATEGORIES.has((r.category || "").toLowerCase()))
    .sort((a, b) => celebrationCreatedAtMs(b) - celebrationCreatedAtMs(a));
  if (positive.length === 0) return null;
  const seed = weekRotationSeed(weekId);
  return positive[seed % positive.length];
}

function extractPhysicalSnapshot(physResult, cycleState) {
  if (!physResult) return null;

  let items = physResult.weeklyFocusItems;

  if (!items?.length && physResult.weeks?.length) {
    const weekIndex = (cycleState?.currentWeek || 1) - 1;
    const weekData = physResult.weeks[weekIndex] || physResult.weeks[0];
    if (weekData?.patterns) {
      items = weekData.patterns
        .filter((p) => p.feedsWeeklyFocus)
        .map((p) => ({
          text: p.noticingCuePrimary || p.title || "",
          sub: p.source || null,
          isHorseHealth: p.isHorseHealth || false,
        }));
    }
  }

  if (!items?.length && physResult.exercisePrescription?.weeklyFocusItems?.length) {
    items = physResult.exercisePrescription.weeklyFocusItems;
  }
  if (!items?.length && physResult.exercisePrescription?.body_awareness_cues?.length) {
    items = physResult.exercisePrescription.body_awareness_cues.slice(0, 4).map((cue) => ({
      text: cue.cue || cue.trigger || "",
      sub: cue.target_pattern || cue.check_method || null,
      isHorseHealth: false,
    }));
  }

  if (!items?.length) return null;

  return {
    weeklyFocusItems: items,
    cycleStatus: cycleState?.status || null,
    sourceGeneratedAt: physResult.generatedAt || null,
  };
}

// ── Public refresh helper ──

/**
 * Refresh a single section of the current ISO week's Weekly Focus snapshot.
 * Called from regen handlers (GPT, Physical, MVC) after a successful regen
 * so the home page picks up the new content on next page load instead of
 * waiting until next Monday's cron.
 *
 * Reads the latest analysisCache for the section, runs the same extraction
 * logic as the Monday cron, then merges the result into
 * users/{uid}/weeklyFocus/{weekId}.contentSnapshot.{section}.
 *
 * Failures are logged but never throw — a snapshot refresh failure must not
 * fail the regen response. Worst case the user sees stale snapshot until
 * Monday or until they hit "Update to latest".
 *
 * @param {string} uid
 * @param {"coaching"|"gpt"|"physical"} section
 */
async function refreshWeeklyFocusSnapshotSection(uid, section) {
  try {
    const weekId = getWeekId();
    let snapshot = null;

    if (section === "coaching") {
      const [v0, v1, v2, v3] = await Promise.all([
        readCacheResult(uid, "coaching_0"),
        readCacheResult(uid, "coaching_1"),
        readCacheResult(uid, "coaching_2"),
        readCacheResult(uid, "coaching_3"),
      ]);
      snapshot = extractCoachingSnapshot({ 0: v0, 1: v1, 2: v2, 3: v3 }, weekId);
    } else if (section === "gpt") {
      const [cache, cycle] = await Promise.all([
        readCacheResult(uid, "grandPrixThinking"),
        getCycleState(uid, "gpt"),
      ]);
      snapshot = extractGPTSnapshot(cache?.result, cycle);
    } else if (section === "physical") {
      const [cache, cycle] = await Promise.all([
        readCacheResult(uid, "physicalGuidance"),
        getCycleState(uid, "physical"),
      ]);
      snapshot = extractPhysicalSnapshot(cache?.result, cycle);
    } else {
      console.warn(`[weeklyFocusSnapshot] unknown section: ${section}`);
      return;
    }

    if (!snapshot) {
      console.warn(`[weeklyFocusSnapshot] ${uid} ${section}: extractor returned null — skipping snapshot write`);
      return;
    }

    // Merge into the current week's snapshot. Preserves user interaction
    // state (pinnedSections, completedSections, checkedItems) and other
    // sections.
    await db
      .collection("users").doc(uid)
      .collection("weeklyFocus").doc(weekId)
      .set(
        {
          weekId,
          contentSnapshot: { [section]: snapshot },
          // Clear the stale-content flag for this section since we just
          // refreshed it server-side.
          hasNewerContent: { [section]: false },
          lastUpdated: new Date().toISOString(),
          updatedBy: `regen:${section}`,
        },
        { merge: true }
      );

    console.log(`[weeklyFocusSnapshot] ${uid} refreshed ${section} for ${weekId}`);
  } catch (err) {
    console.error(`[weeklyFocusSnapshot] ${uid} ${section} refresh failed:`, err.message);
  }
}

module.exports = {
  getWeekId,
  weekRotationSeed,
  readCacheResult,
  extractCoachingSnapshot,
  extractGPTSnapshot,
  extractPhysicalSnapshot,
  selectCelebration,
  refreshWeeklyFocusSnapshotSection,
};
