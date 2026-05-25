/**
 * One-shot: trigger the Show Planner bi-weekly content callable
 * (`runShowPlannerBiweekly`) against the live Cloud Function.
 *
 * The callable is admin-gated (auth.token.admin), so we mint a custom
 * token with an `admin: true` developer claim and exchange it for an ID
 * token before POSTing. UID can be any string — pass an existing admin's
 * UID to avoid creating a phantom user in Firebase Auth.
 *
 * Usage:
 *   node scripts/triggerShowPlannerBiweekly.js <uid>
 *   node scripts/triggerShowPlannerBiweekly.js <uid> <planId1>[,<planId2>,...]
 *
 * The optional second arg narrows the fire to specific plan IDs (admin-only
 * validation knob; the scheduled cron always processes all qualifying plans).
 *
 * The callable returns the per-fire tally:
 *   { success, generated, skipped, error, planIds: [...], aborted? }
 *
 * With SHOW_PLANNER_BIWEEKLY_ENABLED=false the response is:
 *   { success: false, reason: "disabled-by-env" }
 *
 * With the new B10/B11 changes:
 *   - Same-day duplicates return outcome "skipped:duplicate"
 *   - Per-fire caps (500 plans / $50 estimated) set tally.aborted when hit
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");
const sa = JSON.parse(readFileSync(keyPath, "utf-8"));

initializeApp({ credential: cert(sa) });

const uid = process.argv[2];
if (!uid) {
  console.log("Usage: node scripts/triggerShowPlannerBiweekly.js <uid> [planId1,planId2,...]");
  process.exit(1);
}
const planIds = process.argv[3]
  ? process.argv[3].split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;
if (planIds) console.log("[trigger] planIds filter:", planIds);

const PROJECT_ID = sa.project_id;
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/runShowPlannerBiweekly`;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY
  || readFileSync(resolve(__dirname, "../.env"), "utf-8").match(/VITE_FIREBASE_API_KEY=(\S+)/)?.[1];
if (!FIREBASE_API_KEY) { console.error("Missing VITE_FIREBASE_API_KEY"); process.exit(1); }

async function main() {
  // 1. Mint custom token with admin claim baked in.
  const customToken = await getAuth().createCustomToken(uid, { admin: true });
  console.log("[trigger] Minted custom token for", uid, "with admin claim");

  // 2. Exchange for ID token via Identity Toolkit.
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exchangeJson = await exchangeRes.json();
  if (!exchangeJson.idToken) {
    console.error("[trigger] Failed to exchange custom token:", exchangeJson);
    process.exit(1);
  }
  console.log("[trigger] Exchanged for ID token");

  // 3. POST to the v2 onCall endpoint.
  console.log("[trigger] POST", FUNCTION_URL);
  const t0 = Date.now();
  const callRes = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${exchangeJson.idToken}`,
    },
    body: JSON.stringify({ data: planIds ? { planIds } : {} }),
  });
  const callText = await callRes.text();
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[trigger] Response in ${elapsedSec}s, status ${callRes.status}`);

  let parsed;
  try { parsed = JSON.parse(callText); } catch { parsed = callText; }

  if (callRes.status === 200 && parsed.result) {
    const r = parsed.result;
    console.log("[trigger] Result:");
    console.log("  success:    ", r.success);
    if (r.reason)   console.log("  reason:     ", r.reason);
    if (r.aborted)  console.log("  aborted:    ", r.aborted);
    console.log("  generated:  ", r.generated ?? 0);
    console.log("  skipped:    ", r.skipped   ?? 0);
    console.log("  error:      ", r.error     ?? 0);
    if (Array.isArray(r.planIds) && r.planIds.length) {
      console.log("  planIds (first 20):");
      for (const p of r.planIds.slice(0, 20)) {
        console.log(`    ${p.id}  →  ${p.outcome}`);
      }
      if (r.planIds.length > 20) {
        console.log(`    ...and ${r.planIds.length - 20} more`);
      }
    }
  } else {
    console.error("[trigger] Non-200 or unexpected response:");
    console.error(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
