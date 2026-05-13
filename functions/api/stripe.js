/**
 * Stripe Checkout & Webhook Handlers
 *
 * Implements the YDJ pricing, discount, and cohort logic from
 * YDJ_Pricing_Discounts_Consolidation_v2.md.
 *
 * Coupons (auto-applied — no user-entered codes):
 *   IC_WORKING_2026   $35 off forever — annual Working only, in IC window, spots remain
 *   IC_MEDIUM_2026    $75 off forever — annual Medium only, in IC window, spots remain
 *   IC_EXTENDED_2026  $150 off forever — annual Extended only, in IC window, spots remain
 *   TRIAL_FIRSTYEAR_10  10% off, repeating 12 months — at trial → paid conversion
 *   PILOT_MONTHLY_10    10% off forever — pilot accounts on monthly only
 *
 * Stripe Price lookup_keys (one per tier × interval):
 *   working_monthly, working_annual, medium_monthly, medium_annual,
 *   extended_monthly, extended_annual
 */

const Stripe = require("stripe");
const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUPON_IDS = {
  IC_WORKING: "IC_WORKING_2026",
  IC_MEDIUM: "IC_MEDIUM_2026",
  IC_EXTENDED: "IC_EXTENDED_2026",
  TRIAL_FIRSTYEAR: "TRIAL_FIRSTYEAR_10",
  PILOT_MONTHLY: "PILOT_MONTHLY_10",
};

const IC_TIER_COUPONS = {
  working: COUPON_IDS.IC_WORKING,
  medium: COUPON_IDS.IC_MEDIUM,
  extended: COUPON_IDS.IC_EXTENDED,
};

// IC enrollment window: launch through 2026-07-07 (inclusive, end of day UTC).
const IC_WINDOW_CLOSE_ISO = "2026-07-08T00:00:00.000Z";
const IC_COHORT_CAP = 100;
const IC_COHORT_DOC_PATH = "admin/icCohort";

// IC upgrade window: per spec Part 4, IC members upgrading within 6 months of
// their original IC enrollment get the IC rate at the new tier. After
// 6 months, upgrades are at standard pricing and IC is forfeited on the
// new tier.
const IC_UPGRADE_WINDOW_MONTHS = 6;

// Trial: 30 days, Medium tier
const TRIAL_DAYS = 30;
const TRIAL_DEFAULT_LOOKUP_KEY = "medium_monthly";

