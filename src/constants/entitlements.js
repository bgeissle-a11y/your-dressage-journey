/**
 * Entitlements — Tier × Capability access control
 *
 * Single source of truth for "can this user do X?" decisions across the app.
 * Use `canAccess(subscription, capability)` everywhere instead of hand-rolling
 * tier checks; that way adding/moving a capability is a one-line change.
 *
 * Mirror: functions/lib/entitlements.js — keep the two in sync.
 *
 * Three layers compose into a final decision:
 *   1. getTierStatus(subscription, now) — derives a status string from the
 *      raw subscription record + the current date (handles pilot grace, etc.)
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
// Pilot ends end-of-day 2026-05-15. Grace period runs through 2026-07-07.
// On 2026-07-08 unconverted pilots become 'pilot-expired'.
export const PILOT_END_ISO = '2026-05-15T23:59:59.999Z';
export const PILOT_GRACE_END_ISO = '2026-07-07T23:59:59.999Z';

// ─── Tier identifiers (must match Firestore subscriptionTier values) ───────
export const TIERS = {
  NONE: 'none',
  WORKING: 'working',
  MEDIUM: 'medium',
  EXTENDED: 'extended',
};

// Used for upgrade-suggestion logic. Pilot is rank 0 because access is gated
// by status, not by rank comparison.
export const TIER_RANK = {
  none: 0,
  working: 1,
  medium: 2,
  extended: 3,
};

// ─── Capability registry ──────────────────────────────────────────────────
// Naming convention: capability strings are lowerCamelCase verbs.
//   create*   → write a new entry to Firestore
//   view*     → read existing data / cached AI output
//   generate* → trigger a Cloud Function (Claude API call)
//
// `view*` capabilities pass during pilot-grace; `create*` and `generate*`
// do not. Add new capabilities here, then map them to a tier below.
export const CAPABILITIES = {
  // Profile/setup
  createRiderProfile: 'createRiderProfile',
  createHorseProfile: 'createHorseProfile',

  // Data entry forms
  createDebrief: 'createDebrief',
  createReflection: 'createReflection',
  createObservation: 'createObservation',
  createJourneyEvent: 'createJourneyEvent',
  createRiderAssessment: 'createRiderAssessment',
  createPhysicalAssessment: 'createPhysicalAssessment',
  createHorseHealthEntry: 'createHorseHealthEntry',
  createRiderHealthEntry: 'createRiderHealthEntry',
  createShowPrep: 'createShowPrep',

  // AI outputs — view (cached/historical)
  viewJourneyMap: 'viewJourneyMap',
  viewCoaching: 'viewCoaching',
  viewDataVisualizations: 'viewDataVisualizations',
  viewGrandPrixThinking: 'viewGrandPrixThinking',
  viewPhysicalGuidance: 'viewPhysicalGuidance',
  viewShowPrepPlan: 'viewShowPrepPlan',

  // AI outputs — generate (Cloud Function call)
  generateJourneyMap: 'generateJourneyMap',
  generateCoaching: 'generateCoaching',
  generateDataVisualizations: 'generateDataVisualizations',
  generateGrandPrixThinking: 'generateGrandPrixThinking',
  generatePhysicalGuidance: 'generatePhysicalGuidance',
  generateShowPrepPlan: 'generateShowPrepPlan',
  generateVisualizationScript: 'generateVisualizationScript',

  // Mid-cycle regeneration (Extended tier only). Standard tier can only
  // regen on cycle expiry — enforced at the cycleState layer.
  regenerateGrandPrixThinking: 'regenerateGrandPrixThinking',
  regeneratePhysicalGuidance: 'regeneratePhysicalGuidance',
};

// ─── Tier → capability map ────────────────────────────────────────────────
// Each tier set lists ONLY what that tier adds on top of the previous tier.
// `effectiveCapsForTier()` walks the chain: extended ⊇ medium ⊇ working.
//
// Pilot status is handled separately in canAccess() — pilots get the union
// of all capabilities, not a tier expansion.

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
  if (tier === TIERS.WORKING || tier === TIERS.MEDIUM || tier === TIERS.EXTENDED) {
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
// Possible statuses returned by getTierStatus():
//   'founder'       — Barb's founder account, unconditional full access
//   'pilot'         — pilot user, before pilot end → full access
//   'pilot-grace'   — pilot user, May 16 – Jul 7 → read-only existing data
//   'pilot-expired' — pilot user past grace, no paid sub → blocked
//   'paid-active'   — paid subscriber in good standing
//   'paid-trialing' — trial user (full tier access)
//   'paid-past-due' — payment issue (soft block: views only)
//   'paid-canceled' — canceled, period ended → blocked
//   'none'          — no subscription, not a pilot → blocked
export const STATUS = {
  FOUNDER: 'founder',
  PILOT: 'pilot',
  PILOT_GRACE: 'pilot-grace',
  PILOT_EXPIRED: 'pilot-expired',
  PAID_ACTIVE: 'paid-active',
  PAID_TRIALING: 'paid-trialing',
  PAID_PAST_DUE: 'paid-past-due',
  PAID_CANCELED: 'paid-canceled',
  NONE: 'none',
};

export function getTierStatus(subscription, now = new Date()) {
  if (!subscription) return STATUS.NONE;

  // Founder flag is checked first and unconditionally — Barb keeps full
  // access regardless of any Stripe state, pilot dates, or migrations.
  if (subscription.isFounder === true) return STATUS.FOUNDER;

  const tier = subscription.tier || TIERS.NONE;
  const status = subscription.status || 'none';

  // Paid subscription takes precedence over pilot flag — a pilot who has
  // since converted should be treated as a paid subscriber.
  if (tier !== TIERS.NONE) {
    if (status === 'trialing') return STATUS.PAID_TRIALING;
    if (status === 'active') return STATUS.PAID_ACTIVE;
    if (status === 'past_due' || status === 'unpaid') return STATUS.PAID_PAST_DUE;
    if (status === 'canceled') return STATUS.PAID_CANCELED;
  }

  // Pilot lifecycle (date-driven, no migration needed)
  if (subscription.isPilot) {
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
 * Decide whether a user can perform a capability.
 *
 * @param {object} subscription - Shape from useSubscription() / Firestore user doc
 * @param {string} capability - One of CAPABILITIES.*
 * @param {Date} [now] - Injectable for tests
 * @returns {boolean}
 */
