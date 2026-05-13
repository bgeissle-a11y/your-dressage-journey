/**
 * One-shot cleanup of test-mode Stripe contamination in production Firestore,
 * pre-launch. Sourced from the May 12 audit (scripts/auditStripeUsers.cjs).
 *
 *   node scripts/cleanupStripeContamination.cjs           # dry-run, prints plan
 *   node scripts/cleanupStripeContamination.cjs --commit  # applies the changes
 *
 * What it does:
 *   1. brewfarm@hotmail.com  → test IC user, clear all Stripe + IC fields.
 *   2. barb@yourdressagejourney.com → test account, clear sub fields.
 *   3. bgeissle@gmail.com    → add `isFounder: true`; clear canceled-sub remnants.
 *   4. /admin/icCohort       → reset enrollmentCount to 0.
 *
 * After running, re-run scripts/auditStripeUsers.cjs to confirm a clean slate.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const COMMIT = process.argv.includes("--commit");

const USER_PLAN = [
  {
    label: "brewfarm@hotmail.com — test IC user; clear all Stripe + IC state",
    uid: "h9tNpc0PTCRzQdBxViXCQphpP1B3",
    deletes: [
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
    ],
    sets: {},
  },
  {
    label:
      "barb@yourdressagejourney.com — test account; clear subscription fields",
    uid: "REW2H4Q9MGW3Qbs1WiJOmyPo7Yx2",
    deletes: ["subscriptionTier", "subscriptionStatus", "subscriptionInterval"],
    sets: {},
  },
  {
    label:
      "bgeissle@gmail.com — founder; set isFounder=true, clear canceled-sub remnants",
    uid: "HwwKk5C7qZh1Bn0KYalPYIZWHmj2",
    deletes: ["subscriptionStatus", "currentPeriodEnd"],
    sets: { isFounder: true },
  },
];

async function run() {
  console.log(
    `\nMode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}\n`
  );

  for (const item of USER_PLAN) {
    console.log(`--- ${item.label}`);
    console.log(`    uid: ${item.uid}`);
    if (item.deletes.length) {
      console.log(`    delete fields: ${item.deletes.join(", ")}`);
    }
    for (const [f, v] of Object.entries(item.sets)) {
      console.log(`    set: ${f} = ${JSON.stringify(v)}`);
    }

    if (COMMIT) {
      const ref = db.collection("users").doc(item.uid);
      const snap = await ref.get();
      if (!snap.exists) {
        console.log(`    ⚠ user doc not found — skipping`);
        console.log("");
        continue;
      }
      const payload = { ...item.sets };
      for (const f of item.deletes) {
        payload[f] = admin.firestore.FieldValue.delete();
      }
      await ref.update(payload);
      console.log(`    ✔ applied`);
    }
    console.log("");
  }

  console.log("--- /admin/icCohort — reset enrollmentCount to 0");
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
    "Verification: run `node scripts/auditStripeUsers.cjs` and confirm contamination is gone.\n"
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });
