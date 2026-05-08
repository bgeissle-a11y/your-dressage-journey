/**
 * Smoke test: exercise the chunked GPT L2 trajectory pipeline end-to-end.
 *
 * Calls the deployed getGrandPrixThinking function 3 times in sequence
 * (step 1 → 2 → 3), passing each step's output as priorResults to the next.
 * Reports per-step duration and verifies the final cache write.
 *
 * Usage: node scripts/testTrajectoryChunked.js <uid>
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Agent, setGlobalDispatcher } from "undici";

// Override Node's default 5-min undici headersTimeout. Cloud Functions hold
// the connection open while generating; with Opus calls hitting 5+ min for
// 12k-token outputs, the default kills our client before the server replies.
setGlobalDispatcher(new Agent({ headersTimeout: 10 * 60 * 1000, bodyTimeout: 10 * 60 * 1000 }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");
const sa = JSON.parse(readFileSync(keyPath, "utf-8"));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const uid = process.argv[2];
if (!uid) {
  console.log("Usage: node scripts/testTrajectoryChunked.js <uid>");
  process.exit(1);
}

const PROJECT_ID = sa.project_id;
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/getGrandPrixThinking`;
const FIREBASE_API_KEY = readFileSync(resolve(__dirname, "../.env"), "utf-8")
  .match(/VITE_FIREBASE_API_KEY=(\S+)/)?.[1];
if (!FIREBASE_API_KEY) { console.error("Missing VITE_FIREBASE_API_KEY"); process.exit(1); }

async function callStep(idToken, step, priorResults) {
  const t0 = Date.now();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: { layer: "trajectory", step, priorResults } }),
    // Node's default fetch headers timeout is 5 min; bump per-call.
    // @ts-ignore (undici extension)
    signal: AbortSignal.timeout(9 * 60 * 1000),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, elapsed, body: parsed };
}

async function main() {
  console.log(`[chunked-trajectory-test] uid=${uid}`);
  const customToken = await getAuth().createCustomToken(uid);
  const ex = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
  );
  const { idToken } = await ex.json();
  if (!idToken) { console.error("Token exchange failed"); process.exit(1); }

  const before = await db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get();
  console.log("before: trajectory cache generatedAt =", before.exists ? before.data().generatedAt : "<missing>");

  // ── Step 1 ──
  console.log("\n>>> Step 1 (Opus, ~2-3 min)");
  const s1 = await callStep(idToken, 1, undefined);
  console.log(`    HTTP ${s1.status} in ${s1.elapsed}s`);
  if (s1.status !== 200 || !s1.body?.result?.success) {
    console.error("step 1 failed:", JSON.stringify(s1.body, null, 2).slice(0, 1500));
    process.exit(1);
  }
  const r1 = s1.body.result;
  console.log("    keys:", Object.keys(r1).join(", "));

  // ── Step 2 ──
  console.log("\n>>> Step 2 (Opus + Sonnet parallel, ~3-4 min)");
  const s2 = await callStep(idToken, 2, { currentStateAnalysis: r1.currentStateAnalysis });
  console.log(`    HTTP ${s2.status} in ${s2.elapsed}s`);
  if (s2.status !== 200 || !s2.body?.result?.success) {
    console.error("step 2 failed:", JSON.stringify(s2.body, null, 2).slice(0, 1500));
    process.exit(1);
  }
  const r2 = s2.body.result;
  console.log("    keys:", Object.keys(r2).join(", "));
  if (r2.movementMapsError) console.log("    NOTE: movementMaps fell back (L2-3 failure)");

  // ── Step 3 ──
  console.log("\n>>> Step 3 (Sonnet, ~1-2 min)");
  const s3 = await callStep(idToken, 3, {
    currentStateAnalysis: r1.currentStateAnalysis,
    trajectoryPaths: r2.trajectoryPaths,
    movementMaps: r2.movementMaps,
    movementMapsError: r2.movementMapsError,
  });
  console.log(`    HTTP ${s3.status} in ${s3.elapsed}s`);
  if (s3.status !== 200 || !s3.body?.result?.success) {
    console.error("step 3 failed:", JSON.stringify(s3.body, null, 2).slice(0, 1500));
    process.exit(1);
  }
  const r3 = s3.body.result;
  console.log("    keys:", Object.keys(r3).join(", "));
  console.log("    activePath:", r3.activePath);

  // Verify final cache write
  const after = await db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get();
  console.log("\nafter: trajectory cache generatedAt =", after.exists ? after.data().generatedAt : "<missing>");

  const totalSec = ((parseFloat(s1.elapsed) + parseFloat(s2.elapsed) + parseFloat(s3.elapsed))).toFixed(1);
  console.log(`\nTotal pipeline: ${totalSec}s across 3 steps`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
