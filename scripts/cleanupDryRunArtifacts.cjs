/**
 * One-shot cleanup of the 2026-05-12 live-mode dry-run artifacts.
 *
 *   node scripts/cleanupDryRunArtifacts.cjs           # dry-run, prints plan
 *   node scripts/cleanupDryRunArtifacts.cjs --commit  # applies
 *
 * What it does:
 *   1. barb@yourdressagejourney.com → clear all Stripe + IC state left
 *      behind by the dry-run subscription (was canceled + refunded already).
 *   2. /admin/icCohort → reset enrollmentCount back to 0 so real founder #1
 *      gets cohort slot 1.
 *
 * The Stripe customer cus_UVSQ3B3eKP4k2l stays in Stripe for audit history
 * (Refund + canceled subscription visible there). We're only cleaning the
 * Firestore-side state.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const COMMIT = process.argv.includes("--commit");

const BARB_TEST_UID = "REW2H4Q9MGW3Qbs1WiJOmyPo7Yx2";

const FIELDS_TO_DELETE = [
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
  "tokenBudget",
  "tokensUsedThisPeriod",
  "currentPeriodStart",
  "currentPeriodEnd",
];

async function run() {
  console.log(
    `\nMode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}\n`
  );

  // 1. Clear Barb's user doc
  console.log(
    "--- barb@yourdressagejourney.com — clear all Stripe + IC state from dry run"
  );
  console.log(`    uid: ${BARB_TEST_UID}`);
  console.log(`    delete fields: ${FIELDS_TO_DELETE.join(", ")}`);

  if (COMMIT) {
    const ref = db.collection("users").doc(BARB_TEST_UID);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log("    ⚠ user doc not found — skipping");
    } else {
      const payload = {};
      for (const f of FIELDS_TO_DELETE) {
        payload[f] = admin.firestore.FieldValue.delete();
      }
      await ref.update(payload);
      console.log("    ✔ applied");
    }
  }

  // 2. Reset cohort counter
  console.log("\n--- /admin/icCohort — reset enrollmentCount 1 → 0");
  console.log("    set: enrollmentCount = 0");
  console.log("    set: updatedAt = <now>");

  if (COMMIT) {
    await db.doc("admin/icCohort").set(
      {
        enrollmentCount: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("    ✔ applied");
  }

  console.log("\nDone.\n");
  console.log(
    "Verification: run `node scripts/auditStripeUsers.cjs` to confirm clean slate.\n"
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });
