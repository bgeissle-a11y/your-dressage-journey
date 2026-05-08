/**
 * One-shot: trigger a Physical Guidance regeneration for a target user via
 * the live Cloud Function, using a custom token minted from Admin SDK.
 *
 * Used to recover a user whose regen attempt didn't take (e.g. they
 * navigated away mid-flight on a stale cache that was being treated as
 * fresh by the staleOk fast path).
 *
 * Usage: node scripts/triggerPhysicalRegen.js <uid>
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
  console.log("Usage: node scripts/triggerPhysicalRegen.js <uid>");
  process.exit(1);
}

const PROJECT_ID = sa.project_id;
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/getPhysicalGuidance`;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY
  || readFileSync(resolve(__dirname, "../.env"), "utf-8").match(/VITE_FIREBASE_API_KEY=(\S+)/)?.[1];
if (!FIREBASE_API_KEY) { console.error("Missing VITE_FIREBASE_API_KEY"); process.exit(1); }

async function main() {
  // 1. Mint a custom token for the target uid
  const customToken = await getAuth().createCustomToken(uid);
  console.log("[trigger] Minted custom token for", uid);

  // 2. Exchange the custom token for an ID token via Identity Toolkit
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

  // 3. Call the v2 onCall endpoint with forceRefresh: true
  console.log("[trigger] POST", FUNCTION_URL, "with forceRefresh:true (this can take 2-3 minutes)");
  const t0 = Date.now();
  const callRes = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${exchangeJson.idToken}`,
    },
    body: JSON.stringify({ data: { forceRefresh: true } }),
  });
  const callText = await callRes.text();
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[trigger] Response in ${elapsedSec}s, status ${callRes.status}`);

  let parsed;
  try { parsed = JSON.parse(callText); } catch { parsed = callText; }

  if (callRes.status === 200) {
    if (parsed.result?.success) {
      console.log("[trigger] SUCCESS — Physical Guidance regenerated");
      console.log("  generatedAt:", parsed.result.generatedAt);
      console.log("  cycleState:", JSON.stringify(parsed.result.cycleState, null, 2));
      console.log("  weeks:", parsed.result.weeks?.length || 0);
    } else {
      console.log("[trigger] Function returned but not success:");
      console.log(JSON.stringify(parsed, null, 2));
    }
  } else {
    console.error("[trigger] HTTP error:");
    console.error(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
