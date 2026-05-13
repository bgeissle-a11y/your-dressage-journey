/**
 * One-shot: hard-delete the smoke-test documents created during the
 * Habit Loop pipeline validation. Targets only documents that carry the
 * explicit `_smokeTest: true` marker — production rider entries are
 * never touched.
 *
 * Usage:
 *   node scripts/cleanupSmokeTestDocs.js          # dry run (list only)
 *   node scripts/cleanupSmokeTestDocs.js --commit # actually delete
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

const COMMIT = process.argv.includes("--commit");
const COLLECTIONS = ["microDebriefs", "freshStarts"];

async function findSmokeTestDocs(collectionName) {
  const snap = await db
    .collection(collectionName)
    .where("_smokeTest", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT (will hard-delete)" : "dry run"}`);
  console.log("");

  const allFound = {};
  for (const col of COLLECTIONS) {
    allFound[col] = await findSmokeTestDocs(col);
    console.log(`${col}: ${allFound[col].length} smoke-test doc(s)`);
    for (const doc of allFound[col]) {
      const d = doc.data;
      const summary =
        col === "microDebriefs"
          ? `quality=${d.quality}, mentalState=${d.mentalState}, date=${d.date}`
          : `state=${d.state}, confidence=${d.confidence}`;
      console.log(`  - ${doc.id} (${summary})`);
    }
    console.log("");
  }

  const total = Object.values(allFound).reduce((n, arr) => n + arr.length, 0);
  if (total === 0) {
    console.log("Nothing to delete. Exiting.");
    return;
  }

  if (!COMMIT) {
    console.log(`Would delete ${total} doc(s). Re-run with --commit to apply.`);
    return;
  }

  console.log(`Deleting ${total} doc(s)…`);
  let deleted = 0;
  for (const col of COLLECTIONS) {
    for (const doc of allFound[col]) {
      await db.collection(col).doc(doc.id).delete();
      deleted += 1;
      console.log(`  ✓ deleted ${col}/${doc.id}`);
    }
  }
  console.log(`\nDone. ${deleted}/${total} doc(s) deleted.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
