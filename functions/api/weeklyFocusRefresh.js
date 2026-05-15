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
 * Extraction + selection logic lives in lib/weeklyFocusSnapshot.js so this
 * cron and the per-regen refresh helper can't drift apart.
 */

const { db, auth } = require("../lib/firebase");
const {
  advanceWeekAndExtract,
  getCycleState,
} = require("../lib/cycleState");
const {
  getWeekId,
  readCacheResult,
  extractCoachingSnapshot,
  extractGPTSnapshot,
  extractPhysicalSnapshot,
  selectCelebration,
} = require("../lib/weeklyFocusSnapshot");

// ── Show card (same logic as weeklyFocusUtils.js buildShowSnapshot) ──

const TASKS_BY_WEEK = {
  10: [
    { area: "mental", title: "Set your show season intention", cue: "Write one sentence about what you want this show to teach you." },
    { area: "tech", title: "Audit your weakest movement", cue: "Identify the one movement you avoid schooling. Ride it once per session this week." },
    { area: "physical", title: "Baseline body inventory", cue: "Before riding today, stand still and scan: where are you tight? Write it down." },
  ],
  8: [
    { area: "mental", title: "Establish your baseline mental cue", cue: "Choose one word or phrase that signals “ready to ride”. Use it every warm-up." },
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
    { area: "physical", title: "Ride fresh — shorten sessions", cue: "Keep rides to 35–40 minutes max. You are banking energy." },
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

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let pageNum = 0;
  let pageToken;

  // Paginate through all users — listUsers caps at 1000 per page.
  do {
    pageNum++;
    const listResult = await auth.listUsers(1000, pageToken);
    const users = listResult.users;
    console.log(`[weeklyFocusRefresh] Processing page ${pageNum} (${users.length} users)`);

    for (const user of users) {
      const uid = user.uid;
      const displayName = user.displayName || user.email || uid;

      try {
        // 1. Advance week pointers (no-op if cycle doesn't exist or week hasn't changed)
        await Promise.all([
          advanceWeekAndExtract(uid, "gpt").catch((err) => {
            console.error(`[weeklyFocusRefresh] advanceWeekAndExtract failed for ${uid} (gpt):`, err.message);
            return { advanced: false, currentWeek: 1 };
          }),
          advanceWeekAndExtract(uid, "physical").catch((err) => {
            console.error(`[weeklyFocusRefresh] advanceWeekAndExtract failed for ${uid} (physical):`, err.message);
            return { advanced: false, currentWeek: 1 };
          }),
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

    pageToken = listResult.pageToken;
  } while (pageToken);

  console.log(`[weeklyFocusRefresh] Done: ${processed} updated, ${skipped} skipped, ${errors} errors`);
  return { processed, skipped, errors, weekId };
}

module.exports = { handler };
