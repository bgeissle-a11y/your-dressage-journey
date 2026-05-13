/**
 * Flip a test user's subscription tier in Firestore — no Stripe involvement.
 *
 * Purpose: exercise capability gates introduced in the Token Budget + Tier
 * Gating brief without round-tripping through Checkout. Mutates only the
 * subscription fields on /users/{uid} — profiles, debriefs, reflections etc
 * are left alone. Pair with `scripts/resetTestUser.cjs --uid <uid> --commit`
 * if you want to clear the Stripe customer too.
 *
 * Usage:
 *   node scripts/setTestUserTier.cjs --uid <uid> --tier <tier>     # dry-run
 *   node scripts/setTestUserTier.cjs --uid <uid> --tier <tier> --commit
 *   node scripts/setTestUserTier.cjs --uid <uid> --show            # print state only
 *
 * Tiers (the --tier value):
 *   pilot       isPilot=true, tier=none      — reads as PILOT through 2026-05-15
 *                                              then auto-rolls to PILOT_GRACE
 *                                              (no migration needed).
 *   working     tier=working,  status=active — can generate Coaching / Journey
 *                                              Map / Data Viz; NOT GPT, Physical,
 *                                              Show Planner, Viz Script.
 *   medium      tier=medium,   status=active — unlocks GPT/Physical/Show
 *                                              Planner/Viz Script.
 *   extended    tier=extended, status=active — adds mid-cycle regenerate*.
 *   past-due    tier=medium,   status=past_due — views only.
 *   canceled    tier=medium,   status=canceled — fully blocked.
 *   none        clears all subscription fields entirely.
 *
 * Pilot-grace / pilot-expired are date-driven (entitlements.js boundaries:
 * 2026-05-15 and 2026-07-07). You cannot force them onto a pilot user via
 * Firestore alone before those dates — they're computed at access time.
 * If you need to test those states sooner, temporarily edit PILOT_END_ISO
 * or PILOT_GRACE_END_ISO in both entitlements files and revert when done.
 */

const admin = require("firebase-admin");
const path = require("path");

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const SHOW_ONLY = args.includes("--show");
const uidIndex = args.indexOf("--uid");
const tierIndex = args.indexOf("--tier");
const UID = uidIndex >= 0 ? args[uidIndex + 1] : null;
const TIER_INPUT = tierIndex >= 0 ? args[tierIndex + 1] : null;

if (!UID) {
  console.error("Error: --uid <uid> is required.");
  console.error("Usage: node scripts/setTestUserTier.cjs --uid <uid> --tier <tier> [--commit]");
  process.exit(2);
}

if (!SHOW_ONLY && !TIER_INPUT) {
  console.error("Error: --tier <tier> is required (unless --show is passed).");
  console.error("Tiers: pilot | working | medium | extended | past-due | canceled | none");
  process.exit(2);
}

// Tier presets — values written into /users/{uid}.
// `undefined` in the value position means "delete this field"; explicit
// values overwrite. The Firestore merge below handles both forms.
const PRESETS = {
  pilot: {
    label: "Pilot (active until 2026-05-15)",
    fields: {
      isPilot: true,
      subscriptionTier: "none",
      subscriptionStatus: "none",
      subscriptionInterval: null,
    },
  },
  working: {
    label: "Working (active)",
    fields: {
      isPilot: false,
      subscriptionTier: "working",
      subscriptionStatus: "active",
      subscriptionInterval: "monthly",
    },
  },
  medium: {
    label: "Medium (active)",
    fields: {
      isPilot: false,
      subscriptionTier: "medium",
      subscriptionStatus: "active",
      subscriptionInterval: "monthly",
    },
  },
  extended: {
    label: "Extended (active)",
    fields: {
      isPilot: false,
      subscriptionTier: "extended",
      subscriptionStatus: "active",
      subscriptionInterval: "monthly",
    },
  },
  "past-due": {
    label: "Medium (past_due — views only)",
    fields: {
      isPilot: false,
      subscriptionTier: "medium",
      subscriptionStatus: "past_due",
      subscriptionInterval: "monthly",
    },
  },
  canceled: {
    label: "Medium (canceled — fully blocked)",
    fields: {
      isPilot: false,
      subscriptionTier: "medium",
      subscriptionStatus: "canceled",
      subscriptionInterval: "monthly",
    },
  },
  none: {
    label: "Cleared (no subscription, no pilot)",
    fields: {
      isPilot: false,
      subscriptionTier: "none",
      subscriptionStatus: "none",
      subscriptionInterval: null,
    },
  },
};

function loadEntitlements() {
  // Reuse the live entitlements module to compute the resulting status
  // exactly the way the Cloud Functions will.
  return require(path.join(__dirname, "..", "functions", "lib", "entitlements.js"));
}

function snapshotSubscription(data) {
  return {
    tier: data.subscriptionTier || "none",
    status: data.subscriptionStatus || "none",
    isPilot: !!data.isPilot,
    interval: data.subscriptionInterval || null,
  };
}

function summarize(label, sub, ent) {
  const computed = ent.getTierStatus(sub);
  return [
    label,
    `  tier=${sub.tier}  status=${sub.status}  isPilot=${sub.isPilot}  interval=${sub.interval || "—"}`,
    `  computed entitlements status = ${computed}`,
  ].join("\n");
}

async function run() {
  const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const userRef = db.collection("users").doc(UID);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    console.error(`No user found at /users/${UID}.`);
    process.exit(1);
  }

  const ent = loadEntitlements();
  const before = userSnap.data() || {};
  const beforeSub = snapshotSubscription(before);

  console.log(summarize(`Current state (/users/${UID}):`, beforeSub, ent));

  if (SHOW_ONLY) {
    return;
  }

  const preset = PRESETS[TIER_INPUT];
  if (!preset) {
    console.error(`\nUnknown --tier "${TIER_INPUT}". Choose: ${Object.keys(PRESETS).join(" | ")}`);
    process.exit(2);
  }

  const afterSub = snapshotSubscription({
    subscriptionTier: preset.fields.subscriptionTier,
    subscriptionStatus: preset.fields.subscriptionStatus,
    isPilot: preset.fields.isPilot,
    subscriptionInterval: preset.fields.subscriptionInterval,
  });

  console.log("");
  console.log(summarize(`Target state — ${preset.label}:`, afterSub, ent));

  if (!COMMIT) {
    console.log("\n[dry-run] Re-run with --commit to apply this change.");
    return;
  }

  const update = {};
  for (const [k, v] of Object.entries(preset.fields)) {
    update[k] = v === null
      ? admin.firestore.FieldValue.delete()
      : v;
  }

  await userRef.set(update, { merge: true });
  console.log(`\n✔ Wrote subscription fields to /users/${UID}.`);
  console.log("  Reload the app (or sign out/in) to pick up the change in useSubscription.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
