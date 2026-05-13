/**
 * Lock down the Stripe Customer Portal so plan/tier changes go ONLY through
 * /pricing where our coupon logic (IC, pilot monthly) is enforced.
 *
 *   node configureBillingPortal.cjs                       # dry-run (test key)
 *   node configureBillingPortal.cjs --commit              # commit (test key only)
 *   node configureBillingPortal.cjs --commit --allow-live # commit against live key
 *
 * The default Stripe-provided configuration enables `subscription_update`,
 * which lets users self-serve plan switches in the portal — bypassing our
 * coupon swap logic and silently dropping IC / PILOT_MONTHLY_10 discounts.
 *
 * This script creates a new configuration that:
 *   - DISABLES subscription_update (no plan switches in portal)
 *   - keeps cancellation, payment method updates, invoice history, customer info
 *
 * Stripe doesn't allow `is_default` to be set via API, so we store the new
 * configuration's ID in Firestore at /admin/stripeConfig.billingPortalConfigId
 * and pass it explicitly when creating portal sessions.
 *
 * Live mode: portal configurations are scoped per Stripe account (test ≠ live).
 * When the production project swaps from the test key to the live key, this
 * script must be re-run with --allow-live so the live-mode portal is also
 * locked down. Without that flag, live keys abort by default to prevent
 * accidental production changes.
 */

const path = require("path");
const { execSync } = require("child_process");
const admin = require("firebase-admin");

const Stripe = require(path.join(__dirname, "..", "functions", "node_modules", "stripe"));

const COMMIT = process.argv.includes("--commit");
const ALLOW_LIVE = process.argv.includes("--allow-live");

const STRIPE_CONFIG_DOC = "admin/stripeConfig";
const APP_BASE_URL = "https://your-dressage-journey.web.app";

const FEATURES = {
  customer_update: {
    enabled: true,
    allowed_updates: ["email", "address", "phone", "tax_id"],
  },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_update: { enabled: false }, // ← the whole point
  subscription_cancel: {
    enabled: true,
    mode: "at_period_end",
    cancellation_reason: {
      enabled: true,
      options: [
        "too_expensive",
        "missing_features",
        "switched_service",
        "unused",
        "other",
      ],
    },
  },
};

const BUSINESS_PROFILE = {
  headline: "Manage your Your Dressage Journey subscription",
};

function fetchStripeKey() {
  const out = execSync(
    "firebase functions:secrets:access STRIPE_SECRET_KEY --project your-dressage-journey",
    { stdio: ["ignore", "pipe", "pipe"] }
  ).toString();
  const key = out.split(/\r?\n/).find((l) => l.startsWith("sk_"));
  if (!key) throw new Error("Could not parse STRIPE_SECRET_KEY");
  return key.trim();
}

async function run() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}\n`);

  const key = fetchStripeKey();
  const isLiveKey = key.startsWith("sk_live_");
  const isTestKey = key.startsWith("sk_test_");

  if (!isLiveKey && !isTestKey) {
    console.log(
      `⚠ STRIPE_SECRET_KEY is neither a test nor live key (got ${key.slice(0, 7)}...). Aborting.`
    );
    process.exit(1);
  }

  if (isLiveKey && !ALLOW_LIVE) {
    console.log(
      `⚠ STRIPE_SECRET_KEY is a LIVE key (sk_live_...). Aborting by default.\n` +
        `   Re-run with --allow-live to apply the portal lockdown to the live\n` +
        `   Stripe account. This is required after the production key swap.`
    );
    process.exit(1);
  }

  if (isLiveKey && ALLOW_LIVE) {
    console.log("⚠ LIVE MODE — operating against the production Stripe account.\n");
  }

  const stripe = new Stripe(key);

  const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  // Read any previously-stored config ID
  const snap = await db.doc(STRIPE_CONFIG_DOC).get();
  const previousId = snap.exists ? snap.data()?.billingPortalConfigId : null;

  if (previousId) {
    try {
      const existing = await stripe.billingPortal.configurations.retrieve(previousId);
      console.log(`Existing stored config: ${existing.id}`);
      console.log(
        `  subscription_update.enabled = ${existing.features.subscription_update.enabled}`
      );
      if (existing.features.subscription_update.enabled === false) {
        console.log("✅ Stored config already locks out subscription_update. Nothing to do.");
        return;
      }
      console.log("Stored config still allows plan changes; will create a replacement.");
    } catch (err) {
      console.log(`Stored config ${previousId} no longer retrievable: ${err.message}`);
    }
    console.log();
  }

  console.log("Plan: create a new portal configuration with");
  console.log("  subscription_update.enabled = false  (plan changes via /pricing only)");
  console.log("  subscription_cancel = at_period_end (with reason capture)");
  console.log("  payment_method_update / invoice_history / customer_update enabled");
  console.log();

  if (!COMMIT) {
    console.log("Re-run with --commit to apply.");
    return;
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile: BUSINESS_PROFILE,
    features: FEATURES,
    default_return_url: `${APP_BASE_URL}/settings`,
  });
  console.log(`✔ Created Stripe billing portal configuration: ${created.id}`);

  await db.doc(STRIPE_CONFIG_DOC).set(
    {
      billingPortalConfigId: created.id,
      billingPortalConfigUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log(`✔ Stored ID at /${STRIPE_CONFIG_DOC}.billingPortalConfigId`);

  console.log(
    "\nFuture portal sessions will pick this up via createPortalSession()."
  );
  console.log(
    "Verify in dashboard: https://dashboard.stripe.com/test/settings/billing/portal"
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