export function canAccess(subscription, capability, now = new Date()) {
  if (!ALL_CAPABILITIES.has(capability)) {
    // Unknown capability — fail closed.
    return false;
  }

  const status = getTierStatus(subscription, now);
  const isViewCap = capability.startsWith('view');

  switch (status) {
    case STATUS.FOUNDER:
      return true; // founder gets everything, always

    case STATUS.PILOT:
      return true; // pilots get everything

    case STATUS.PILOT_GRACE:
      return isViewCap;

    case STATUS.PILOT_EXPIRED:
      return false;

    case STATUS.PAID_ACTIVE:
    case STATUS.PAID_TRIALING:
      return effectiveCapsForTier(subscription.tier).has(capability);

    case STATUS.PAID_PAST_DUE:
      return isViewCap;

    case STATUS.PAID_CANCELED:
    case STATUS.NONE:
    default:
      return false;
  }
}

// ─── Helper: required tier for a capability (for upgrade CTAs) ────────────
/**
 * What's the lowest paid tier that grants this capability?
 *
 * @param {string} capability
 * @returns {'working'|'medium'|'extended'|null}
 */
export function requiredTierFor(capability) {
  if (WORKING_CAPS.has(capability)) return TIERS.WORKING;
  if (MEDIUM_ADDS.has(capability)) return TIERS.MEDIUM;
  if (EXTENDED_ADDS.has(capability)) return TIERS.EXTENDED;
  return null;
}

// ─── Helper: bulk capability check ────────────────────────────────────────
/**
 * Returns true only if ALL listed capabilities are granted.
 */
export function canAccessAll(subscription, capabilities, now = new Date()) {
  return capabilities.every((c) => canAccess(subscription, c, now));
}

// ─── Helper: status label for UX ──────────────────────────────────────────
/**
 * Short human-readable label for the status. UI components can use this
 * verbatim or as a key for their own labels.
 */
export function statusLabel(status) {
  switch (status) {
    case STATUS.FOUNDER: return 'Founder';
    case STATUS.PILOT: return 'Pilot';
    case STATUS.PILOT_GRACE: return 'Pilot (grace period)';
    case STATUS.PILOT_EXPIRED: return 'Pilot ended';
    case STATUS.PAID_ACTIVE: return 'Active';
    case STATUS.PAID_TRIALING: return 'Trial';
    case STATUS.PAID_PAST_DUE: return 'Payment issue';
    case STATUS.PAID_CANCELED: return 'Canceled';
    default: return 'Inactive';
  }
}
