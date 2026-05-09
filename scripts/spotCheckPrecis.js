/**
 * One-shot: force-refresh Multi-Voice Coaching for one or more riders looked
 * up by fullName substring, then print the resulting Multi-Voice précis from
 * analysisCache for spot-check review.
 *
 * Used to validate Phase 1 of the Habit Loop work — the new ≤200-word précis
 * generated alongside the four voice analyses. Per
 * YDJ_MultiVoicePrecis_Spec.md, manual sampling against five quality
 * benchmarks (faithfulness, compression, voice neutrality, hedging
 * preservation, word count) is the gate before Phase 2 ships.
 *
 * Usage:
 *   node scripts/spotCheckPrecis.js Prorak Hamilton Klarner
 *
 * Each argument is matched as a case-insensitive substring against
 * riderProfiles.fullName.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");
const sa = JSON.parse(readFileSync(keyPath, "utf-8"));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

const PROJECT_ID = sa.project_id;
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/getMultiVoiceCoaching`;

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY
  || readFileSync(resolve(__dirname, "../.env"), "utf-8").match(/VITE_FIREBASE_API_KEY=(\S+)/)?.[1];
if (!FIREBASE_API_KEY) {
  console.error("Missing VITE_FIREBASE_API_KEY in env or .env file");
  process.exit(1);
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Usage: node scripts/spotCheckPrecis.js <name1> [<name2> ...]");
  process.exit(1);
}

async function findUserByName(nameFragment) {
  const lower = nameFragment.toLowerCase();
  const snap = await db
    .collection("riderProfiles")
    .where("isDeleted", "==", false)
    .get();
  const matches = [];
  snap.forEach((doc) => {
    const data = doc.data();
    const name = (data.fullName || "").toLowerCase();
    if (name.includes(lower)) {
      matches.push({ uid: data.userId, fullName: data.fullName, profileId: doc.id });
    }
  });
  return matches;
}

async function getIdToken(uid) {
  const customToken = await getAuth().createCustomToken(uid);
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const json = await exchangeRes.json();
  if (!json.idToken) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json.idToken;
}

async function forceRefreshMVC(uid, idToken) {
  const t0 = Date.now();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: { forceRefresh: true } }),
  });
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, elapsedSec, parsed };
}

async function readPrecis(uid) {
  const snap = await db.collection("analysisCache").doc(`${uid}_coaching_precis`).get();
  if (!snap.exists) return null;
  return snap.data();
}

function wordCount(s) {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

async function processRider(nameFragment) {
  console.log("\n" + "=".repeat(72));
  console.log(`[lookup] "${nameFragment}"`);
  console.log("=".repeat(72));

  const matches = await findUserByName(nameFragment);
  if (matches.length === 0) {
    console.log(`  ✗ no riderProfiles match "${nameFragment}"`);
    return { name: nameFragment, status: "not_found" };
  }
  if (matches.length > 1) {
    console.log(`  ⚠ ${matches.length} matches — using all of them:`);
    matches.forEach((m) => console.log(`     - ${m.fullName} (${m.uid})`));
  }

  const results = [];
  for (const m of matches) {
    console.log(`\n  → ${m.fullName} (uid=${m.uid})`);
    try {
      const idToken = await getIdToken(m.uid);
      console.log(`    [auth] minted ID token`);
      console.log(`    [trigger] forceRefresh getMultiVoiceCoaching … (this can take 60-120s)`);
      const { status, elapsedSec, parsed } = await forceRefreshMVC(m.uid, idToken);
      console.log(`    [trigger] HTTP ${status} in ${elapsedSec}s`);

      if (status !== 200 || !parsed?.result?.success) {
        console.log(`    ✗ generation did not return success`);
        if (parsed?.error) console.log(`      error: ${JSON.stringify(parsed.error)}`);
        results.push({ name: m.fullName, uid: m.uid, status: "regen_failed" });
        continue;
      }

      console.log(`    ✓ MVC regenerated (generatedAt=${parsed.result.generatedAt})`);

      // Read the précis cache row
      const precisDoc = await readPrecis(m.uid);
      if (!precisDoc) {
        console.log(`    ✗ no precis cache row at analysisCache/${m.uid}_coaching_precis`);
        results.push({ name: m.fullName, uid: m.uid, status: "no_precis" });
        continue;
      }
      const precisText = precisDoc.result?.precis;
      if (!precisText) {
        console.log(`    ✗ precis cache row exists but result.precis is empty`);
        results.push({ name: m.fullName, uid: m.uid, status: "empty_precis" });
        continue;
      }

      const wc = wordCount(precisText);
      const wcLabel = wc <= 200 ? `${wc} words ✓` : `${wc} words ✗ OVER 200-WORD CAP`;
      console.log(`    ✓ precis cached (${wcLabel}, generatedAt=${precisDoc.generatedAt})`);
      console.log("\n" + "-".repeat(72));
      console.log(precisText);
      console.log("-".repeat(72));

      results.push({
        name: m.fullName,
        uid: m.uid,
        status: "ok",
        wordCount: wc,
        precis: precisText,
        generatedAt: precisDoc.generatedAt,
      });
    } catch (err) {
      console.error(`    ✗ exception: ${err.message}`);
      results.push({ name: m.fullName, uid: m.uid, status: "exception", error: err.message });
    }
  }

  return results;
}

async function main() {
  const allResults = [];
  for (const name of targets) {
    const result = await processRider(name);
    if (Array.isArray(result)) allResults.push(...result);
    else allResults.push(result);
  }

  console.log("\n" + "=".repeat(72));
  console.log("SUMMARY");
  console.log("=".repeat(72));
  for (const r of allResults) {
    const tag = r.status === "ok" ? "✓" : "✗";
    const detail = r.status === "ok"
      ? `${r.wordCount} words, ${r.generatedAt}`
      : r.status;
    console.log(`  ${tag} ${r.name || "(no match)"}: ${detail}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
