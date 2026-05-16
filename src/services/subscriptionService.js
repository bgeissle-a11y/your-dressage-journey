/**
 * Subscription Service
 *
 * Frontend wrappers for Stripe subscription Cloud Functions and Firestore
 * subscription state. See YDJ_Pricing_Discounts_Consolidation_v2.md.
 */

import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../firebase-config';

// IC enrollment window close (matches functions/api/stripe.js IC_WINDOW_CLOSE_ISO)
export const IC_WINDOW_CLOSE_ISO = '2026-07-08T00:00:00.000Z';

// Tier definitions: standard pricing, IC pricing, features
export const TIERS = {
  working: {
    name: 'Working',
    monthlyPrice: 30,
    annualPrice: 300,
    annualMonthly: 25,
    annualSavings: 60,
    icAnnualPrice: 265,
    icDiscount: 35,
    pilotMonthlyPrice: 27,
    position: 'Your AI coaching foundation',
    features: [
      'All data entry forms',
      'Multi-Voice Coaching',
      'Journey Map (12-month history)',
      'Weekly Focus',
      'Weekly Coach Brief',
      "Learn section & Rider's Toolkit",
    ],
    notIncluded: [
      'Grand Prix Thinking',
      'Physical Guidance',
      'Show Planner',
      'Visualization Scripts',
      'Practice Card',
      'Readiness Snapshot',
    ],
  },
  medium: {
    name: 'Medium',
    monthlyPrice: 50,
    annualPrice: 500,
    annualMonthly: 41.67,
    annualSavings: 100,
    icAnnualPrice: 425,
    icDiscount: 75,
    pilotMonthlyPrice: 45,
    position: 'For the serious adult amateur',
    popular: true,
    features: [
      'Everything in Working, plus:',
      'Grand Prix Thinking (monthly cycle)',
      'Physical Guidance (monthly cycle)',
      'Show Planner (10 shows/year)',
      'Journey Map (full history)',
      'Visualization Scripts',
      'Practice Card',
      'Readiness Snapshot',
    ],
    notIncluded: [],
  },
  extended: {
    name: 'Extended',
    monthlyPrice: 130,
    annualPrice: 1300,
    annualMonthly: 108.33,
    annualSavings: 260,
    icAnnualPrice: 1150,
    icDiscount: 150,
    pilotMonthlyPrice: 117,
    position: 'Unrestricted access for high-volume riders',
    features: [
      'Everything in Medium, plus:',
      'Unrestricted GPT & Physical Guidance',
      'Unlimited Show Planner',
      'Priority processing',
    ],
    notIncluded: [],
  },
};

// Stripe Price lookup_keys (must match what's configured in Stripe)
export const LOOKUP_KEYS = {
  working_monthly: 'working_monthly',
  working_annual: 'working_annual',
  medium_monthly: 'medium_monthly',
  medium_annual: 'medium_annual',
  extended_monthly: 'extended_monthly',
  extended_annual: 'extended_annual',
};

/**
 * Stripe coupon IDs — for reference. These must be created in Stripe with
 * exactly these IDs. The server applies them automatically; users never
 * enter codes.
 */
export const COUPON_IDS = {
  IC_WORKING: 'IC_WORKING_2026',
  IC_MEDIUM: 'IC_MEDIUM_2026',
  IC_EXTENDED: 'IC_EXTENDED_2026',
  TRIAL_FIRSTYEAR: 'TRIAL_FIRSTYEAR_10',
  PILOT_MONTHLY: 'PILOT_MONTHLY_10',
};

export const IC_COHORT_DOC_PATH = ['admin', 'icCohort'];

/**
 * Create a Stripe Checkout Session and return the redirect URL.
 *
 * @param {string} lookupKey - e.g. "medium_annual"
 * @param {object} opts
 * @param {"standard"|"trial"|"ic"|"pilot_monthly"} [opts.flow="standard"]
 *   - "standard": no auto-discount
 *   - "trial": 30-day free trial; TRIAL_FIRSTYEAR_10 attaches for first year
 *   - "ic": Initial Centerline enrollment (annual only, in window, spots remain)
 *   - "pilot_monthly": pilot user choosing the monthly path with 10% lifetime
 * @returns {Promise<{url: string}>}
 */
