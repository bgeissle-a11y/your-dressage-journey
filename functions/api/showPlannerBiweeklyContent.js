/**
 * Show Planner — Bi-weekly content trigger (Token Budget Spec v2 Lever 2).
 *
 * Scheduled function that fires every 14 days. For every active show
 * preparation in the next 90 days, runs ONE Sonnet call grounded in the
 * rider's cached Multi-Voice précis (rather than re-running the full
 * prepareRiderData aggregator) and appends the resulting "check-in" block
 * to the plan's `biweeklyContent` array.
 *
 * Cost shape: ~3000 max_tokens × ~$0.40-0.50 per plan per fire. The scope
 * filter (showDateStart within 90 days AND > now) keeps dormant plans free.
 *
 * Per the implementation brief Phase 5:
 *   - Skip plans whose owner can't `generateShowPrepPlan` (capability gate).
 *   - Skip plans whose owner has no `coaching_precis` (rider too new — content
 *     wouldn't be grounded enough to be useful).
 *   - Both skips are silent: log and continue, never throw.
 *
 * Feature flag: `SHOW_PLANNER_BIWEEKLY_ENABLED` (default "false"). The
 * scheduled trigger fires on its 14-day cadence regardless of the flag, but
 * with the flag off the handler logs "disabled by env" and returns 0-cost.
 * Flip to "true" in Firebase env when ready to start generating content.
 *
 *   firebase functions:config:set show_planner.biweekly_enabled=true     (legacy)
 *   firebase functions:secrets:set SHOW_PLANNER_BIWEEKLY_ENABLED         (preferred)
 *
 * The handler is also exposed as a Cloud Function callable so it can be
 * triggered manually from the admin console / a script for testing without
 * waiting 14 days.
 */

