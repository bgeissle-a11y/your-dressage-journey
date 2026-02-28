/**
 * Cloud Functions for Your Dressage Journey
 *
 * Entry point - all function exports are registered here.
 * Firebase deploys every export from this file as a Cloud Function.
 *
 * Functions use Firebase Functions v2 (2nd generation).
 * v2 onCall functions provide request.auth automatically when
 * the client uses httpsCallable() from the Firebase client SDK.
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

// Secrets — declared once, referenced by all AI functions
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

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
exports.getJourneyMap = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" },
  journeyMap.handler
);

// Grand Prix Thinking Layer 1: 3-path mental performance dashboard
// Input: { forceRefresh?: boolean }
exports.getGrandPrixThinking = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" },
  grandPrixThinking.handler
);

// Data Visualizations: pattern extraction, goal mapping, insight narratives
// Input: { forceRefresh?: boolean }
exports.getDataVisualizations = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" },
  dataVisualizations.handler
);

// Event Planner: 4-call pipeline for event preparation
// Input: { eventPrepPlanId: string, forceRefresh?: boolean }
exports.getEventPlanner = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" },
  eventPlanner.handler
);

// Physical Guidance: physical pattern analysis + exercise prescription
// Input: { forceRefresh?: boolean }
exports.getPhysicalGuidance = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" },
  physicalGuidance.handler
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
