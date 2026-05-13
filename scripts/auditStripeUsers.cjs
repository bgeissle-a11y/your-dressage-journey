/**
 * READ-ONLY audit: dumps every user in production Firestore that has any
 * Stripe/IC/pilot state populated, so we can spot test-mode contamination
 * before going live.
 *
 *   node scripts/auditStripeUsers.cjs
 *
 * No writes. Safe to run any time.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const auth = admin.auth();

const STRIPE_FIELDS = [
  "stripeCustomerId",
  "stripeSubscriptionId",
  "subscriptionTier",
  "subscriptionStatus",
  "subscriptionInterval",
  "isInitialCenterline",
  "icTier",
  "icStatus",
  "icCohortNumber",
  "icEnrollmentDate",
  "isPilot",
  "pilotDiscountActive",
  "pilotDiscountLapsedAt",
  "trialStarted",
  "trialConverted",
  "trialConverter10PctYearEnd",
  "tokenBudget",
  "tokensUsedThisPeriod",
  "currentPeriodStart",
  "currentPeriodEnd",
];

function isInteresting(data) {
  return !!(
    data.stripeCustomerId ||
    data.stripeSubscriptionId ||
    (data.subscriptionTier && data.subscriptionTier !== "none") ||
    data.isInitialCenterline === true ||
    data.isPilot === true ||
    data.trialStarted === true ||
    (data.subscriptionStatus && data.subscriptionStatus !== "none")
  );
}

function getStripeState(data) {
  const out = {};
  for (const f of STRIPE_FIELDS) {
    if (data[f] !== undefined) out[f] = data[f];
  }
  return out;
}

async function getEmail(uid) {
  try {
    const u = await auth.getUser(uid);
    return u.email || "(no email)";
  } catch (e) {
    return `(auth lookup failed: ${e.code || e.message})`;
  }
}

async function audit() {
  console.log("\n=== Stripe state audit — production Firestore ===\n");

  const snap = await db.collection("users").get();
  console.log(`Total user docs: ${snap.size}`);

  const interesting = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (isInteresting(data)) interesting.push({ uid: doc.id, data });
  });

  console.log(`Users with Stripe / IC / pilot state: ${interesting.length}`);
  console.log(`Clean users: ${snap.size - interesting.length}\n`);

  for (const { uid, data } of interesting) {
    const email = await getEmail(uid);
    console.log(`\n--- ${uid} ---`);
    console.log(`  email: ${email}`);
    const state = getStripeState(data);
    for (const [f, v] of Object.entries(state)) {
      console.log(`  ${f}: ${JSON.stringify(v)}`);
    }
  }

  console.log("\n\n=== /admin/icCohort ===");
  const cohort = await db.doc("admin/icCohort").get();
  console.log(JSON.stringify(cohort.data() || null, null, 2));

  console.log("\n=== Flags & suspected contamination ===\n");
  let flags = 0;
  for (const { uid, data } of interesting) {
    if (data.isInitialCenterline === true) {
      console.log(
        `  IC member: ${uid} (icTier=${data.icTier}, status=${data.icStatus}, cohort#=${data.icCohortNumber}, sub=${data.stripeSubscriptionId || "none"})`
      );
      flags++;
    }
    if (
      data.subscriptionStatus === "active" &&
      !data.isPilot &&
      !data.isInitialCenterline
    ) {
      console.log(
        `  Active non-pilot non-IC subscription: ${uid} (tier=${data.subscriptionTier}, interval=${data.subscriptionInterval})`
      );
      flags++;
    }
    if (data.trialStarted === true && !data.trialConverted) {
      console.log(`  Active or recent trial: ${uid}`);
      flags++;
    }
    if (
      data.stripeCustomerId &&
      !data.subscriptionStatus &&
      !data.isInitialCenterline &&
      !data.isPilot
    ) {
      console.log(
        `  Orphan customer (has stripeCustomerId, no sub state): ${uid}`
      );
      flags++;
    }
  }
  if (flags === 0) console.log("None flagged.");

  console.log("\n=== End audit ===\n");
}

audit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit failed:", err);
    process.exit(1);
  });
