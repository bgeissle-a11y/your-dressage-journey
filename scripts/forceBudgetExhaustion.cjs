/**
 * Force a test user's monthly OR weekly budget bucket past the cap so the
 * graceful-exhaustion banner fires on the next Insights load.
 *
 * Mutates only `/usageBudgets/{uid}` — no Stripe, no /users doc, no profile.
 * Restore by passing `--reset` (or by deleting the doc in the Firebase console).
 *
 * Usage:
 *   # dry-run (prints what it would write)
 *   node scripts/forceBudgetExhaustion.cjs --uid <uid> --kind monthly
 *
 *   # commit
 *   node scripts/forceBudgetExhaustion.cjs --uid <uid> --kind monthly --commit
 *   node scripts/forceBudgetExhaustion.cjs --uid <uid> --kind weekly --commit
 *
 *   # restore (zero out cost accumulators so generation works again)
 *   node scripts/forceBudgetExhaustion.cjs --uid <uid> --reset --commit
 *
 *   # inspect current state without changing it
 *   node scripts/forceBudgetExhaustion.cjs --uid <uid> --show
 *
 * Notes
 * - Sets the relevant accumulator to 9,999,999 millicents (= $99.99) which
 *   exceeds every tier's cap (max is Extended at $80 monthly, $20 weekly).
 * - The week key matches the same UTC ISO week format that `claudeCall.js`
 *   uses for its bucket key, so the cap fires immediately on next API call.
 */

const admin = require("firebase-admin");
const path = require("path");

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const RESET = args.includes("--reset");
const SHOW = args.includes("--show");
const uidIdx = args.indexOf("--uid");
const kindIdx = args.indexOf("--kind");
const UID = uidIdx >= 0 ? args[uidIdx + 1] : null;
const KIND = kindIdx >= 0 ? args[kindIdx + 1] : null;

if (!UID) {
  console.error("Error: --uid <uid> is required.");
  process.exit(2);
}

if (!SHOW && !RESET && !["monthly", "weekly"].includes(KIND)) {
  console.error("Error: --kind must be one of: monthly | weekly  (or pass --reset or --show)");
  process.exit(2);
}

// Match claudeCall.js bucket keys. Both use UTC. Format matters — the budget
// check compares strings exactly, so e.g. "202605" vs "2026-05" silently
// treats the bucket as a different month and the cap won't fire.
function getMonthKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getWeekKey() {
  // ISO week: Mon=1..Sun=7. Algorithm from claudeCall's getWeekKey conventions
  // — UTC-anchored ISO 8601 week number.
  const d = new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const OVER_CAP_MILLICENTS = 9999999; // $99.99 — over every tier's monthly cap

async function run() {
  const sa = require(path.join(__dirname, "serviceAccountKey.json"));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  const ref = db.collection("usageBudgets").doc(UID);
  const snap = await ref.get();
  const before = snap.exists ? snap.data() : null;

  console.log(`Current /usageBudgets/${UID}:`);
  if (!before) console.log("  (doc does not exist)");
  else {
    console.log(`  month=${before.month}  monthCostMillicents=${before.monthCostMillicents || 0}`);
    console.log(`  week =${before.week}   weekCostMillicents =${before.weekCostMillicents  || 0}`);
    console.log(`  date =${before.date}   count=${before.count || 0}`);
  }

  if (SHOW) return;

  let payload;
  if (RESET) {
    payload = { monthCostMillicents: 0, weekCostMillicents: 0, count: 0 };
    console.log("\nReset payload:", payload);
  } else if (KIND === "monthly") {
    payload = {
      month: getMonthKey(),
      monthCostMillicents: OVER_CAP_MILLICENTS,
    };
    console.log(`\nWill force monthly cap exhausted (month=${payload.month}, cost=$99.99).`);
  } else {
    payload = {
      week: getWeekKey(),
      weekCostMillicents: OVER_CAP_MILLICENTS,
    };
    console.log(`\nWill force weekly cap exhausted (week=${payload.week}, cost=$99.99).`);
  }

  if (!COMMIT) {
    console.log("\n[dry-run] Re-run with --commit to write.");
    return;
  }

  await ref.set({ ...payload, uid: UID }, { merge: true });
  console.log(`\n✔ Wrote /usageBudgets/${UID}.`);
  console.log(RESET
    ? "  Banner should disappear on next Insights load."
    : "  Click 'Generate Fresh Insights' on Coaching to trigger the banner.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
