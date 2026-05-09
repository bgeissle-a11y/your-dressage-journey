/**
 * Smoke test for the micro-debrief and Fresh Start Empathetic Coach
 * Cloud Function triggers.
 *
 * Creates test documents for an established pilot rider, polls until each
 * document has its empatheticResponse field populated by the trigger,
 * prints the result, and soft-deletes the test docs.
 *
 * Each scenario exercises a different state branch:
 *   1. micro-debrief (established rider, neutral content) → sub-case D
 *   2. micro-debrief (established rider, contradictory content) → sub-case B
 *   3. Fresh Start State A (rider away from riding, low confidence)
 *   4. Fresh Start State B (rider riding without logging, rich content)
 *
 * Usage:
 *   node scripts/smokeTestEmpatheticTriggers.js [<lastNameSubstring>]
 *
 * Default rider: Prorak (Susan Prorak — has a fresh précis from earlier
 * spot-check).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");
const sa = JSON.parse(readFileSync(keyPath, "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const target = (process.argv[2] || "Prorak").toLowerCase();

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 60_000;

async function findUser(nameFragment) {
  const snap = await db
    .collection("riderProfiles")
    .where("isDeleted", "==", false)
    .get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const name = (data.fullName || "").toLowerCase();
    if (name.includes(nameFragment)) {
      return { uid: data.userId, fullName: data.fullName };
    }
  }
  return null;
}

async function findHorse(uid) {
  const snap = await db
    .collection("horseProfiles")
    .where("userId", "==", uid)
    .where("isDeleted", "==", false)
    .limit(1)
    .get();
  if (snap.empty) return { id: "test-horse", name: "Test Horse" };
  const d = snap.docs[0].data();
  return { id: snap.docs[0].id, name: d.horseName || "Test Horse" };
}

async function waitForResponse(collectionName, docId, label) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < POLL_MAX_MS) {
    attempt += 1;
    const snap = await db.collection(collectionName).doc(docId).get();
    if (snap.exists) {
      const data = snap.data();
      if (data.empatheticResponse) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        return { ok: true, data, elapsed, attempt };
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { ok: false, elapsed: (POLL_MAX_MS / 1000).toFixed(1), attempt };
}

function dashes() { return "-".repeat(72); }

async function runMicro(uid, horse, scenario, payload) {
  console.log(`\n${"=".repeat(72)}\n[micro] ${scenario}\n${"=".repeat(72)}`);
  const docRef = await db.collection("microDebriefs").add({
    userId: uid,
    isDeleted: false,
    submittedAt: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    horseId: horse.id,
    horseName: horse.name,
    voiceUsed: "empathetic",
    empatheticResponse: null,
    empatheticResponseGeneratedAt: null,
    ...payload,
    // Test marker so it's easy to find/delete later
    _smokeTest: true,
  });
  console.log(`  doc id: ${docRef.id}`);
  console.log(`  payload: quality=${payload.quality}, mentalState=${payload.mentalState}, momentText=${payload.momentText ? `"${payload.momentText}"` : "(empty)"}`);
  const result = await waitForResponse("microDebriefs", docRef.id, "micro");
  if (result.ok) {
    const r = result.data;
    console.log(`  ✓ response in ${result.elapsed}s (state=${r.riderState}, cacheBand=${r.cacheBandAtSubmission ?? "n/a"})`);
    if (r.empatheticResponseError) console.log(`  ⚠ fallback: ${r.empatheticResponseError}`);
    console.log(`\n${dashes()}\n${r.empatheticResponse}\n${dashes()}`);
  } else {
    console.log(`  ✗ no response after ${result.elapsed}s`);
  }
  // Soft-delete
  await docRef.update({ isDeleted: true, deletedAt: new Date().toISOString() });
  return result;
}

async function runFresh(uid, scenario, payload) {
  console.log(`\n${"=".repeat(72)}\n[fresh-start] ${scenario}\n${"=".repeat(72)}`);
  const docRef = await db.collection("freshStarts").add({
    userId: uid,
    isDeleted: false,
    submittedAt: new Date().toISOString(),
    empatheticResponse: null,
    empatheticResponseGeneratedAt: null,
    ...payload,
    _smokeTest: true,
  });
  console.log(`  doc id: ${docRef.id}`);
  console.log(`  state=${payload.state}, confidence=${payload.confidence}`);
  const result = await waitForResponse("freshStarts", docRef.id, "freshStart");
  if (result.ok) {
    const r = result.data;
    console.log(`  ✓ response in ${result.elapsed}s (cacheBand=${r.cacheBandAtSubmission ?? "n/a"})`);
    if (r.empatheticResponseError) console.log(`  ⚠ fallback: ${r.empatheticResponseError}`);
    console.log(`\n${dashes()}\n${r.empatheticResponse}\n${dashes()}`);
  } else {
    console.log(`  ✗ no response after ${result.elapsed}s`);
  }
  await docRef.update({ isDeleted: true, deletedAt: new Date().toISOString() });
  return result;
}

async function main() {
  const user = await findUser(target);
  if (!user) {
    console.error(`No rider matched "${target}"`);
    process.exit(1);
  }
  console.log(`Smoke-testing as ${user.fullName} (uid=${user.uid})`);
  const horse = await findHorse(user.uid);
  console.log(`Horse: ${horse.name} (id=${horse.id})`);

  const results = [];

  // Scenario 1: neutral micro (sub-case D)
  results.push({
    name: "micro: neutral (sub-case D)",
    res: await runMicro(user.uid, horse, "neutral / unremarkable", {
      quality: 6,
      mentalState: "calm",
      momentText: "",
    }),
  });

  // Scenario 2: contradictory micro (sub-case B) — low quality, frustrated
  results.push({
    name: "micro: contradictory (sub-case B)",
    res: await runMicro(user.uid, horse, "low quality + frustrated", {
      quality: 3,
      mentalState: "frustrated",
      momentText: "He felt off and I couldn't get out of my own head.",
    }),
  });

  // Scenario 3: Fresh Start State A — rider away from riding, low confidence
  results.push({
    name: "fresh-start: State A, low confidence",
    res: await runFresh(user.uid, "State A / low confidence return", {
      state: "A",
      confidence: 3,
      confidenceExplanation: "",
      workingOn: "",
      goingWell: "",
      difficult: "",
      anythingElse: "",
    }),
  });

  // Scenario 4: Fresh Start State B — rider riding without logging
  results.push({
    name: "fresh-start: State B, rich content",
    res: await runFresh(user.uid, "State B / riding without logging", {
      state: "B",
      confidence: 6,
      confidenceExplanation: "",
      workingOn: "Working on collected canter and starting one-tempi changes.",
      goingWell: "Consistency in the canter departs is finally arriving.",
      difficult: "Right-side asymmetry is showing up again in the changes.",
      anythingElse: "",
    }),
  });

  console.log(`\n${"=".repeat(72)}\nSUMMARY\n${"=".repeat(72)}`);
  for (const r of results) {
    const tag = r.res.ok ? "✓" : "✗";
    console.log(`  ${tag} ${r.name} — ${r.res.elapsed}s`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
