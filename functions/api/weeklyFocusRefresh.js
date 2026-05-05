/**
 * Weekly Focus Refresh — Scheduled Monday 5 AM ET
 *
 * For every active user, advances the GPT and Physical week pointers,
 * then extracts and freezes the new week's content snapshot into
 * users/{uid}/weeklyFocus/{weekId}.
 *
 * Sources:
 *   - GPT L1 (mental): weeklyAssignments from current cycle week
 *   - Physical Guidance: weeklyFocusItems from current cycle week
 *   - Coaching Voices: weeklyFocusExcerpt (rotated per ISO week)
 *   - Show Planner: countdown tasks for nearest upcoming show
 *
 * No Claude API calls — purely Firestore reads/writes.
 *
 * NOTE: extract* functions below are duplicated in lib/weeklyFocusSnapshot.js,
 * which is the canonical source used by the per-regen refresh helper. Keep the
 * two in sync — drifting them caused the home-page-snapshot desync bugs. TODO:
 * import the extractors from the lib module instead of redefining.
 */

const { db, auth } = require("../lib/firebase");
const {
  advanceWeekAndExtract,
  getCycleState,
} = require("../lib/cycleState");
const { selectCelebration } = require("../lib/weeklyFocusSnapshot");

const CACHE_COLLECTION = "analysisCache";
const VOICE_IDS = ["classical_master", "empathetic_coach", "technical_coach", "practical_strategist"];

// ── ISO week helpers (server-side equivalents of weeklyFocusService.js) ──

