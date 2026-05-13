/**
 * Cloud Functions for Your Dressage Journey
 *
 * Entry point - all function exports are registered here.
 * Firebase deploys every export from this file as a Cloud Function.
 *
 * Functions use Firebase Functions v2 (2nd generation).
 * v2 onCall functions provide request.auth automatically when
 * the client uses httpsCallable() from the Firebase client SDK.
 *
 * Runtime: nodejs22 (declared in firebase.json)
 */

// Sentry must be initialized before any other imports
require("./lib/sentry");

const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { validateAuth } = require("./lib/auth");
const { wrapError } = require("./lib/errors");
const { prepareRiderData } = require("./lib/prepareRiderData");

// API modules
const coaching = require("./api/coaching");
const journeyMap = require("./api/journeyMap");
const grandPrixThinking = require("./api/grandPrixThinking");
const dataVisualizations = require("./api/dataVisualizations");
const eventPlanner = require("./api/eventPlanner");
const physicalGuidance = require("./api/physicalGuidance");
const cacheWarmth = require("./api/cacheWarmth");
const dataTriggeredRegeneration = require("./api/dataTriggeredRegeneration");
const firstGlimpse = require("./api/firstGlimpse");
const waitlist = require("./api/waitlist");
const adminStats = require("./api/adminStats");
const adminUsageStats = require("./api/adminUsageStats");
const adminSmokeTest = require("./api/adminSmokeTest");
const weeklyFocusRefresh = require("./api/weeklyFocusRefresh");
const arenaCoaching = require("./api/arenaCoaching");
const weeklyCoachBrief = require("./api/weeklyCoachBrief");
const lessonPrepSummary = require("./api/lessonPrepSummary");
const readinessSnapshot = require("./api/readinessSnapshot");
const visualizationScript = require("./api/visualizationScript");
const processLessonTranscript = require("./api/processLessonTranscript");
const stripeHandlers = require("./api/stripe");
const firstLight = require("./api/firstLight");
const microDebrief = require("./api/microDebrief");
const freshStart = require("./api/freshStart");
const showPlannerBiweeklyContent = require("./api/showPlannerBiweeklyContent");

// Secrets — declared once, referenced by all functions that need them
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// --- Health check / smoke test ---
exports.ping = onCall((request) => {
  validateAuth(request);
  return { status: "ok", timestamp: new Date().toISOString() };
});

// --- Unauthenticated health endpoint for UptimeRobot ---
exports.health = onRequest((req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- First Glimpse (unauthenticated, marketing/lead-gen) ---
exports.firstGlimpse = onRequest(
  { secrets: [anthropicKey], timeoutSeconds: 60, memory: "256MiB" },
  firstGlimpse.handler
);

// --- Waitlist email capture (unauthenticated, pre-launch) ---
exports.waitlist = onRequest(
  { timeoutSeconds: 15, memory: "256MiB" },
  waitlist.handler
);

// --- Data preparation (for testing the pre-processing layer) ---
exports.prepareData = onCall(async (request) => {
  try {
    const uid = validateAuth(request);
    return await prepareRiderData(uid);
  } catch (error) {
    throw wrapError(error, "prepareData");
  }
});

// --- AI Coaching Functions ---

// Multi-Voice Coaching: 4 coaching voices analyzing rider data
// Input: { voiceIndex?: 0|1|2|3, forceRefresh?: boolean }
exports.getMultiVoiceCoaching = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" },
  coaching.handler
);

// Journey Map: chronological narrative + milestones + visualization data
// Input: { forceRefresh?: boolean }
// 540s: top-tier outputs run 6-7k tokens; 300s was tight on slow Claude days.
exports.getJourneyMap = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "1GiB" },
  journeyMap.handler
);

// Grand Prix Thinking Layer 1: 3-path mental performance dashboard
// Input: { forceRefresh?: boolean, layer?: "mental"|"trajectory" }
// 540s: mental layer is one large Sonnet call (4-week program). Trajectory
// layer is a 4-call Opus/Sonnet pipeline that can still exceed 540s — that
// path needs client-side chunking like Event Planner before relying on it
// in production for top-tier riders.
exports.getGrandPrixThinking = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "1GiB" },
  grandPrixThinking.handler
);

// Data Visualizations: pattern extraction, goal mapping, insight narratives
// Input: { forceRefresh?: boolean }
// 540s: 3 sequential Sonnet calls; observed total runtime ~3-5 min.
exports.getDataVisualizations = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "1GiB" },
  dataVisualizations.handler
);

// Event Planner: 4-call pipeline for event preparation (per-step, client-orchestrated)
// Each step makes a single Claude call; step 3 (preparation plan) can generate ~24K tokens.
// Input: { eventPrepPlanId|showPrepPlanId: string, step: 1-4, priorResults?: object, forceRefresh?: boolean }
exports.getEventPlanner = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  eventPlanner.handler
);