export async function createCheckoutSession(lookupKey, opts = {}) {
  const fn = httpsCallable(functions, 'createCheckoutSession');
  const result = await fn({
    lookupKey,
    flow: opts.flow || 'standard',
    origin: window.location.origin,
  });
  return result.data;
}

export async function createPortalSession() {
  const fn = httpsCallable(functions, 'createPortalSession');
  const result = await fn({ origin: window.location.origin });
  return result.data;
}

/**
 * Change an active subscription's tier in place. Currently only supports
 * the `ic_upgrade` flow (IC member upgrading to a higher tier within their
 * 6-month upgrade window). Standard tier changes go through the billing
 * portal.
 *
 * @param {string} targetLookupKey - e.g. "extended_annual"
 * @param {string} flow - "ic_upgrade"
 * @returns {Promise<{success: boolean, subscriptionId: string, fromTier: string, toTier: string}>}
 */
export async function changeSubscriptionPlan(targetLookupKey, flow) {
  const fn = httpsCallable(functions, 'changeSubscriptionPlan');
  const result = await fn({ targetLookupKey, flow });
  return result.data;
}

/**
 * Get the user's pricing eligibility (IC, trial, pilot) and live cohort state.
 * Anonymous callers receive a public-default eligibility response.
 *
 * @returns {Promise<{
 *   isPilot: boolean,
 *   isAlreadyIC: boolean,
 *   pilotDiscountActive: boolean,
 *   icEligibleNow: boolean,
 *   trialEligible: boolean,
 *   cohort: {
 *     enrollmentCount: number,
 *     enrollmentCap: number,
 *     spotsRemaining: number,
 *     isOpen: boolean,
 *     windowCloseDate: string,
 *     closedReason: string|null,
 *   },
 *   authenticated: boolean,
 * }>}
 */
export async function getPricingEligibility() {
  const fn = httpsCallable(functions, 'getPricingEligibility');
  const result = await fn({});
  return result.data;
}

/**
 * Subscribe to live IC cohort changes (for the spots-remaining counter).
 * Reads /admin/icCohort directly via Firestore — public-readable per rules.
 *
 * @param {(cohort: {enrollmentCount, enrollmentCap, spotsRemaining, isOpen}) => void} callback
 * @returns {function} unsubscribe
 */
export function onCohortStatusChange(callback) {
  const ref = doc(db, ...IC_COHORT_DOC_PATH);
  return onSnapshot(ref, (snap) => {
    const data = snap.data() || {};
    const enrollmentCount = data.enrollmentCount || 0;
    const enrollmentCap = data.enrollmentCap || 100;
    const spotsRemaining = Math.max(0, enrollmentCap - enrollmentCount);
    const inWindow = new Date() < new Date(IC_WINDOW_CLOSE_ISO);
    callback({
      enrollmentCount,
      enrollmentCap,
      spotsRemaining,
      isOpen: inWindow && spotsRemaining > 0,
      windowCloseDate: data.windowCloseDate || IC_WINDOW_CLOSE_ISO,
    });
  });
}

/**
 * Subscribe to real-time subscription status changes for a user.
 */
export function onSubscriptionChange(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.data() || {};
    callback({
      tier: data.subscriptionTier || 'none',
      status: data.subscriptionStatus || 'none',
      interval: data.subscriptionInterval || null,
      periodEnd: data.currentPeriodEnd || null,
      tokensUsed: data.tokensUsedThisPeriod || 0,
      tokenBudget: data.tokenBudget || 0,
      isInitialCenterline: !!data.isInitialCenterline,
      icTier: data.icTier || null,
      icStatus: data.icStatus || null,
      icEnrollmentDate: data.icEnrollmentDate || null,
      icCohortNumber: data.icCohortNumber || null,
      isPilot: !!data.isPilot,
      pilotDiscountActive: !!data.pilotDiscountActive,
      trialStarted: !!data.trialStarted,
      trialEndDate: data.trialEndDate || null,
      trialConverted: !!data.trialConverted,
      isFounder: !!data.isFounder,
    });
  });
}