// Token budgets per tier (monthly)
const TOKEN_BUDGETS = {
  working: 50000,
  medium: 200000,
  extended: 1000000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

const db = admin.firestore();

/** Map a Stripe Price lookup_key to { tier, interval }. */
function parseLookupKey(lookupKey) {
  const map = {
    working_monthly: { tier: "working", interval: "monthly" },
    working_annual: { tier: "working", interval: "annual" },
    medium_monthly: { tier: "medium", interval: "monthly" },
    medium_annual: { tier: "medium", interval: "annual" },
    extended_monthly: { tier: "extended", interval: "monthly" },
    extended_annual: { tier: "extended", interval: "annual" },
  };
  return map[lookupKey] || null;
}

function isWithinICWindow(now = new Date()) {
  return now < new Date(IC_WINDOW_CLOSE_ISO);
}

/**
 * Returns true if an IC member is still inside their 6-month upgrade window.
 * `enrollmentDateIso` is the user's icEnrollmentDate.
 */
function isWithinICUpgradeWindow(enrollmentDateIso, now = new Date()) {
  if (!enrollmentDateIso) return false;
  const enrolled = new Date(enrollmentDateIso);
  if (Number.isNaN(enrolled.getTime())) return false;
  const cutoff = new Date(enrolled);
  cutoff.setUTCMonth(cutoff.getUTCMonth() + IC_UPGRADE_WINDOW_MONTHS);
  return now < cutoff;
}

const TIER_RANK = { working: 1, medium: 2, extended: 3 };

/**
 * Read the IC cohort status. Returns { enrollmentCount, enrollmentCap,
 * spotsRemaining, isOpen, windowCloseDate }.
 */
async function getICCohortStatus() {
  const snap = await db.doc(IC_COHORT_DOC_PATH).get();
  const data = snap.data() || {};
  const enrollmentCount = data.enrollmentCount || 0;
  const enrollmentCap = data.enrollmentCap || IC_COHORT_CAP;
  const spotsRemaining = Math.max(0, enrollmentCap - enrollmentCount);
  const inWindow = isWithinICWindow();
  return {
    enrollmentCount,
    enrollmentCap,
    spotsRemaining,
    isOpen: inWindow && spotsRemaining > 0,
    windowCloseDate: IC_WINDOW_CLOSE_ISO,
    closedReason: !inWindow ? "window_closed" : spotsRemaining === 0 ? "cohort_full" : null,
  };
}

/**
 * Compute eligibility flags for a given user and current cohort state.
 * Returns the discount the system would auto-apply for each lookup_key.
 */
async function computeEligibility(uid) {
  const userSnap = await db.collection("users").doc(uid).get();
  const u = userSnap.data() || {};
  const cohort = await getICCohortStatus();

  const isPilot = !!u.isPilot;
  const isAlreadyIC = !!u.isInitialCenterline && u.icStatus === "active";
  const icEnrollmentDate = u.icEnrollmentDate || null;
  const icTier = u.icTier || null;
  const icUpgradeEligible = isAlreadyIC && isWithinICUpgradeWindow(icEnrollmentDate);
  const trialStarted = !!u.trialStarted;
  const trialConverted = !!u.trialConverted;
  const trialEverUsed = trialStarted || trialConverted;
  const subscriptionActive =
    u.subscriptionStatus === "active" ||
    u.subscriptionStatus === "trialing" ||
    u.subscriptionStatus === "past_due";

  return {
    isPilot,
    isAlreadyIC,
    icEnrollmentDate,
    icTier,
    icUpgradeEligible,
    pilotDiscountActive: !!u.pilotDiscountActive,
    icEligibleNow: !isAlreadyIC && cohort.isOpen,
    trialEligible: !trialEverUsed && !subscriptionActive && isWithinICWindow(),
    cohort,
  };
}

/**
 * Decide which coupon (if any) to apply to a checkout session.
 *
 * Mutual exclusion rules (per Part 8):
 *   - IC + monthly: IC blocked (IC is annual-only)
 *   - IC outside window or after cap: blocked
 *   - Pilot + IC: pilot must pick one (we honor user's explicit choice via flow param)
 *   - Trial converter cannot also receive IC unless they actively chose IC during trial
 *
 * @param {object} eligibility - from computeEligibility
 * @param {string} lookupKey - the price they're checking out
 * @param {object} flow - { mode: "standard" | "trial" | "ic" | "pilot_monthly" }
 * @returns {object} { couponId, reason }  -- couponId may be null
 */
function resolveAutomaticDiscount(eligibility, lookupKey, flow = {}) {
  const parsed = parseLookupKey(lookupKey);
  if (!parsed) return { couponId: null, reason: "invalid_key" };

  const { tier, interval } = parsed;
  const mode = flow.mode || "standard";

  // Trial flow: 10% first-year coupon attaches at signup, applies post-trial
  if (mode === "trial") {
    return { couponId: COUPON_IDS.TRIAL_FIRSTYEAR, reason: "trial_signup" };
  }

  // Explicit IC selection (pilot or new annual signup in window)
  if (mode === "ic") {
    if (interval !== "annual") return { couponId: null, reason: "ic_requires_annual" };
    if (!eligibility.cohort.isOpen) return { couponId: null, reason: eligibility.cohort.closedReason };
    if (eligibility.isAlreadyIC) return { couponId: null, reason: "already_ic" };
    return { couponId: IC_TIER_COUPONS[tier], reason: "ic_enrollment" };
  }

  // Pilot picking the monthly path
  if (mode === "pilot_monthly") {
    if (interval !== "monthly") return { couponId: null, reason: "pilot_monthly_requires_monthly" };
    if (!eligibility.isPilot) return { couponId: null, reason: "not_pilot" };
    return { couponId: COUPON_IDS.PILOT_MONTHLY, reason: "pilot_monthly" };
  }

  // Standard signup: no auto-applied discount
  // (Pilot users defaulting to monthly without explicitly choosing
  // pilot_monthly flow get no discount — they must opt in.)
  return { couponId: null, reason: "standard" };
}

/**
 * Extract billing period bounds from a Subscription. Stripe API 2026-02-25+
 * moved current_period_start/end onto subscription items.
 */
function getPeriodBounds(subscription) {
  const item = subscription.items?.data?.[0];
  const start = subscription.current_period_start ?? item?.current_period_start;
  const end = subscription.current_period_end ?? item?.current_period_end;
  return {
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
}

function resolveTierFromSubscription(subscription) {
  const item = subscription.items?.data?.[0];
  const lookupKey = item?.price?.lookup_key;
  if (lookupKey) {
    const parsed = parseLookupKey(lookupKey);
    if (parsed) return parsed;
  }
  const metadata = item?.price?.metadata || {};
  if (metadata.tier) {
    return {
      tier: metadata.tier,
      interval: item.price.recurring?.interval === "year" ? "annual" : "monthly",
    };
  }
  return { tier: "working", interval: "monthly" };
}

/**
 * Determine which coupon (if any) is attached to a subscription.
 *
 * Webhook payloads of subscriptions include `discounts` as an array of
 * discount IDs (strings) rather than expanded objects, so checking the
 * subscription itself for a specific coupon ID is unreliable. We stamp the
 * resolved couponId into subscription_data.metadata at checkout creation and
 * read it back here.
 */
function subscriptionCouponId(subscription) {
  return subscription.metadata?.couponId || null;
}

function subscriptionHasCoupon(subscription, couponId) {
  return subscriptionCouponId(subscription) === couponId;
}

function subscriptionHasAnyICCoupon(subscription) {
  const id = subscriptionCouponId(subscription);
  return !!id && Object.values(IC_TIER_COUPONS).includes(id);
}

// ---------------------------------------------------------------------------
// 1. Get Pricing Eligibility (onCall)
// ---------------------------------------------------------------------------

/**
 * Returns the user's discount eligibility + current cohort state.
 * Used by the Pricing page to decide which UI variant to render.
 *
 * Output:
 *   {
 *     isPilot, isAlreadyIC, trialEligible, icEligibleNow,
 *     cohort: { enrollmentCount, enrollmentCap, spotsRemaining, isOpen, ... },
 *     icPrices: { working: { annualUSD, savings }, ... },
 *     trial: { tier, days }
 *   }
 */
async function getPricingEligibility(request) {
  const uid = request.auth?.uid;

  // Default response for unauthenticated callers (public pricing page)
  if (!uid) {
    const cohort = await getICCohortStatus();
    return {
      isPilot: false,
      isAlreadyIC: false,
      pilotDiscountActive: false,
      icEligibleNow: cohort.isOpen,
      trialEligible: isWithinICWindow(),
      cohort,
      authenticated: false,
    };
  }

  const eligibility = await computeEligibility(uid);
  return { ...eligibility, authenticated: true };
}

// ---------------------------------------------------------------------------
// 2. Create Checkout Session (onCall)
// ---------------------------------------------------------------------------

/**
 * Input: {
 *   lookupKey: string,
 *   origin?: string,
 *   flow?: "standard" | "trial" | "ic" | "pilot_monthly"
 * }
 * Returns: { url: string }
 */
async function createCheckoutSession(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { lookupKey, flow: flowMode = "standard" } = request.data || {};
  if (!lookupKey || !parseLookupKey(lookupKey)) {
    throw new HttpsError("invalid-argument", "Invalid lookup key");
  }

  const stripe = getStripe();

  // Look up the price by its lookup_key
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    expand: ["data.product"],
  });

  if (!prices.data.length) {
    throw new HttpsError("not-found", `No Stripe price found for key: ${lookupKey}`);
  }

  // Determine eligibility + automatic discount
  const eligibility = await computeEligibility(uid);

  // Trial flow override: trial is always at the Medium monthly price
  let effectiveLookupKey = lookupKey;
  if (flowMode === "trial") {
    if (!eligibility.trialEligible) {
      throw new HttpsError("failed-precondition", "Not eligible for free trial");
    }
    effectiveLookupKey = TRIAL_DEFAULT_LOOKUP_KEY;
    if (effectiveLookupKey !== lookupKey) {
      const trialPrices = await stripe.prices.list({
        lookup_keys: [effectiveLookupKey],
        expand: ["data.product"],
      });
      if (!trialPrices.data.length) {
        throw new HttpsError("not-found", `Trial price ${effectiveLookupKey} missing`);
      }
      prices.data = trialPrices.data;
    }
  }

  const discount = resolveAutomaticDiscount(eligibility, effectiveLookupKey, { mode: flowMode });

  // Block IC explicitly when not eligible
  if (flowMode === "ic" && !discount.couponId) {
    throw new HttpsError(
      "failed-precondition",
      `IC pricing unavailable: ${discount.reason}`
    );
  }
  if (flowMode === "pilot_monthly" && !discount.couponId) {
    throw new HttpsError(
      "failed-precondition",
      `Pilot monthly discount unavailable: ${discount.reason}`
    );
  }

  // Get-or-create Stripe customer
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data() || {};
  let customerId = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { firebaseUID: uid },
      email: request.auth.token?.email || undefined,
    });
    customerId = customer.id;
    await db.collection("users").doc(uid).set(
      { stripeCustomerId: customerId },
      { merge: true }
    );
  }

  const origin = request.data?.origin || "https://your-dressage-journey.web.app";

  const sessionParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: prices.data[0].id, quantity: 1 }],
    success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscription/cancel`,
    // Stripe Tax: collect a billing address at Checkout and compute sales
    // tax for US states where YDJ has nexus. Requires Stripe Tax to be
    // enabled and onboarded in the live Dashboard. `customer_update.address`
    // is required so Checkout can persist the collected address onto the
    // existing customer for renewal invoices.
    automatic_tax: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    subscription_data: {
      metadata: {
        firebaseUID: uid,
        flow: flowMode,
        // Stamp the resolved coupon onto the subscription so webhook handlers
        // can identify the applied discount without expanding `discounts`.
        couponId: discount.couponId || "",
        ...(discount.reason ? { discountReason: discount.reason } : {}),
      },
    },
  };

  // Trial: 30-day Stripe-managed trial with payment method required up front
  if (flowMode === "trial") {
    sessionParams.subscription_data.trial_period_days = TRIAL_DAYS;
    sessionParams.subscription_data.trial_settings = {
      end_behavior: { missing_payment_method: "cancel" },
    };
    sessionParams.payment_method_collection = "always";
  }

  // Apply auto-resolved coupon, if any
  if (discount.couponId) {
    sessionParams.discounts = [{ coupon: discount.couponId }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url };
}

// ---------------------------------------------------------------------------
// 3. Change Subscription Plan (onCall)
// ---------------------------------------------------------------------------

/**
 * In-place subscription update with proper coupon swap. The Stripe Customer
 * Portal doesn't know about our IC or pilot coupons, so any tier change that
 * needs to preserve a custom discount must come through here.
 *
 * Supported flows:
 *   - "ic_upgrade":           IC member upgrading to a higher annual tier
 *                             within the 6-month upgrade window. Swaps to
 *                             the new tier's IC coupon.
 *   - "pilot_monthly_upgrade": Pilot user with active pilot discount upgrading
 *                              to a higher monthly tier. Re-applies
 *                              PILOT_MONTHLY_10 on the new price.
 *
 * Input: { targetLookupKey: string, flow: "ic_upgrade" | "pilot_monthly_upgrade" }
 * Returns: { success: true, subscriptionId, fromTier, toTier }
 */
async function changeSubscriptionPlan(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const { targetLookupKey, flow } = request.data || {};
  if (!flow) throw new HttpsError("invalid-argument", "flow is required");
  if (flow !== "ic_upgrade" && flow !== "pilot_monthly_upgrade") {
    throw new HttpsError("invalid-argument", `Unknown flow: ${flow}`);
  }

  const target = parseLookupKey(targetLookupKey);
  if (!target) throw new HttpsError("invalid-argument", "Invalid targetLookupKey");

  const userSnap = await db.collection("users").doc(uid).get();
  const u = userSnap.data() || {};

  if (!u.stripeSubscriptionId) {
    throw new HttpsError("failed-precondition", "No active subscription to change");
  }

  let newCouponId;
  let metaFlow;
  let metaReason;
  let fromTierLabel;

  if (flow === "ic_upgrade") {
    if (!u.isInitialCenterline || u.icStatus !== "active") {
      throw new HttpsError("failed-precondition", "Not an active IC member");
    }
    if (!isWithinICUpgradeWindow(u.icEnrollmentDate)) {
      throw new HttpsError(
        "failed-precondition",
        "IC upgrade window has expired (6 months from enrollment)"
      );
    }
    if (target.interval !== "annual") {
      throw new HttpsError("failed-precondition", "IC upgrade requires annual billing");
    }
    const fromRank = TIER_RANK[u.icTier] || 0;
    const toRank = TIER_RANK[target.tier] || 0;
    if (toRank <= fromRank) {
      throw new HttpsError(
        "failed-precondition",
        "IC upgrade must be to a higher tier (use the billing portal to downgrade)"
      );
    }
    newCouponId = IC_TIER_COUPONS[target.tier];
    metaFlow = "ic_upgrade";
    metaReason = "ic_tier_upgrade_within_window";
    fromTierLabel = u.icTier;
  } else {
    // pilot_monthly_upgrade
    if (!u.isPilot) {
      throw new HttpsError("failed-precondition", "Not a pilot account");
    }
    if (!u.pilotDiscountActive) {
      throw new HttpsError(
        "failed-precondition",
        "Pilot discount is not active (lost on lapse — cannot be reinstated)"
      );
    }
    if (target.interval !== "monthly") {
      throw new HttpsError(
        "failed-precondition",
        "Pilot monthly upgrade requires monthly billing (annual moves through IC enrollment instead)"
      );
    }
    if (u.subscriptionInterval !== "monthly") {
      throw new HttpsError(
        "failed-precondition",
        "Current subscription is not monthly"
      );
    }
    const fromRank = TIER_RANK[u.subscriptionTier] || 0;
    const toRank = TIER_RANK[target.tier] || 0;
    if (toRank <= fromRank) {
      throw new HttpsError(
        "failed-precondition",
        "Pilot monthly upgrade must be to a higher tier (use the billing portal to downgrade)"
      );
    }
    newCouponId = COUPON_IDS.PILOT_MONTHLY;
    metaFlow = "pilot_monthly_upgrade";
    metaReason = "pilot_tier_upgrade_monthly";
    fromTierLabel = u.subscriptionTier;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(u.stripeSubscriptionId, {
    expand: ["items.data.price"],
  });

  const prices = await stripe.prices.list({ lookup_keys: [targetLookupKey] });
  if (!prices.data.length) {
    throw new HttpsError("not-found", `No Stripe price found for ${targetLookupKey}`);
  }
  const newPriceId = prices.data[0].id;
  const item = subscription.items.data[0];

  await stripe.subscriptions.update(u.stripeSubscriptionId, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "create_prorations",
    discounts: [{ coupon: newCouponId }],
    metadata: {
      ...subscription.metadata,
      flow: metaFlow,
      couponId: newCouponId,
      discountReason: metaReason,
    },
  });

  return {
    success: true,
    subscriptionId: u.stripeSubscriptionId,
    fromTier: fromTierLabel,
    toTier: target.tier,
  };
}

// ---------------------------------------------------------------------------
// 4. Billing Portal (onCall)
// ---------------------------------------------------------------------------

async function createPortalSession(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

  const userDoc = await db.collection("users").doc(uid).get();
  const customerId = userDoc.data()?.stripeCustomerId;

  if (!customerId) {
    throw new HttpsError("failed-precondition", "No Stripe customer found for this account");
  }

  const origin = request.data?.origin || "https://your-dressage-journey.web.app";
  const stripe = getStripe();

  // Use our locked-down portal configuration if one has been seeded by
  // scripts/configureBillingPortal.cjs. The locked-down config disables
  // subscription_update so users can't bypass our coupon logic by switching
  // plans inside the portal. Falls back to Stripe's account default if the
  // doc/field is missing.
  let configurationId = null;
  try {
    const cfgSnap = await db.doc("admin/stripeConfig").get();
    configurationId = cfgSnap.data()?.billingPortalConfigId || null;
  } catch (err) {
    console.warn("Failed to read /admin/stripeConfig:", err.message);
  }

  const params = {
    customer: customerId,
    return_url: `${origin}/settings`,
  };
  if (configurationId) params.configuration = configurationId;

  const session = await stripe.billingPortal.sessions.create(params);
  return { url: session.url };
}

// ---------------------------------------------------------------------------
// 4. Webhook Dispatcher
// ---------------------------------------------------------------------------

async function handleWebhook(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    const rawBody = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Idempotency: Stripe retries on non-2xx and occasionally double-delivers
  // successful events. Without this guard, retries can re-claim IC spots,
  // double-reset usage counters, and double-write subscription state. We
  // short-circuit only when the prior delivery completed; if a previous
  // attempt failed mid-handler (status != "completed"), we reprocess.
  const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
  try {
    const existing = await eventRef.get();
    if (existing.exists && existing.data()?.status === "completed") {
      console.log(`Duplicate webhook ${event.id} (${event.type}) — already completed`);
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    await eventRef.set(
      {
        type: event.type,
        livemode: event.livemode,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
      },
      { merge: true }
    );
  } catch (err) {
    // Firestore unavailable — log and fall through to process. Better to
    // double-process on a rare retry than drop the event entirely.
    console.error(`Failed to read/record webhook event ${event.id}:`, err);
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await onSubscriptionCreated(event.data.object);
        break;
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await onPaymentSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await onPaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    await eventRef.set(
      { processedAt: admin.firestore.FieldValue.serverTimestamp(), status: "completed" },
      { merge: true }
    );
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

// ---------------------------------------------------------------------------
// Webhook Handlers
// ---------------------------------------------------------------------------

async function resolveFirebaseUID(subscription) {
  const uid = subscription.metadata?.firebaseUID;
  if (uid) return uid;

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (customer.metadata?.firebaseUID) return customer.metadata.firebaseUID;

  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", subscription.customer)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;

  console.error("Could not resolve Firebase UID for customer:", subscription.customer);
  return null;
}

/**
 * Atomically claim a spot in the IC cohort. Returns true on success, false if
 * the cohort filled between checkout and the webhook.
 *
 * Per spec Part 4: "Atomic Firestore transaction at successful payment confirms
 * the spot."
 */
async function claimICCohortSpot(uid, tier) {
  const cohortRef = db.doc(IC_COHORT_DOC_PATH);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(cohortRef);
      const data = snap.data() || {};
      const enrollmentCount = data.enrollmentCount || 0;
      const enrollmentCap = data.enrollmentCap || IC_COHORT_CAP;

      if (enrollmentCount >= enrollmentCap) {
        return { ok: false, reason: "cohort_full", enrollmentCount, enrollmentCap };
      }
      if (!isWithinICWindow()) {
        return { ok: false, reason: "window_closed", enrollmentCount, enrollmentCap };
      }

      const newCount = enrollmentCount + 1;
      const update = {
        enrollmentCount: newCount,
        enrollmentCap,
        windowCloseDate: data.windowCloseDate || IC_WINDOW_CLOSE_ISO,
        windowOpenDate: data.windowOpenDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (newCount >= enrollmentCap) {
        update.enrollmentClosedAt = new Date().toISOString();
      }
      tx.set(cohortRef, update, { merge: true });
      return { ok: true, cohortNumber: newCount, enrollmentCap };
    });
  } catch (err) {
    console.error(`IC cohort claim failed for ${uid} (${tier}):`, err);
    return { ok: false, reason: "transaction_error" };
  }
}

/**
 * Strip the discount from a subscription and clear the metadata stamp.
 * Used when an IC claim fails or when an IC user disqualifies via downgrade
 * or switch to monthly.
 */
async function removeSubscriptionDiscount(subscriptionId) {
  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
      discounts: [],
      metadata: { couponId: "" },
    });
  } catch (err) {
    console.error(`Failed to remove discount from ${subscriptionId}:`, err);
  }
}

/**
 * customer.subscription.created
 *   - Set tier, status, period bounds, token budget
 *   - If IC coupon present, atomically claim cohort spot (or revert)
 *   - If pilot monthly coupon present, mark pilotDiscountActive
 *   - If trial coupon present, mark trial flags
 */
async function onSubscriptionCreated(subscription) {
  const uid = await resolveFirebaseUID(subscription);
  if (!uid) return;

  const { tier, interval } = resolveTierFromSubscription(subscription);
  const { start, end } = getPeriodBounds(subscription);
  const flow = subscription.metadata?.flow || "standard";
  const status = subscription.status === "active" ? "active" : subscription.status;

  const baseUpdate = {
    subscriptionTier: tier,
    subscriptionStatus: status,
    subscriptionInterval: interval,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    tokensUsedThisPeriod: 0,
    tokenBudget: TOKEN_BUDGETS[tier] || TOKEN_BUDGETS.working,
    showPlansCreatedThisYear: 0,
    showPlanYearWindowStart: new Date().toISOString(),
    midCycleRefreshUsed: { gpt: false, physical: false },
  };

  // Trial flag handling
  if (subscription.status === "trialing" || flow === "trial") {
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
    baseUpdate.trialStarted = true;
    baseUpdate.trialStartDate = new Date().toISOString();
    baseUpdate.trialEndDate = trialEnd;
    baseUpdate.trialConverted = false;
  }

  // IC enrollment handling — atomic claim
  if (subscriptionHasAnyICCoupon(subscription)) {
    if (interval !== "annual") {
      // Sanity guard: IC should never be on a monthly sub
      console.warn(`IC coupon found on monthly sub ${subscription.id} — removing`);
      await removeSubscriptionDiscount(subscription.id);
    } else {
      const claim = await claimICCohortSpot(uid, tier);
      if (claim.ok) {
        baseUpdate.isInitialCenterline = true;
        baseUpdate.icEnrollmentDate = new Date().toISOString();
        baseUpdate.icTier = tier;
        baseUpdate.icStatus = "active";
        baseUpdate.icCohortNumber = claim.cohortNumber;
      } else {
        console.warn(`IC claim failed for ${uid} (${claim.reason}) — removing coupon`);
        await removeSubscriptionDiscount(subscription.id);
      }
    }
  }

  // Pilot monthly discount handling
  if (subscriptionHasCoupon(subscription, COUPON_IDS.PILOT_MONTHLY)) {
    baseUpdate.pilotDiscountActive = true;
  }

  // Trial→paid converter handling: auto-applied at trial signup, no-op here
  // (TRIAL_FIRSTYEAR_10 just rides on the subscription.)

  await db.collection("users").doc(uid).set(baseUpdate, { merge: true });

  console.log(
    `Subscription created: ${tier}/${interval} for user ${uid} (flow=${flow}, status=${status})`
  );
}

/**
 * customer.subscription.updated
 *   - Tier/interval changes update tokenBudget
 *   - Status change to active out of trialing → trialConverted=true
 *   - Detect IC-invalidating changes (downgrade tier, switch to monthly)
 */
async function onSubscriptionUpdated(subscription) {
  const uid = await resolveFirebaseUID(subscription);
  if (!uid) return;

  const { tier, interval } = resolveTierFromSubscription(subscription);
  const { start, end } = getPeriodBounds(subscription);

  const userSnap = await db.collection("users").doc(uid).get();
  const u = userSnap.data() || {};

  const update = {
    subscriptionTier: tier,
    subscriptionStatus: subscription.status,
    subscriptionInterval: interval,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    tokenBudget: TOKEN_BUDGETS[tier] || TOKEN_BUDGETS.working,
  };

  // Trial → paid conversion
  if (
    u.subscriptionStatus === "trialing" &&
    subscription.status === "active" &&
    !u.trialConverted
  ) {
    update.trialConverted = true;
    // 10% first-year discount expires 12 months from today
    const oneYearOut = new Date();
    oneYearOut.setUTCFullYear(oneYearOut.getUTCFullYear() + 1);
    update.trialConverter10PctYearEnd = oneYearOut.toISOString();
  }

  // IC continuity rules (Part 4):
  //   - Downgrade → loses IC entirely
  //   - Switch to monthly → loses IC entirely
  //   - Upgrade within 6 months (with new IC coupon) → icTier updates
  //   - Upgrade after 6 months / standard upgrade → IC forfeited on new tier
  if (u.isInitialCenterline && u.icStatus === "active") {
    const fromRank = TIER_RANK[u.icTier] || 0;
    const toRank = TIER_RANK[tier] || 0;
    const downgrade = toRank < fromRank;
    const upgrade = toRank > fromRank;
    const switchedToMonthly = interval === "monthly";
    const stillHasICCoupon = subscriptionHasAnyICCoupon(subscription);
    const inUpgradeWindow = isWithinICUpgradeWindow(u.icEnrollmentDate);

    if (downgrade || switchedToMonthly) {
      update.icStatus = "lapsed";
      update.icLapseReason = downgrade ? "downgrade" : "switched_to_monthly";
      update.icLapsedAt = new Date().toISOString();
      if (stillHasICCoupon) {
        await removeSubscriptionDiscount(subscription.id);
      }
    } else if (upgrade && stillHasICCoupon && inUpgradeWindow) {
      // IC-to-IC tier upgrade within window → keep IC, just update icTier.
      // cohortNumber and icEnrollmentDate are preserved.
      update.icTier = tier;
    } else if (upgrade && !stillHasICCoupon) {
      // Upgrade without an IC coupon → either the user upgraded after the
      // 6-month window (standard pricing on new tier) or the portal applied
      // a tier change without our IC flow. Either way, IC is forfeited on
      // the new tier per spec.
      update.icStatus = "lapsed";
      update.icLapseReason = inUpgradeWindow
        ? "upgrade_without_ic_flow"
        : "upgrade_after_window";
      update.icLapsedAt = new Date().toISOString();
    }
    // else: no tier change (e.g. status-only update) — leave IC alone
  }

  await db.collection("users").doc(uid).set(update, { merge: true });

  console.log(
    `Subscription updated: ${tier}/${interval} for user ${uid} (status: ${subscription.status})`
  );
}

/**
 * customer.subscription.deleted
 *   - status → canceled
 *   - IC users: lose IC permanently
 *   - Pilot monthly users: lose pilot discount permanently
 */
async function onSubscriptionDeleted(subscription) {
  const uid = await resolveFirebaseUID(subscription);
  if (!uid) return;

  const { end } = getPeriodBounds(subscription);
  const userSnap = await db.collection("users").doc(uid).get();
  const u = userSnap.data() || {};
  const now = new Date().toISOString();

  const update = {
    subscriptionStatus: "canceled",
    currentPeriodEnd: end,
  };

  if (u.isInitialCenterline && u.icStatus === "active") {
    update.icStatus = "lapsed";
    update.icLapseReason = "canceled";
    update.icLapsedAt = now;
  }

  if (u.pilotDiscountActive) {
    update.pilotDiscountActive = false;
    update.pilotDiscountLapsedAt = now;
  }

  await db.collection("users").doc(uid).set(update, { merge: true });
  console.log(`Subscription canceled for user ${uid}, access through ${end}`);
}

/**
 * invoice.payment_succeeded
 * Reset per-period counters and advance the billing window.
 */
async function onPaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription, {
    expand: ["items.data.price"],
  });

  const uid = await resolveFirebaseUID(subscription);
  if (!uid) return;

  const { start, end } = getPeriodBounds(subscription);

  await db.collection("users").doc(uid).set(
    {
      subscriptionStatus: "active",
      tokensUsedThisPeriod: 0,
      midCycleRefreshUsed: { gpt: false, physical: false },
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
    { merge: true }
  );

  console.log(`Payment succeeded for user ${uid}, counters reset`);
}

/**
 * invoice.payment_failed
 *   - status → past_due
 *   - 14-day failure → IC/pilot lapse handled by a separate scheduled job
 *     (see TODO in implementation brief; not in initial commit)
 */
async function onPaymentFailed(invoice) {
  if (!invoice.subscription) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const uid = await resolveFirebaseUID(subscription);
  if (!uid) return;

  await db.collection("users").doc(uid).set(
    { subscriptionStatus: "past_due" },
    { merge: true }
  );

  console.log(`Payment failed for user ${uid}, status set to past_due`);
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  changeSubscriptionPlan,
  handleWebhook,
  getPricingEligibility,
  // exported for tests / scripts
  COUPON_IDS,
  IC_TIER_COUPONS,
  IC_COHORT_CAP,
  IC_COHORT_DOC_PATH,
  IC_WINDOW_CLOSE_ISO,
  IC_UPGRADE_WINDOW_MONTHS,
  TOKEN_BUDGETS,
  TRIAL_DAYS,
  getICCohortStatus,
};
