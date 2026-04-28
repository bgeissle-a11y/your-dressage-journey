/**
 * Reset subscription state for testing — Stripe + Firestore.
 *
 * Modes:
 *   node resetTestUser.cjs                   # dry-run, list active Stripe subs
 *   node resetTestUser.cjs --commit          # cancel ALL active Stripe subs and
 *                                              reset their owners in Firestore
 *   node resetTestUser.cjs --uid <uid>       # dry-run a single user
 *   node resetTestUser.cjs --uid <uid> --commit
 *
 * What this touches (per affected user):
 *   - Stripe: cancels every active/trialing/past_due subscription on the
 *     customer, then deletes the Stripe customer (test-mode only).
 *   - Firestore /users/{uid}: clears ONLY subscription/IC/trial/pilot-discount
 *     fields. Profile, isPilot, riderProfile, debriefs, etc. are untouched.
 *   - /admin/icCohort: decrements enrollmentCount if the user had an active
 *     IC enrollment before reset.
 *
 * Stripe key is pulled from the deployed Firebase secret (STRIPE_SECRET_KEY)
 * via the Firebase CLI — no key is stored in repo or .env.
 */

const admin = require("firebase-admin");
const path = require("path");
const { execSync } = require("child_process");

// Use the Stripe SDK installed in functions/
const Stripe = require(path.join(__dirname, "..", "functions", "node_modules", "stripe"));

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const uidIndex = args.indexOf("--uid");
const TARGET_UID = uidIndex >= 0 ? args[uidIndex + 1] : null;

const FIELDS_TO_CLEAR = [
  "subscriptionTier",
  "subscriptionStatus",
  "subscriptionInterval",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "currentPeriodStart",
  "currentPeriodEnd",
  "tokensUsedThisPeriod",
  "tokenBudget",
  "showPlansCreatedThisYear",
  "showPlanYearWindowStart",
  "midCycleRefreshUsed",
  "isInitialCenterline",
  "icEnrollmentDate",
  "icTier",
  "icStatus",
  "icLapseReason",
  "icLapsedAt",
  "icCohortNumber",
  "pilotDiscountActive",
  "pilotDiscountLapsedAt",
  "trialStarted",
  "trialStartDate",
  "trialEndDate",
  "trialConverted",
  "trialConverter10PctYearEnd",
];

const LIVE_STATUSES = ["active", "trialing", "past_due", "incomplete"];

function log(msg) {
  console.log(msg);
}

function fetchStripeKey() {
  const out = execSync(
    "firebase functions:secrets:access STRIPE_SECRET_KEY --project your-dressage-journey",
    { stdio: ["ignore", "pipe", "pipe"] }
  ).toString();
  // The output may include warnings; the key is the line starting with sk_
  const key = out.split(/\r?\n/).find((l) => l.startsWith("sk_"));
  if (!key) throw new Error("Could not parse STRIPE_SECRET_KEY from firebase CLI output");
  return key.trim();
}

async function resolveUserForCustomer(db, stripe, customerId, subscription) {
  // 1) subscription.metadata.firebaseUID (most reliable)
  let uid = subscription?.metadata?.firebaseUID;
  if (uid) return uid;

  // 2) customer.metadata.firebaseUID
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.metadata?.firebaseUID) return customer.metadata.firebaseUID;
  } catch (err) {
    /* customer may have been deleted; fall through */
  }

  // 3) Firestore lookup by stripeCustomerId
  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;

  return null;
}

async function gatherTargetsFromUid(db, uid) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    log(`  [missing] /users/${uid} does not exist`);
    return [];
  }
  const data = snap.data() || {};
  return [
    {
      uid,
      stripeCustomerId: data.stripeCustomerId || null,
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      hadActiveIC: data.isInitialCenterline === true && data.icStatus === "active",
      tier: data.subscriptionTier || null,
      status: data.subscriptionStatus || null,
      isPilot: !!data.isPilot,
    },
  ];
}

async function gatherTargetsFromStripe(db, stripe) {
  const subs = await stripe.subscriptions.list({ status: "all", limit: 100 });
  const liveSubs = subs.data.filter((s) => LIVE_STATUSES.includes(s.status));
  log(`Found ${subs.data.length} total subs in Stripe; ${liveSubs.length} live (${LIVE_STATUSES.join("/")}).\n`);

  const targets = [];
  for (const sub of liveSubs) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    const uid = await resolveUserForCustomer(db, stripe, customerId, sub);
    let firestoreData = null;
    if (uid) {
      const snap = await db.collection("users").doc(uid).get();
      firestoreData = snap.exists ? snap.data() : null;
    }
    targets.push({
      uid,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subStatus: sub.status,
      subPriceLookup: sub.items?.data?.[0]?.price?.lookup_key || sub.items?.data?.[0]?.price?.id,
      hadActiveIC: firestoreData?.isInitialCenterline === true && firestoreData?.icStatus === "active",
      tier: firestoreData?.subscriptionTier || null,
      status: firestoreData?.subscriptionStatus || null,
      isPilot: !!firestoreData?.isPilot,
      cancelAccountEmail: typeof sub.customer === "object" ? sub.customer?.email : null,
    });
  }
  return targets;
}

