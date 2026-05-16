/**
 * Entitlements — Tier × Capability access control (backend mirror)
 *
 * Backend authority for "can this user do X?" decisions in Cloud Functions.
 * Frontend mirror: src/constants/entitlements.js — keep the two in sync.
 *
 * Cloud Functions MUST call canAccess() before triggering Claude API calls
 * or Firestore writes. The frontend gating is UX only — the backend is the
 * source of truth.
 *
 * Three layers compose into a final decision:
 *   1. getTierStatus(subscription, now) — derives a status from the raw
 *      Firestore user record + the current date (handles pilot grace, etc.)
 *   2. TIER_CAPABILITIES — what each paid tier inherently grants
 *   3. canAccess() — combines status + tier caps with status modifiers
 *      (e.g. pilot-grace strips writes/generates regardless of tier)
 *
 * Pilot lifecycle:
 *   - 'pilot'         (≤ 2026-05-15)            → full access
 *   - 'pilot-grace'   (2026-05-16 → 2026-07-07) → read-only on existing data
 *   - 'pilot-expired' (≥ 2026-07-08)            → blocked (until conversion)
 */

// ─── Pilot lifecycle date boundaries ──────────────────────────────────────
const PILOT_END_ISO = "2026-05-15T23:59:59.999Z";
const PILOT_GRACE_END_ISO = "2026-07-07T23:59:59.999Z";

// ─── Tier identifiers (must match Firestore subscriptionTier values) ───────
const TIERS = {
  NONE: "none",
  WORKING: "working",
  MEDIUM: "medium",
  EXTENDED: "extended",
};

const TIER_RANK = {
  none: 0,
  working: 1,
  medium: 2,
  extended: 3,
};

// ─── Capability registry ──────────────────────────────────────────────────
const CAPABILITIES = {
  // Profile/setup
  createRiderProfile: "createRiderProfile",
  createHorseProfile: "createHorseProfile",

  // Data entry forms
  createDebrief: "createDebrief",
  createReflection: "createReflection",
  createObservation: "createObservation",
  createJourneyEvent: "createJourneyEvent",
  createRiderAssessment: "createRiderAssessment",
  createPhysicalAssessment: "createPhysicalAssessment",
  createHorseHealthEntry: "createHorseHealthEntry",
  createRiderHealthEntry: "createRiderHealthEntry",
  createShowPrep: "createShowPrep",

  // AI outputs — view (cached/historical)
  viewJourneyMap: "viewJourneyMap",
  viewCoaching: "viewCoaching",
  viewDataVisualizations: "viewDataVisualizations",
  viewGrandPrixThinking: "viewGrandPrixThinking",
  viewPhysicalGuidance: "viewPhysicalGuidance",
  viewShowPrepPlan: "viewShowPrepPlan",

  // AI outputs — generate (Cloud Function call)
  generateJourneyMap: "generateJourneyMap",
  generateCoaching: "generateCoaching",
  generateDataVisualizations: "generateDataVisualizations",
  generateGrandPrixThinking: "generateGrandPrixThinking",
  generatePhysicalGuidance: "generatePhysicalGuidance",
  generateShowPrepPlan: "generateShowPrepPlan",
  generateVisualizationScript: "generateVisualizationScript",

  // Mid-cycle regeneration (Extended tier only)
  regenerateGrandPrixThinking: "regenerateGrandPrixThinking",
  regeneratePhysicalGuidance: "regeneratePhysicalGuidance",
};

// ─── Tier → capability map ────────────────────────────────────────────────
const WORKING_CAPS = new Set([
  CAPABILITIES.createRiderProfile,
  CAPABILITIES.createHorseProfile,
  CAPABILITIES.createDebrief,
  CAPABILITIES.createReflection,
  CAPABILITIES.createObservation,
  CAPABILITIES.createJourneyEvent,
  CAPABILITIES.createRiderAssessment,
  CAPABILITIES.createPhysicalAssessment,
  CAPABILITIES.createHorseHealthEntry,
  CAPABILITIES.createRiderHealthEntry,
  CAPABILITIES.viewJourneyMap,
  CAPABILITIES.viewCoaching,
  CAPABILITIES.viewDataVisualizations,
  CAPABILITIES.generateJourneyMap,
  CAPABILITIES.generateCoaching,
  CAPABILITIES.generateDataVisualizations,
]);

const MEDIUM_ADDS = new Set([
  CAPABILITIES.createShowPrep,
  CAPABILITIES.viewGrandPrixThinking,
  CAPABILITIES.viewPhysicalGuidance,
  CAPABILITIES.viewShowPrepPlan,
  CAPABILITIES.generateGrandPrixThinking,
  CAPABILITIES.generatePhysicalGuidance,
  CAPABILITIES.generateShowPrepPlan,
  CAPABILITIES.generateVisualizationScript,
]);

const EXTENDED_ADDS = new Set([
  CAPABILITIES.regenerateGrandPrixThinking,
  CAPABILITIES.regeneratePhysicalGuidance,
]);

const ALL_CAPABILITIES = new Set(Object.values(CAPABILITIES));

function effectiveCapsForTier(tier) {
  const caps = new Set();
  if (
    tier === TIERS.WORKING ||
    tier === TIERS.MEDIUM ||
    tier === TIERS.EXTENDED
  ) {
    for (const c of WORKING_CAPS) caps.add(c);
  }
  if (tier === TIERS.MEDIUM || tier === TIERS.EXTENDED) {
    for (const c of MEDIUM_ADDS) caps.add(c);
  }
  if (tier === TIERS.EXTENDED) {
    for (const c of EXTENDED_ADDS) caps.add(c);
  }
  return caps;
}