// Readiness Snapshot: 300–400 word narrative readiness assessment for show planner
// Input: { planId: string, refresh?: boolean }
exports.getReadinessSnapshot = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" },
  readinessSnapshot.handler
);

// Visualization Script: PETTLEP mental rehearsal script for a dressage movement
// Input: { formData: { movement, problemFocus, referenceType, context, ... } }
exports.getVisualizationScript = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" },
  visualizationScript.handler
);

// Physical Guidance: physical pattern analysis + exercise prescription
// Input: { forceRefresh?: boolean }
// Timeout: 540s (HTTP max). Two sequential Sonnet calls each producing up to
// 8192 output tokens routinely take 4-6 minutes combined; the previous 300s
// budget timed out mid-Call-2 and left the cache untouched. 1 GiB memory to
// give parsing room for the 8k-token JSON outputs.
exports.getPhysicalGuidance = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "1GiB" },
  physicalGuidance.handler
);

// First Light: inaugural AI coaching artifact (single Sonnet call).
// Generated on rider request after the 6-reflection wizard. See
// YDJ_FirstLight_Implementation_Brief_v3.md §10 for the full lifecycle.
// Input: none (uses authenticated user's data)
exports.generateFirstLight = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" },
  firstLight.generate
);

// First Light: one-time regenerate that incorporates data logged since
// initial generation. Available between generation and graduation.
// Input: none
exports.regenerateFirstLight = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" },
  firstLight.regenerate
);

// --- Arena Geometry Trainer coaching (unauthenticated, lightweight) ---
exports.arenaCoaching = onRequest(
  { secrets: [anthropicKey], timeoutSeconds: 30, memory: "256MiB" },
  arenaCoaching.handler
);

// --- Lesson Transcript Processing (AI-powered transcript → structured fields) ---
// Input: { transcript, horseName, instructorName }
exports.processLessonTranscript = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 120, memory: "256MiB" },
  processLessonTranscript.handler
);

// --- Weekly Coach Brief (no AI call — data assembly only) ---
// Input: none (uses authenticated user's data)
exports.generateWeeklyCoachBrief = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  weeklyCoachBrief.handler
);

// --- Pre-Lesson Summary (no AI call — data assembly only, rider-facing) ---
// Input: none (uses authenticated user's data)
exports.generateLessonPrepSummary = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  lessonPrepSummary.handler
);

// --- Cache Warming ---

// Check cache staleness for the authenticated user (no API calls, just Firestore reads)
exports.checkCacheStaleness = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  cacheWarmth.checkHandler
);

// Scheduled background cache warming — DISABLED during pilot to control API costs.
// Was running every 6 hours and regenerating all outputs for all active users (~2.2M tokens/week).
// Re-enable post-pilot when budget supports it.
//
// exports.warmStaleCache = onSchedule(
//   {
//     schedule: "every 6 hours",
//     secrets: [anthropicKey],
//     timeoutSeconds: 540,
//     memory: "512MiB",
//   },
//   cacheWarmth.warmHandler
// );

