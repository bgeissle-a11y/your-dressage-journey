/**
 * One-Time Migration: Backfill processGoal1/2/3 and prevGoalRatings on debriefs
 *
 * Debriefs were saved with confirmedGoalsSnapshot and goalRatings but the
 * dashboard's ProcessGoalBars component reads processGoal1/2/3 and
 * prevGoalRatings. This script adds the missing fields to existing documents.
 *
 * Only touches documents that have confirmedGoalsSnapshot but are missing
 * processGoal1. Documents already containing processGoal1 are skipped.
 *
 * Setup:
 *   Requires scripts/serviceAccountKey.json (Firebase Admin credentials)
 *
 * Usage:
 *   node scripts/migrateDebriefGoalFields.js          # dry run (default)
 *   node scripts/migrateDebriefGoalFields.js --commit  # actually write data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const isDryRun = !process.argv.includes('--commit');

/**
 * Build the fields that ProcessGoalBars expects from the form's stored data.
 */
function buildGoalFields(data) {
  const snapshot = data.confirmedGoalsSnapshot || {};
  const ratings = data.goalRatings || {};

  const processGoal1 = snapshot.goal1 || '';
  const processGoal2 = snapshot.goal2 || '';
  const processGoal3 = snapshot.goal3 || '';

  let prevGoalRatings = null;
  if (ratings.goal1 || ratings.goal2 || ratings.goal3) {
    prevGoalRatings = {
      goal1: ratings.goal1 ? { text: snapshot.goal1 || '', rating: ratings.goal1 } : null,
      goal2: ratings.goal2 ? { text: snapshot.goal2 || '', rating: ratings.goal2 } : null,
      goal3: ratings.goal3 ? { text: snapshot.goal3 || '', rating: ratings.goal3 } : null,
      reflection: ratings.reflection || null,
    };
  }

  return { processGoal1, processGoal2, processGoal3, prevGoalRatings };
}

async function migrate() {
  console.log(`\n=== Debrief Goal Fields Migration ${isDryRun ? '(DRY RUN)' : '(COMMIT MODE)'} ===\n`);

  const snapshot = await db.collection('debriefs').get();
  console.log(`Found ${snapshot.size} debrief document(s)\n`);

  if (snapshot.empty) {
    console.log('Nothing to migrate.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let noGoals = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const label = `[${doc.id}] ${data.rideDate || 'no-date'} horse="${data.horseName || '?'}" (user: ${data.userId})`;

    // Skip if already has processGoal1 with a real value
    if (data.processGoal1) {
      console.log(`  SKIP (already migrated): ${label}`);
      skipped++;
      continue;
    }

    // Skip if no confirmedGoalsSnapshot to migrate from
    if (!data.confirmedGoalsSnapshot) {
      console.log(`  SKIP (no goals data):    ${label}`);
      noGoals++;
      continue;
    }

    const fields = buildGoalFields(data);

    console.log(`  UPDATE: ${label}`);
    console.log(`    → processGoal1: "${fields.processGoal1}"`);
    if (fields.processGoal2) console.log(`    → processGoal2: "${fields.processGoal2}"`);
    if (fields.processGoal3) console.log(`    → processGoal3: "${fields.processGoal3}"`);
    console.log(`    → prevGoalRatings: ${fields.prevGoalRatings ? 'yes' : 'null'}`);

    if (!isDryRun) {
      await doc.ref.update(fields);
      console.log(`    ✓ Updated`);
    }

    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Updated:          ${updated}`);
  console.log(`  Already migrated: ${skipped}`);
  console.log(`  No goals data:    ${noGoals}`);
  console.log(`  Total:            ${snapshot.size}`);

  if (isDryRun) {
    console.log(`\nThis was a dry run. Run with --commit to write data.`);
  } else {
    console.log(`\nMigration complete.`);
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