function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekRotationSeed(weekId) {
  const m = weekId.match(/W(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── Cache read helpers ──

async function readCacheResult(uid, cacheKey) {
  const docId = `${uid}_${cacheKey}`;
  const snap = await db.collection(CACHE_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data.isDeleted) return null;
  return data;
}

// ── Extraction logic (server-side mirror of weeklyFocusUtils.js) ──

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
    // Fallback title
    if (!title) {
      const v3 = (voices[3]?.result || voices[3]);
      if (v3?.weekly_plan?.focus) title = v3.weekly_plan.focus;
      else if (v3?.weekly_plan?.theme) title = v3.weekly_plan.theme;
    }
  }

  if (excerpts.length === 0) return null;

  return {
    title: title || "This week\u2019s coaching focus",
    excerpts,
    reflectionNudge,
    sourceGeneratedAt: generatedAt,
  };
}

function extractGPTSnapshot(gptResult, cycleState) {
  if (!gptResult) return null;

  const cycleWeek = cycleState?.currentWeek || 1;

  // Preferred: top-level weeklyAssignments
  let assignments = gptResult.weeklyAssignments;

  // Fallback: derive from selectedPath.weeks
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

function extractPhysicalSnapshot(physResult, cycleState) {
  if (!physResult) return null;

  let items = physResult.weeklyFocusItems;

  // Fallback: extract from weeks[currentWeek].patterns
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

  // Legacy fallbacks
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

// ── Show card (same logic as weeklyFocusUtils.js buildShowSnapshot) ──

const TASKS_BY_WEEK = {
  10: [
    { area: "mental", title: "Set your show season intention", cue: "Write one sentence about what you want this show to teach you." },
    { area: "tech", title: "Audit your weakest movement", cue: "Identify the one movement you avoid schooling. Ride it once per session this week." },
    { area: "physical", title: "Baseline body inventory", cue: "Before riding today, stand still and scan: where are you tight? Write it down." },
  ],
  8: [
    { area: "mental", title: "Establish your baseline mental cue", cue: "Choose one word or phrase that signals \u201cready to ride\u201d. Use it every warm-up." },
    { area: "tech", title: "Know your test geometry cold", cue: "Walk the test twice — trace the figures, transition points, and pirouette entries." },
    { area: "physical", title: "Map your show-day warm-up body", cue: "After each ride, note which part of your body needed the most releasing." },
  ],
  6: [
    { area: "mental", title: "Recovery reflex under pressure", cue: "When something goes wrong, give yourself 2 strides to reset. Practice the reset." },
    { area: "tech", title: "Refine quality over quantity", cue: "Set a maximum of 3 full run-throughs of any sequence. After 3, move on." },
    { area: "physical", title: "Glutes soft in collection", cue: "In every collected movement, do a single glute-check: are you gripping?" },
  ],
  4: [
    { area: "mental", title: "Sharpen your anchor routine", cue: "Finalize the 3-step mental routine you will use before entering at A." },
    { area: "tech", title: "Entries, halts, and test accuracy", cue: "Practice the halt/salute and first transition 3x per session as one clean sequence." },
    { area: "physical", title: "Show posture, not fixing posture", cue: "Once per session: 2 minutes of your best show posture — tall, open, soft." },
  ],
  3: [
    { area: "mental", title: "No new experiments this week", cue: "If you feel the urge to try something new, write it down for after the show." },
    { area: "tech", title: "Solidify one weak movement", cue: "Pick the one movement you are least confident about. Ride it well every session." },
    { area: "physical", title: "One body-prep habit daily", cue: "Pick one thing — hip circles, shoulder rolls, breathing. Do it every day before you ride." },
  ],
  2: [
    { area: "mental", title: "Trust the horse, trust the training", cue: "Before mounting, say one true thing about what your horse can do." },
    { area: "tech", title: "Run your planned warm-up once", cue: "Ride your full intended show warm-up sequence. Time it. Adjust if needed." },
    { area: "physical", title: "Ride fresh — shorten sessions", cue: "Keep rides to 35\u201340 minutes max. You are banking energy." },
  ],
  1: [
    { area: "mental", title: "Arrive, breathe, be present", cue: "Your only job at the show is to ride the horse in front of you." },
    { area: "tech", title: "Warm up to his rhythm, not the clock", cue: "Let jaw softness and throughness be your green light — not a time target." },
    { area: "physical", title: "Body check before entry at A", cue: "At your final halt before entering: tall, soft glutes, elbows in, exhale." },
  ],
};

function buildShowSnapshot(showPreps, showPlanCache) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 70);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const upcoming = (showPreps || [])
    .filter((p) =>
      (p.showDateStart || "") >= todayStr &&
      (p.showDateStart || "") <= cutoffStr &&
      p.status !== "completed" &&
      !p.isDeleted
    )
    .sort((a, b) => (a.showDateStart || "").localeCompare(b.showDateStart || ""));

  if (upcoming.length === 0) return { state: "no_shows" };

  const show = upcoming[0];
  const showDate = new Date(show.showDateStart + "T00:00:00");
  const daysOut = Math.ceil((showDate - today) / (1000 * 60 * 60 * 24));
  if (daysOut <= 0 || daysOut > 70) return { state: "no_shows" };

  const weekNum = Math.min(10, Math.max(1, Math.ceil(daysOut / 7)));

  let showTasks = null;
  if (showPlanCache?.result?.weeklyShowTasks) {
    const cached = showPlanCache.result.weeklyShowTasks;
    showTasks = ["mental", "technical", "physical"]
      .map((area) => {
        const items = cached[area];
        if (!items?.length) return null;
        return { area, title: items[0].title, cue: items[0].cue };
      })
      .filter(Boolean);
  }
  if (!showTasks?.length) {
    showTasks = TASKS_BY_WEEK[weekNum] || TASKS_BY_WEEK[8];
  }

  return {
    state: "active_show",
    showId: show.id,
    name: show.showName || "Upcoming Show",
    horseName: show.horseName || null,
    daysOut,
    weekNum,
    showTasks,
    sourceGeneratedAt: showPlanCache?.generatedAt || null,
  };
}

// ── Main handler ──

async function handler(_event) {
  const weekId = getWeekId();
  console.log(`[weeklyFocusRefresh] Starting for ${weekId}`);

  // Get all users
  const listResult = await auth.listUsers(200);
  const users = listResult.users;
  console.log(`[weeklyFocusRefresh] Processing ${users.length} users`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const uid = user.uid;
    const displayName = user.displayName || user.email || uid;

    try {
      // 1. Advance week pointers (no-op if cycle doesn't exist or week hasn't changed)
      const [gptAdvance, physAdvance] = await Promise.all([
        advanceWeekAndExtract(uid, "gpt").catch(() => ({ advanced: false, currentWeek: 1 })),
        advanceWeekAndExtract(uid, "physical").catch(() => ({ advanced: false, currentWeek: 1 })),
      ]);

      // 2. Read cached AI outputs in parallel
      const [coachV0, coachV1, coachV2, coachV3, gptCache, physCache, gptCycle, physCycle] =
        await Promise.all([
          readCacheResult(uid, "coaching_0"),
          readCacheResult(uid, "coaching_1"),
          readCacheResult(uid, "coaching_2"),
          readCacheResult(uid, "coaching_3"),
          readCacheResult(uid, "grandPrixThinking"),
          readCacheResult(uid, "physicalGuidance"),
          getCycleState(uid, "gpt"),
          getCycleState(uid, "physical"),
        ]);

      // Skip users with no AI data at all
      if (!coachV0 && !gptCache && !physCache) {
        skipped++;
        continue;
      }

      // 3. Extract snapshots
      const voices = { 0: coachV0, 1: coachV1, 2: coachV2, 3: coachV3 };
      const coachingSnap = extractCoachingSnapshot(voices, weekId);
      const gptSnap = extractGPTSnapshot(gptCache?.result, gptCycle);
      const physSnap = extractPhysicalSnapshot(physCache?.result, physCycle);

      // 4. Show card — read show preps and nearest show plan cache
      const showPrepsSnap = await db.collection("showPreparations")
        .where("userId", "==", uid)
        .where("isDeleted", "==", false)
        .get();
      const showPreps = showPrepsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      let showSnap = { state: "no_shows" };
      if (showPreps.length > 0) {
        // Find nearest upcoming show to load its plan cache
        const todayStr = new Date().toISOString().split("T")[0];
        const upcoming = showPreps
          .filter((p) => (p.showDateStart || "") >= todayStr && p.status !== "completed")
          .sort((a, b) => (a.showDateStart || "").localeCompare(b.showDateStart || ""));
        const activeShow = upcoming[0];
        const showPlanCache = activeShow
          ? await readCacheResult(uid, `showPlanner_${activeShow.id}`)
          : null;
        showSnap = buildShowSnapshot(showPreps, showPlanCache);
      }

      // 5. Celebration — deterministic per weekId
      const reflSnap = await db.collection("reflections")
        .where("userId", "==", uid)
        .where("isDeleted", "==", false)
        .get();
      const reflections = reflSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const cel = selectCelebration(reflections, weekId);

      // 6. Write the frozen snapshot for this week
      const contentSnapshot = {
        coaching: coachingSnap || null,
        gpt: gptSnap || null,
        physical: physSnap || null,
        show: showSnap,
        visualization: null, // visualization suggestion is low-priority, stays client-side
      };

      const weekDoc = {
        weekId,
        contentSnapshot,
        lastUpdated: new Date().toISOString(),
        updatedBy: "weeklyFocusRefresh",
      };
      if (cel?.id) weekDoc.celebrationId = cel.id;

      // Merge — preserves user's pinnedSections, completedSections, checkedItems
      await db.collection("users").doc(uid).collection("weeklyFocus").doc(weekId)
        .set(weekDoc, { merge: true });

      processed++;
      const sections = [
        coachingSnap ? "coaching" : null,
        gptSnap ? "gpt" : null,
        physSnap ? "physical" : null,
        showSnap.state === "active_show" ? "show" : null,
      ].filter(Boolean);
      console.log(`[weeklyFocusRefresh] ${displayName}: ${sections.join(", ") || "no sections"}`);
    } catch (err) {
      console.error(`[weeklyFocusRefresh] Error for ${displayName}:`, err.message);
      errors++;
    }
  }

  console.log(`[weeklyFocusRefresh] Done: ${processed} updated, ${skipped} skipped, ${errors} errors`);
  return { processed, skipped, errors, weekId };
}

module.exports = { handler };