// --- Weekly Focus Refresh — Monday 5 AM ET (10:00 UTC) ---
// Advances GPT/Physical week pointers and freezes new content snapshot
// for all users. No Claude API calls — Firestore reads/writes only.
exports.weeklyFocusRefresh = onSchedule(
  {
    schedule: "every monday 05:00",
    timeZone: "America/New_York",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  weeklyFocusRefresh.handler
);

// --- Show Planner Bi-Weekly Content (Token Budget Spec v2 Lever 2) ---
// Fires at 06:00 ET on the 1st and 15th of every month (~14-day cadence).
// App Engine cron has no native "every 14 days" syntax, so we use unix
// cron with explicit day-of-month list — gives spec-equivalent behavior
// (2 fires/month, ~14 days apart).
//
// For each fire, iterate active show plans (showDateStart within the next 90
// days) and append a Sonnet-generated check-in to each plan's
// biweeklyContent array. Grounded in the rider's cached Multi-Voice précis
// (NOT a full prepareRiderData run — cost win).
//
// The trigger is always registered so it shows up in `firebase functions:list`,
// but the handler is gated by env flag SHOW_PLANNER_BIWEEKLY_ENABLED. Default
// "false" — flip to "true" only when you've validated the prompt against a
// couple of plans via the manual `runShowPlannerBiweekly` callable below.
exports.showPlannerBiweeklyContent = onSchedule(
  {
    schedule: "0 6 1,15 * *",
    timeZone: "America/New_York",
    secrets: [anthropicKey],
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  showPlannerBiweeklyContent.scheduledHandler
);

// Admin-only manual trigger for the bi-weekly run. Useful for prompt
// validation without waiting 14 days, or for one-off content backfills.
exports.runShowPlannerBiweekly = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  showPlannerBiweeklyContent.callableHandler
);

// --- Admin ---

// Cross-user activity summary (requires admin custom claim)
exports.getAdminStats = onCall(
  { timeoutSeconds: 60, memory: "256MiB" },
  adminStats.handler
);

// API token usage stats — per-user, per-output, per-model breakdowns (requires admin)
exports.getAdminUsageStats = onCall(
  { timeoutSeconds: 120, memory: "512MiB" },
  adminUsageStats.handler
);

// Platform health check — per-user data/cache validation (requires admin)
exports.adminSmokeTest = onCall(
  { timeoutSeconds: 120, memory: "512MiB" },
  adminSmokeTest.handler
);

// --- Data-Triggered Background Regeneration ---

// Threshold triggers: regenerate after 5 new entries accumulate
exports.onDebriefCreated = onDocumentCreated(
  { document: "debriefs/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleDebriefCreated
);
exports.onReflectionCreated = onDocumentCreated(
  { document: "reflections/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleReflectionCreated
);

// First Light graduation trigger: on every new debrief or reflection,
// check whether the rider has crossed the Multi-Voice threshold
// (5 debriefs + all 6 reflection categories). When met, set
// firstLight/current.graduatedAt. No Claude calls — Firestore reads only.
exports.firstLightGraduateOnDebrief = onDocumentCreated(
  { document: "debriefs/{docId}", timeoutSeconds: 60, memory: "256MiB" },
  firstLight.graduate
);
exports.firstLightGraduateOnReflection = onDocumentCreated(
  { document: "reflections/{docId}", timeoutSeconds: 60, memory: "256MiB" },
  firstLight.graduate
);

// Immediate triggers: regenerate on every creation
exports.onJourneyEventCreated = onDocumentCreated(
  { document: "journeyEvents/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleImmediateChange
);
exports.onPhysicalAssessmentCreated = onDocumentCreated(
  { document: "physicalAssessments/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleImmediateChange
);
exports.onRiderAssessmentCreated = onDocumentCreated(
  { document: "riderAssessments/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleImmediateChange
);
exports.onHealthEntryCreated = onDocumentCreated(
  { document: "horseHealthEntries/{docId}", secrets: [anthropicKey], timeoutSeconds: 540, memory: "512MiB" },
  dataTriggeredRegeneration.handleImmediateChange
);

// --- Habit Loop: Empathetic Coach responses ---
//
// Both triggers fire on document creation in their respective collections.
// Each function makes a single Sonnet call (text mode) and writes the
// response back to the same document. Failures fall back to a canned
// response so the rider always sees something.
//
// Specs:
//   YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md
//   YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md

// Micro-debrief reward: 30–50 word response, ~80 output tokens.
exports.onMicroDebriefSubmit = onDocumentCreated(
  { document: "microDebriefs/{docId}", secrets: [anthropicKey], timeoutSeconds: 60, memory: "256MiB" },
  microDebrief.onSubmit
);

// Fresh Start re-onboarding response: 60–110 word response, ~200 output tokens.
exports.onFreshStartSubmit = onDocumentCreated(
  { document: "freshStarts/{docId}", secrets: [anthropicKey], timeoutSeconds: 60, memory: "256MiB" },
  freshStart.onSubmit
);

// --- Stripe Subscription & Billing ---

// Create a Stripe Checkout Session for subscription signup
// Input: { lookupKey: string, origin?: string }
// Returns: { url: string }
exports.createCheckoutSession = onCall(
  { secrets: [stripeSecretKey], timeoutSeconds: 30, memory: "256MiB" },
  stripeHandlers.createCheckoutSession
);

// Create a Stripe Billing Portal session for subscription management
// Input: { origin?: string }
// Returns: { url: string }
exports.createPortalSession = onCall(
  { secrets: [stripeSecretKey], timeoutSeconds: 30, memory: "256MiB" },
  stripeHandlers.createPortalSession
);

// Stripe webhook endpoint — raw HTTP POST, not onCall
// Processes: subscription.created/updated/deleted, invoice.payment_succeeded/failed
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret], timeoutSeconds: 30, memory: "256MiB" },
  stripeHandlers.handleWebhook
);

// In-place subscription update with proper IC coupon swap. Used for IC tier
// upgrades within the 6-month window (the Customer Portal can't manage our
// coupon rules).
// Input: { targetLookupKey: string, flow: "ic_upgrade" }
// Returns: { success, subscriptionId, fromTier, toTier }
exports.changeSubscriptionPlan = onCall(
  { secrets: [stripeSecretKey], timeoutSeconds: 30, memory: "256MiB" },
  stripeHandlers.changeSubscriptionPlan
);

// Get pricing eligibility for the current user (or anonymous public response)
// Returns IC eligibility, trial eligibility, pilot status, and live cohort count.
// Input: none
// Returns: { isPilot, isAlreadyIC, icEligibleNow, trialEligible, cohort: {...} }
exports.getPricingEligibility = onCall(
  { timeoutSeconds: 15, memory: "256MiB" },
  stripeHandlers.getPricingEligibility
);
