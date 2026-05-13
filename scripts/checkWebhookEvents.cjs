/**
 * READ-ONLY: dump the stripeWebhookEvents ledger to verify idempotency
 * is recording event deliveries correctly.
 *
 *   node scripts/checkWebhookEvents.cjs
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function run() {
  const snap = await db
    .collection("stripeWebhookEvents")
    .orderBy("receivedAt", "desc")
    .limit(20)
    .get();

  console.log(`\n=== Last ${snap.size} webhook events ===\n`);
  if (snap.empty) {
    console.log("(no events yet)");
    return;
  }
  snap.forEach((doc) => {
    const d = doc.data();
    console.log(`${doc.id}`);
    console.log(`  type: ${d.type}`);
    console.log(`  livemode: ${d.livemode}`);
    console.log(`  status: ${d.status}`);
    console.log(`  receivedAt: ${d.receivedAt?.toDate?.()?.toISOString() || d.receivedAt}`);
    if (d.processedAt) {
      console.log(`  processedAt: ${d.processedAt?.toDate?.()?.toISOString() || d.processedAt}`);
    }
    console.log("");
  });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
