/**
 * One-shot Weekly Focus snapshot backfill.
 *
 * Loops every Firebase Auth user and calls the same
 * refreshWeeklyFocusSnapshotSection helper that the regen handlers now use,
 * for each of gpt / physical / coaching. Closes the window opened on
 * 2026-05-04 where users who regenerated between Monday's 5 AM cron and
 * the deploy were left with stale W19 snapshots.
 *
 * Idempotent: if a snapshot section is already current, the helper just
 * rewrites the same data with a new lastUpdated timestamp. Safe to re-run.
 *
 * Usage: node scripts/backfillWeeklyFocusSnapshots.js
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "serviceAccountKey.json");

// Initialize before requiring functions/lib so its singleton picks up creds
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
process.env.GCLOUD_PROJECT =
  process.env.GCLOUD_PROJECT || JSON.parse(readFileSync(keyPath, "utf-8")).project_id;

if (getApps().length === 0) {
  const sa = JSON.parse(readFileSync(keyPath, "utf-8"));
  initializeApp({ credential: cert(sa) });
}

// Lazy require so admin init above is in place before functions/lib loads
const { createRequire } = await import("module");
const require = createRequire(import.meta.url);
const { refreshWeeklyFocusSnapshotSection } = require(
  resolve(__dirname, "../functions/lib/weeklyFocusSnapshot.js")
);

async function main() {
  const auth = getAuth();
  const sections = ["gpt", "physical", "coaching"];

  let pageToken;
  let totalUsers = 0;
  const successByUser = {};
  const errorByUser = {};

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      totalUsers++;
      const uid = user.uid;
      const label = user.email || user.displayName || uid;
      successByUser[uid] = { label, sections: [] };

      for (const section of sections) {
        try {
          await refreshWeeklyFocusSnapshotSection(uid, section);
          successByUser[uid].sections.push(section);
        } catch (err) {
          errorByUser[uid] = errorByUser[uid] || { label, errors: [] };
          errorByUser[uid].errors.push(`${section}: ${err.message}`);
        }
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\n=== Backfill complete ===`);
  console.log(`Users processed: ${totalUsers}`);
  console.log(`Errors: ${Object.keys(errorByUser).length}`);

  if (Object.keys(errorByUser).length > 0) {
    console.log(`\nErrors per user:`);
    for (const [uid, info] of Object.entries(errorByUser)) {
      console.log(`  ${info.label} (${uid}):`);
      info.errors.forEach((e) => console.log(`    - ${e}`));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
