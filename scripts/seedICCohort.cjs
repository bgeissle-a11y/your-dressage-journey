/**
 * One-time seed script: initializes the /admin/icCohort counter document.
 *
 * The IC cohort counter must exist before the Pricing page can render the
 * live spots-remaining badge and before the customer.subscription.created
 * webhook can atomically claim spots.
 *
 * Idempotent — running again will not overwrite enrollmentCount.
 *
 * Usage:
 *   cd scripts
 *   node seedICCohort.cjs                # writes to whichever project the
 *                                          service account key targets
 *
 * Requires scripts/serviceAccountKey.json (already in this folder).
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const IC_COHORT_DOC_PATH = "admin/icCohort";
const IC_COHORT_CAP = 100;
const IC_WINDOW_OPEN_ISO = new Date().toISOString();
const IC_WINDOW_CLOSE_ISO = "2026-07-08T00:00:00.000Z";

async function seed() {
  const ref = db.doc(IC_COHORT_DOC_PATH);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data();
    console.log("IC cohort doc already exists — leaving in place:");
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const seedDoc = {
    enrollmentCount: 0,
    enrollmentCap: IC_COHORT_CAP,
    enrollmentClosedAt: null,
    windowOpenDate: IC_WINDOW_OPEN_ISO,
    windowCloseDate: IC_WINDOW_CLOSE_ISO,
    seededAt: IC_WINDOW_OPEN_ISO,
  };

  await ref.set(seedDoc);
  console.log("Seeded /admin/icCohort:");
  console.log(JSON.stringify(seedDoc, null, 2));
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
