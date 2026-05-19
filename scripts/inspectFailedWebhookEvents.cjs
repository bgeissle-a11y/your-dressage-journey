/**
 * READ-ONLY triage: list stripeWebhookEvents docs that never reached
 * status="completed" in the last 24h. These are the deliveries that the
 * handler picked up but failed mid-processing — the alert "YDJ Stripe
 * Webhook Failures" is almost always one of these.
 *
 * For each failed event, prints the Stripe event ID (paste into the
 * Stripe dashboard → Events to see the payload and Stripe's view of
 * the delivery attempts) and the type so you can correlate with the
 * specific handler branch in functions/api/stripe.js.
 *
 *   node scripts/inspectFailedWebhookEvents.cjs
 *   node scripts/inspectFailedWebhookEvents.cjs --hours 72
 *
 * No writes. Safe to run any time.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

function parseHours() {
  const idx = process.argv.indexOf("--hours");
  if (idx === -1) return 24;
  const n = Number(process.argv[idx + 1]);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`Invalid --hours value: ${process.argv[idx + 1]}`);
    process.exit(1);
  }
  return n;
}

function fmtTs(ts) {
  if (!ts) return "(none)";
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return String(ts);
}

async function run() {
  const hours = parseHours();
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - hours * 60 * 60 * 1000
  );

  const snap = await db
    .collection("stripeWebhookEvents")
    .where("receivedAt", ">=", cutoff)
    .orderBy("receivedAt", "desc")
    .get();

  const buckets = { completed: [], processing: [], other: [] };
  snap.forEach((doc) => {
    const d = doc.data();
    const status = d.status || "(missing)";
    const row = {
      id: doc.id,
      type: d.type || "(unknown)",
      livemode: d.livemode,
      status,
      receivedAt: fmtTs(d.receivedAt),
      processedAt: fmtTs(d.processedAt),
    };
    if (status === "completed") buckets.completed.push(row);
    else if (status === "processing") buckets.processing.push(row);
    else buckets.other.push(row);
  });

  console.log(
    `\n=== stripeWebhookEvents — last ${hours}h (${snap.size} total) ===`
  );
  console.log(`  completed:   ${buckets.completed.length}`);
  console.log(`  processing:  ${buckets.processing.length}  <-- failed mid-handler`);
  console.log(`  other:       ${buckets.other.length}\n`);

  if (buckets.processing.length === 0 && buckets.other.length === 0) {
    console.log("No failed deliveries in window. The alert may have fired");
    console.log("on a transient (timeout / cold-start crash) that never");
    console.log("created a ledger doc — check GCP logs for stripeWebhook");
    console.log("severity>=ERROR over the same window.\n");
    return;
  }

  if (buckets.processing.length > 0) {
    console.log("--- FAILED (status=processing) ---");
    for (const r of buckets.processing) {
      console.log(`${r.id}`);
      console.log(`  type:       ${r.type}`);
      console.log(`  livemode:   ${r.livemode}`);
      console.log(`  receivedAt: ${r.receivedAt}`);
      console.log("");
    }
  }

  if (buckets.other.length > 0) {
    console.log("--- UNEXPECTED STATUS ---");
    for (const r of buckets.other) {
      console.log(`${r.id}  status=${r.status}  type=${r.type}  at=${r.receivedAt}`);
    }
    console.log("");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