const { db } = require("../lib/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { callClaude } = require("../lib/claudeCall");
const { loadSubscription } = require("../lib/loadSubscription");
const { CAPABILITIES, canAccess } = require("../lib/entitlements");
const { getMaxTokens, tierFromLabel } = require("../lib/tokenBudgets");

const COACHING_PRECIS_DOC = (uid) => `${uid}_coaching_precis`;
const ANALYSIS_CACHE = "analysisCache";
const SHOW_PREP_COLLECTION = "showPreparations";

const ACTIVE_PREP_WINDOW_DAYS = 90;

function _isEnabled() {
  // Default OFF so a fresh deploy doesn't surprise-bill the user. Flip
  // `SHOW_PLANNER_BIWEEKLY_ENABLED=true` in Firebase env to enable.
  const v = (process.env.SHOW_PLANNER_BIWEEKLY_ENABLED || "false").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function _isoDateOnly(s) {
  // Show dates are stored as either "YYYY-MM-DD" or full ISO. Strip to date.
  if (!s) return null;
  return String(s).slice(0, 10);
}

function _daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Active plans = within the next 90 days, with showDateStart strictly in
 * the future. Plans whose show has already started or finished are skipped.
 *
 * We do the date filter client-side after the soft-delete filter to avoid
 * a composite index. Volume is low (each user has at most a handful).
 */
async function queryActivePlans(now = new Date()) {
  const cutoffIso = new Date(now.getTime() + ACTIVE_PREP_WINDOW_DAYS * 86400000)
    .toISOString().slice(0, 10);
  const todayIso = now.toISOString().slice(0, 10);

  // Single equality filter — works without a composite index.
  const snap = await db.collection(SHOW_PREP_COLLECTION)
    .where("isDeleted", "==", false)
    .get();

  const plans = [];
  snap.forEach((doc) => {
    const data = doc.data();
    const showDate = _isoDateOnly(data.showDateStart || data.showDate || "");
    if (!showDate) return;
    if (showDate <= todayIso) return;
    if (showDate > cutoffIso) return;
    plans.push({ id: doc.id, ...data });
  });
  return plans;
}

async function loadPrecis(uid) {
  try {
    const snap = await db.collection(ANALYSIS_CACHE).doc(COACHING_PRECIS_DOC(uid)).get();
    if (!snap.exists) return null;
    return snap.data()?.result?.precis || null;
  } catch (err) {
    console.warn(`[biweekly] precis read failed for ${uid}: ${err.message}`);
    return null;
  }
}

/**
 * Build the Sonnet prompt for the bi-weekly check-in.
 *
 * The précis is the entire <rider_current_state> input — no prepareRiderData
 * fan-out. The plan doc contributes show specifics (date, level, tests).
 *
 * Voice: Technical Coach is the right register here (matches the
 * Readiness Snapshot already attached to the same plan).
 */
function buildBiweeklyPrompt(plan, precis, now) {
  const showDate = _isoDateOnly(plan.showDateStart || plan.showDate);
  const daysOut = showDate
    ? _daysBetween(now, new Date(showDate + "T00:00:00"))
    : null;

  const tests = Array.isArray(plan.testsSelected) && plan.testsSelected.length
    ? plan.testsSelected.join(", ")
    : (plan.testId || "TBD");
  const horseName = plan.horseName || "the horse";
  const showName = plan.showName || "the show";
  const concerns = plan.concerns?.notes
    || (Array.isArray(plan.concerns?.flaggedByTest) && plan.concerns.flaggedByTest.length
      ? plan.concerns.flaggedByTest.map((c) => c.testLabel || c.testId).join(", ")
      : null);
  const goals = plan.goals?.primary || plan.goals?.notes || null;

  const system = `You are The Technical Coach for Your Dressage Journey — a biomechanics specialist who sees riding as a conversation between two bodies in motion. Your tone is clear, specific, and honest. You respect the rider's intelligence. You never use vague encouragement.

You are writing a SHORT bi-weekly check-in for a rider preparing for an upcoming dressage competition. The check-in is grounded in the rider's CURRENT STATE (a précis of their recent coaching) and the SPECIFICS of the show they're preparing for. It is NOT a re-generation of the full preparation plan — that already exists. This is a single focused message: where they are now, what one thing matters most in the next two weeks, and a confidence-anchored close.

GUARDRAILS:
- Use precise dressage terminology. No showjumping or eventing vocabulary.
- Use ${horseName}'s name — never "your horse."
- Do not invent details about debriefs, sessions, or specific rides — only reason from the précis and show specifics provided.
- Do not name yourself, mention being an AI, or reference other coaching voices.
- 150-220 words total. Flowing prose. No headers, no bullet points.

STRUCTURE:
- Opening: name where the rider is right now based on the précis (1-2 sentences).
- Middle: name ONE focal point for the next 14 days, anchored to a specific concern or coefficient movement when the plan flags one. Be concrete.
- Close: one warm, specific sentence drawing on something the précis reveals about this rider — not generic encouragement.

INPUT:`;

  const userMessage = `<rider_current_state>
${precis}
</rider_current_state>

<show_specifics>
- Show: ${showName}
- Show date: ${showDate}${daysOut != null ? ` (${daysOut} days out)` : ""}
- Tests: ${tests}
- Horse: ${horseName}
${goals ? `- Primary goal: ${goals}` : ""}
${concerns ? `- Flagged concerns: ${concerns}` : ""}
</show_specifics>

Write the bi-weekly check-in now. Plain prose. 150-220 words.`;

  return { system, userMessage };
}

/**
 * Per-plan: gate, fetch précis, call Claude, append to biweeklyContent.
 * Returns one of: "generated" | "skipped:no-precis" | "skipped:no-access"
 * | "error". Never throws so a bad plan doesn't abort the schedule run.
 */
async function processPlan(plan, now) {
  const planRef = db.collection(SHOW_PREP_COLLECTION).doc(plan.id);
  const uid = plan.userId;
  if (!uid) {
    console.warn(`[biweekly] plan ${plan.id} missing userId — skipping`);
    return "error";
  }

  try {
    const sub = await loadSubscription(uid);
    if (!canAccess(sub, CAPABILITIES.generateShowPrepPlan)) {
      console.log(`[biweekly] ${uid} lacks generateShowPrepPlan — skipping plan ${plan.id}`);
      return "skipped:no-access";
    }

    const precis = await loadPrecis(uid);
    if (!precis) {
      console.log(`[biweekly] ${uid} has no coaching_precis — skipping plan ${plan.id}`);
      return "skipped:no-precis";
    }

    const budgetTier = sub.isPilot ? "pilot" : tierFromLabel(sub.tier);
    const { system, userMessage } = buildBiweeklyPrompt(plan, precis, now);

    const content = await callClaude({
      system,
      userMessage,
      jsonMode: false,
      maxTokens: getMaxTokens("event-planner", budgetTier),
      context: "show-planner-biweekly",
      uid,
    });

    const text = typeof content === "string" ? content.trim() : String(content || "").trim();
    if (!text) {
      console.warn(`[biweekly] empty content for plan ${plan.id}`);
      return "error";
    }

    await planRef.update({
      biweeklyContent: FieldValue.arrayUnion({
        text,
        generatedAt: new Date().toISOString(),
        source: "scheduled",
      }),
    });
    console.log(`[biweekly] generated for plan ${plan.id} (${uid}), ${text.length} chars`);
    return "generated";
  } catch (err) {
    console.error(`[biweekly] plan ${plan.id} failed:`, err.message || err);
    return "error";
  }
}

/**
 * Scheduled handler. Iterates active plans sequentially to keep per-user
 * usage bursts small (the budget gates per-call anyway, but a 50-plan fan-out
 * would still hit the daily call limit on the unlucky plan that happens to
 * pick up the cap-crossing call).
 */
async function scheduledHandler() {
  if (!_isEnabled()) {
    console.log("[biweekly] disabled by env (SHOW_PLANNER_BIWEEKLY_ENABLED) — exiting");
    return;
  }
  const now = new Date();
  const plans = await queryActivePlans(now);
  console.log(`[biweekly] processing ${plans.length} active plans`);

  const tally = { generated: 0, skipped: 0, error: 0 };
  for (const plan of plans) {
    const outcome = await processPlan(plan, now);
    if (outcome === "generated") tally.generated++;
    else if (outcome === "error") tally.error++;
    else tally.skipped++;
  }
  console.log(`[biweekly] done — generated=${tally.generated} skipped=${tally.skipped} error=${tally.error}`);
}

/**
 * Admin-only callable. Lets an authenticated admin trigger one run without
 * waiting for the 14-day cron. Honors the env flag so test deploys behave
 * exactly like production. Returns the tally for confirmation.
 */
async function callableHandler(request) {
  const auth = request.auth;
  if (!auth || !auth.token?.admin) {
    const { HttpsError } = require("firebase-functions/v2/https");
    throw new HttpsError("permission-denied", "Admin only.");
  }
  if (!_isEnabled()) {
    return { success: false, reason: "disabled-by-env" };
  }
  const now = new Date();
  const plans = await queryActivePlans(now);
  const tally = { generated: 0, skipped: 0, error: 0, planIds: [] };
  for (const plan of plans) {
    const outcome = await processPlan(plan, now);
    tally.planIds.push({ id: plan.id, outcome });
    if (outcome === "generated") tally.generated++;
    else if (outcome === "error") tally.error++;
    else tally.skipped++;
  }
  return { success: true, ...tally };
}

module.exports = {
  scheduledHandler,
  callableHandler,
  // Exports used by tests:
  _isEnabled,
  buildBiweeklyPrompt,
  queryActivePlans,
  processPlan,
};