async function processTarget(db, stripe, t) {
  const prefix = COMMIT ? "[COMMIT]" : "[dry-run]";
  log(`\n${prefix} target uid=${t.uid || "<unresolved>"}  customer=${t.stripeCustomerId || "<none>"}`);
  if (t.subPriceLookup) log(`         price=${t.subPriceLookup} status=${t.subStatus}`);
  if (t.tier) log(`         firestore tier=${t.tier} status=${t.status} isPilot=${t.isPilot} hadIC=${t.hadActiveIC}`);

  // 1. Cancel any subscription on this customer
  if (t.stripeCustomerId) {
    try {
      const subs = await stripe.subscriptions.list({ customer: t.stripeCustomerId, status: "all", limit: 50 });
      for (const sub of subs.data) {
        if (LIVE_STATUSES.includes(sub.status)) {
          if (COMMIT) {
            await stripe.subscriptions.cancel(sub.id);
            log(`         ✔ cancelled stripe sub ${sub.id} (was ${sub.status})`);
          } else {
            log(`         · would cancel stripe sub ${sub.id} (${sub.status})`);
          }
        }
      }
    } catch (err) {
      log(`         ✗ stripe sub list/cancel failed: ${err.message}`);
    }

    // 2. Delete the Stripe customer (test mode only — clean slate)
    try {
      if (COMMIT) {
        await stripe.customers.del(t.stripeCustomerId);
        log(`         ✔ deleted stripe customer ${t.stripeCustomerId}`);
      } else {
        log(`         · would delete stripe customer ${t.stripeCustomerId}`);
      }
    } catch (err) {
      log(`         ✗ stripe customer delete failed: ${err.message}`);
    }
  }

  // 3. Clear Firestore subscription-only fields
  if (t.uid) {
    const update = {};
    for (const f of FIELDS_TO_CLEAR) update[f] = admin.firestore.FieldValue.delete();
    if (COMMIT) {
      await db.collection("users").doc(t.uid).set(update, { merge: true });
      log(`         ✔ cleared ${FIELDS_TO_CLEAR.length} subscription fields on /users/${t.uid}`);
    } else {
      log(`         · would clear ${FIELDS_TO_CLEAR.length} subscription fields on /users/${t.uid}`);
    }

    // 4. Decrement cohort if user had active IC
    if (t.hadActiveIC) {
      if (COMMIT) {
        await db.runTransaction(async (tx) => {
          const ref = db.doc("admin/icCohort");
          const snap = await tx.get(ref);
          const cur = snap.data()?.enrollmentCount || 0;
          tx.update(ref, {
            enrollmentCount: Math.max(0, cur - 1),
            enrollmentClosedAt: null,
            updatedAt: new Date().toISOString(),
          });
        });
        log(`         ✔ decremented /admin/icCohort.enrollmentCount`);
      } else {
        log(`         · would decrement /admin/icCohort.enrollmentCount`);
      }
    }
  } else {
    log(`         ⚠ no Firestore uid resolved — Firestore reset skipped`);
  }
}

async function run() {
  log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}`);
  log(`Scope: ${TARGET_UID ? `single uid=${TARGET_UID}` : "all live Stripe subscriptions"}\n`);

  const stripeKey = fetchStripeKey();
  if (!stripeKey.startsWith("sk_test_")) {
    log(`⚠ STRIPE_SECRET_KEY does not look like a TEST key (got ${stripeKey.slice(0, 7)}...)`);
    log(`Refusing to run for safety. Aborting.`);
    process.exit(1);
  }
  const stripe = new Stripe(stripeKey);

  const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const targets = TARGET_UID
    ? await gatherTargetsFromUid(db, TARGET_UID)
    : await gatherTargetsFromStripe(db, stripe);

  if (!targets.length) {
    log("No targets to process.");
    return;
  }

  for (const t of targets) {
    await processTarget(db, stripe, t);
  }

  log(`\nDone. ${COMMIT ? "All actions committed." : "Re-run with --commit to apply."}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