// ─── Status derivation ────────────────────────────────────────────────────
const STATUS = {
  FOUNDER: "founder",
  COMP: "comp",
  PILOT: "pilot",
  PILOT_GRACE: "pilot-grace",
  PILOT_EXPIRED: "pilot-expired",
  PAID_ACTIVE: "paid-active",
  PAID_TRIALING: "paid-trialing",
  PAID_PAST_DUE: "paid-past-due",
  PAID_CANCELED: "paid-canceled",
  NONE: "none",
};

/**
 * @param {object} subscription - User doc fields: { subscriptionTier,
 *   subscriptionStatus, isPilot, isFounder, ... } OR the shape from
 *   useSubscription (which uses `tier`/`status`).
 * @param {Date} [now]
 */
function getTierStatus(subscription, now = new Date()) {
  if (!subscription) return STATUS.NONE;

  // Founder flag is checked first and unconditionally — Barb keeps full
  // access regardless of any Stripe state, pilot dates, or migrations.
  if (subscription.isFounder === true) return STATUS.FOUNDER;

  // Complimentary lifetime access — same unconditional bypass as founder,
  // but labeled distinctly so the UI doesn't badge comp users as "Founder".
  if (subscription.isComp === true) return STATUS.COMP;

  // Accept both Firestore-doc shape and useSubscription shape.
  const tier =
    subscription.tier ||
    subscription.subscriptionTier ||
    TIERS.NONE;
  const status =
    subscription.status ||
    subscription.subscriptionStatus ||
    "none";
  const isPilot = !!subscription.isPilot;

  if (tier !== TIERS.NONE) {
    if (status === "trialing") return STATUS.PAID_TRIALING;
    if (status === "active") return STATUS.PAID_ACTIVE;
    if (status === "past_due" || status === "unpaid") return STATUS.PAID_PAST_DUE;
    if (status === "canceled") return STATUS.PAID_CANCELED;
  }

  if (isPilot) {
    const pilotEnd = new Date(PILOT_END_ISO);
    const graceEnd = new Date(PILOT_GRACE_END_ISO);
    if (now <= pilotEnd) return STATUS.PILOT;
    if (now <= graceEnd) return STATUS.PILOT_GRACE;
    return STATUS.PILOT_EXPIRED;
  }

  return STATUS.NONE;
}

// ─── The main access check ────────────────────────────────────────────────
/**
 * @param {object} subscription
 * @param {string} capability - One of CAPABILITIES.*
 * @param {Date} [now]
 * @returns {boolean}
 */
function canAccess(subscription, capability, now = new Date()) {
  if (!ALL_CAPABILITIES.has(capability)) return false;

  const status = getTierStatus(subscription, now);
  const isViewCap = capability.startsWith("view");
  const tier =
    (subscription && (subscription.tier || subscription.subscriptionTier)) ||
    TIERS.NONE;

  switch (status) {
    case STATUS.FOUNDER:
      return true;
    case STATUS.COMP:
      return true;
    case STATUS.PILOT:
      return true;
    case STATUS.PILOT_GRACE:
      return isViewCap;
    case STATUS.PILOT_EXPIRED:
      return false;
    case STATUS.PAID_ACTIVE:
    case STATUS.PAID_TRIALING:
      return effectiveCapsForTier(tier).has(capability);
    case STATUS.PAID_PAST_DUE:
      return isViewCap;
    case STATUS.PAID_CANCELED:
    case STATUS.NONE:
    default:
      return false;
  }
}

/**
 * What's the lowest paid tier that grants this capability?
 * @returns {'working'|'medium'|'extended'|null}
 */
function requiredTierFor(capability) {
  if (WORKING_CAPS.has(capability)) return TIERS.WORKING;
  if (MEDIUM_ADDS.has(capability)) return TIERS.MEDIUM;
  if (EXTENDED_ADDS.has(capability)) return TIERS.EXTENDED;
  return null;
}

function canAccessAll(subscription, capabilities, now = new Date()) {
  return capabilities.every((c) => canAccess(subscription, c, now));
}

/**
 * Convenience: throw HttpsError-friendly object if access is denied. Cloud
 * Function callers can do:
 *
 *   const { HttpsError } = require("firebase-functions/v2/https");
 *   const denied = assertCanAccess(userDoc, CAPABILITIES.generateGrandPrixThinking);
 *   if (denied) throw new HttpsError(denied.code, denied.message, denied.details);
 *
 * Returns null on allow, or { code, message, details } on deny.
 */
function assertCanAccess(subscription, capability, now = new Date()) {
  if (canAccess(subscription, capability, now)) return null;
  const required = requiredTierFor(capability);
  const status = getTierStatus(subscription, now);
  return {
    code: "permission-denied",
    message:
      required && status !== STATUS.PILOT_GRACE && status !== STATUS.PAID_PAST_DUE
        ? `This action requires the ${required} tier.`
        : status === STATUS.PILOT_GRACE
        ? "Pilot grace period: read-only access. Convert to a paid plan to continue."
        : status === STATUS.PAID_PAST_DUE
        ? "Subscription past due. Update your payment method to restore access."
        : "Access denied.",
    details: {
      reason: "TIER_REQUIRED",
      requiredTier: required,
      currentStatus: status,
      capability,
    },
  };
}

module.exports = {
  // Constants
  PILOT_END_ISO,
  PILOT_GRACE_END_ISO,
  TIERS,
  TIER_RANK,
  CAPABILITIES,
  STATUS,
  // Functions
  getTierStatus,
  canAccess,
  canAccessAll,
  requiredTierFor,
  assertCanAccess,
};
