/**
 * One-shot: trigger step 3 of the chunked trajectory pipeline.
 *
 * Reads the existing step1 + step2 intermediate caches and calls
 * getGrandPrixThinking({ layer: 'trajectory', step: 3 }) without
 * priorResults — the server falls back to the step caches.
 *
 * Used to verify the resume-from-cache path works.
 *
 * Usage: node scripts/testTrajectoryStep3.js <uid>
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// Step 3 is Sonnet ~1-2 min — comfortably under Node's default 5-min undici
// headers timeout, so no custom dispatcher needed.

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");
const sa = JSON.parse(readFileSync(keyPath, "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const uid = process.argv[2];
if (!uid) { console.log("Usage: node scripts/testTrajectoryStep3.js <uid>"); process.exit(1); }

const PROJECT_ID = sa.project_id;
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/getGrandPrixThinking`;
const FIREBASE_API_KEY = readFileSync(resolve(__dirname, "../.env"), "utf-8")
  .match(/VITE_FIREBASE_API_KEY=(\S+)/)?.[1];

async function main() {
  const customToken = await getAuth().createCustomToken(uid);
  const ex = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
  );
  const { idToken } = await ex.json();

  console.log(`[step3-test] Calling step 3 with priorResults={} (server reads step caches)`);
  const t0 = Date.now();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data: { layer: "trajectory", step: 3 } }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`HTTP ${res.status} in ${elapsed}s`);

  if (res.status === 200 && parsed.result?.success) {
    const r = parsed.result;
    console.log("activePath:", r.activePath);
    console.log("keys:", Object.keys(r).join(", "));

    const after = await db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get();
    console.log("trajectory cache generatedAt:", after.exists ? after.data().generatedAt : "<missing>");
  } else {
    console.error(JSON.stringify(parsed, null, 2).slice(0, 1500));
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
